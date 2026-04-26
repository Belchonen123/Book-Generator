import { NextResponse } from "next/server";

import { compileBookToDocx } from "@/lib/docx/compiler";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { CompileRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function downloadBasename(title: string | null | undefined): string {
  const raw = (title ?? "book").trim().slice(0, 80);
  const ascii = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const base = ascii.length > 0 ? ascii : "book";
  return `${base}.docx`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = CompileRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, trimSize } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    let docxBuffer: Buffer;
    try {
      docxBuffer = await compileBookToDocx(bookId, user.id, { trimSize });
    } catch (e) {
      logServerError("compile-book.compilation", e);
      const message = e instanceof Error ? e.message : "";
      if (message.includes("not found") || message.includes("access denied")) {
        return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
      }
      return apiJsonError(
        "We could not compile your manuscript.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    await trackEvent(user, "book_compiled", bookId);

    const filename = downloadBasename(book.title);
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logServerError("compile-book", err);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

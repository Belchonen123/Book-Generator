import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { isUuidString } from "@/lib/utils/is-uuid";
import { z } from "zod";

const Body = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
});

export const dynamic = "force-dynamic";

/**
 * Resets a chapter from `generating` to `pending` when the client believes the
 * job was abandoned (e.g. stream died without a status revert). Ownership RLS
 * enforces that only the book owner can run this.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
  }
  const { bookId, chapterId } = parsed.data;
  if (!isUuidString(bookId) || !isUuidString(chapterId)) {
    return apiJsonError("Invalid ids.", ApiErrorCode.VALIDATION_ERROR, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
  }

  const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
  if (denied) {
    return denied;
  }

  const { data: row, error: fetchError } = await supabase
    .from("chapters")
    .select("id, status")
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (fetchError) {
    logServerError("recover-stuck-chapter.fetch", fetchError);
    return apiJsonError("Could not load chapter.", ApiErrorCode.INTERNAL, 500);
  }
  if (!row) {
    return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
  }
  if (row.status !== "generating") {
    return Response.json({ ok: true, changed: false, status: row.status });
  }

  const { error: updateError } = await supabase
    .from("chapters")
    .update({ status: "pending" })
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .eq("status", "generating");

  if (updateError) {
    logServerError("recover-stuck-chapter.update", updateError, {
      severity: "critical",
    });
    return apiJsonError("Could not recover chapter.", ApiErrorCode.INTERNAL, 500);
  }

  return Response.json({ ok: true, changed: true, status: "pending" as const });
}

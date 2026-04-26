import { NextResponse } from "next/server";

import {
  compileBoxedSetToDocx,
  type SeriesCompileOptions,
} from "@/lib/series/compile-boxed-set";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { SeriesCompileRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
// Boxed sets can hit 500k+ words — give the DOCX packer room to breathe.
export const maxDuration = 300;

function downloadBasename(title: string | null | undefined): string {
  const raw = (title ?? "boxed-set").trim().slice(0, 80);
  const ascii = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const base = ascii.length > 0 ? ascii : "boxed-set";
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

    // Series features are Pro-gated to match the rest of the series surface.
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile?.subscription_tier ?? "free") !== "pro") {
      return apiJsonError(
        "Boxed-set compilation is a Pro feature.",
        ApiErrorCode.UNAUTHORIZED,
        403,
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = SeriesCompileRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    // Verify series ownership before doing any work. RLS would reject the
    // downstream reads anyway, but we want a clean 404 + an audit line.
    const { data: series } = await supabase
      .from("series")
      .select("id, name")
      .eq("id", parsed.data.seriesId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!series) {
      return apiJsonError("Series not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const opts: SeriesCompileOptions = {
      seriesId: parsed.data.seriesId,
      trimSize: parsed.data.trimSize,
      includedBookIds: parsed.data.includedBookIds,
      frontMatter: parsed.data.frontMatter,
      backMatter: parsed.data.backMatter,
    };

    let result;
    try {
      result = await compileBoxedSetToDocx(user.id, opts);
    } catch (e) {
      logServerError("series.compile-boxed-set.compilation", e);
      const message = e instanceof Error ? e.message : "";
      if (message.includes("Select at least one")) {
        return apiJsonError(message, ApiErrorCode.VALIDATION_ERROR, 400);
      }
      if (message.includes("not found") || message.includes("access denied")) {
        return apiJsonError("Series not found.", ApiErrorCode.NOT_FOUND, 404);
      }
      return apiJsonError(
        "We could not compile the boxed set.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    await trackEvent(user, "series_boxed_set_compiled", null, {
      series_id: parsed.data.seriesId,
      book_count: result.includedBooks.length,
      total_chapters: result.includedBooks.reduce(
        (sum, b) => sum + b.chapters,
        0,
      ),
      trim_size: parsed.data.trimSize ?? null,
    });

    const boxedSetTitle =
      parsed.data.frontMatter?.boxedSetTitle?.trim() ||
      `The Complete ${series.name}`;
    const filename = downloadBasename(boxedSetTitle);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logServerError("series.compile-boxed-set", err);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

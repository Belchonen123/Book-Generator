import { NextResponse } from "next/server";
import { z } from "zod";

import { SLOP_SCAN_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { getOpenAI } from "@/lib/openai/client";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import {
  countSlopParagraphs,
  scanForSlop,
  type SlopMatch,
} from "@/lib/ai/slop-scan";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { SlopScanRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deepResponseSchema = z.object({
  items: z
    .array(
      z.object({
        text: z.string().max(2_000),
        reason: z.string().max(1_200),
        suggested_replacement: z.string().max(4_000),
      }),
    )
    .max(20),
});

function toSerializableMatches(matches: SlopMatch[]) {
  return matches.map((m) => ({
    pattern: m.pattern,
    category: m.category,
    order: m.order,
    replacementGuidance: m.replacementGuidance,
    replacementExample: m.replacementExample,
    matchedText: m.matchedText,
    startIndex: m.startIndex,
    endIndex: m.endIndex,
    paragraphIndex: m.paragraphIndex,
  }));
}

async function runDeepSlopScan(
  text: string,
  bookType: BookTypeDb,
): Promise<z.infer<typeof deepResponseSchema>["items"]> {
  const genreHint =
    bookType === "non_fiction" ? "non-fiction / self-help / business" : "fiction";
  const system = SLOP_SCAN_SYSTEM_PROMPT;

  const user = `Genre mode: ${genreHint}.\n\n## Chapter (may be long; scan the full excerpt)\n${sanitizeText(text).slice(0, 18_000)}`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 3_000,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  const wrapped = (() => {
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed !== null &&
      !("items" in (parsed as object)) &&
      Array.isArray(parsed)
    ) {
      return { items: parsed };
    }
    return parsed;
  })();
  const zod = deepResponseSchema.safeParse(wrapped);
  if (!zod.success) {
    logServerError("slop-scan.deep-zod", zod.error);
    return [];
  }
  return zod.data.items;
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

    const parsed = SlopScanRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId, text: textOverride, deep } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "slop-scan");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, book_type")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, book_id, content")
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const bookType: BookTypeDb = book.book_type ?? "fiction";
    const slopType = bookType === "non_fiction" ? "non_fiction" : "fiction";
    const bodyText =
      textOverride !== undefined ? textOverride : (chapter.content ?? "");
    const matches = scanForSlop(bodyText, slopType);
    const paragraphCounts = countSlopParagraphs(bodyText, matches);

    let deepMatches: z.infer<typeof deepResponseSchema>["items"] = [];
    if (deep) {
      try {
        deepMatches = await runDeepSlopScan(bodyText, bookType);
      } catch (e) {
        logServerError("slop-scan.deep", e);
        deepMatches = [];
      }
    }

    return NextResponse.json({
      matches: toSerializableMatches(matches),
      paragraphCounts,
      deepMatches,
      bookType,
    });
  } catch (e) {
    logServerError("slop-scan", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

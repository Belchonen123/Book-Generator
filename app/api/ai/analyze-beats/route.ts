import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

import { countParagraphsInChapterText } from "@/lib/beats/paragraphs";
import { narrativeBeatsArraySchema, type NarrativeBeat } from "@/lib/beats/schema";
import { anthropicMessagesCreateNonStreaming } from "@/lib/anthropic/message-attempts";
import { anthropicTextModelsToTry } from "@/lib/anthropic/text-model";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { AnalyzeBeatsRequestSchema } from "@/lib/utils/schemas";
import { ANALYZE_BEATS_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_CHAPTER_CHARS = 120_000;

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

function anthropicMessageText(m: Message): string {
  const parts: string[] = [];
  for (const block of m.content) {
    if (block.type === "text" && "text" in block && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("");
}

function hashChapterContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function validateBeatsAgainstParagraphs(
  beats: NarrativeBeat[],
  totalParagraphs: number,
):
  | { ok: true }
  | { ok: false; message: string } {
  if (totalParagraphs < 1) {
    return { ok: false, message: "Chapter has no paragraphs to analyze." };
  }
  for (const b of beats) {
    if (b.end_paragraph > totalParagraphs) {
      return { ok: false, message: "Beat map references paragraphs past the end of the chapter." };
    }
  }
  const sorted = [...beats].sort((a, c) => a.start_paragraph - c.start_paragraph);
  if (sorted[0]!.start_paragraph !== 1) {
    return { ok: false, message: "Beats must start at paragraph 1." };
  }
  if (sorted[sorted.length - 1]!.end_paragraph !== totalParagraphs) {
    return { ok: false, message: "Beats must end at the last paragraph." };
  }
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (cur.start_paragraph !== prev.end_paragraph + 1) {
        return { ok: false, message: "Beats are not contiguous." };
      }
    }
  }
  return { ok: true };
}

export type AnalyzeBeatsResponseBody = {
  cached: boolean;
  chapterId: string;
  contentHash: string;
  beats: NarrativeBeat[];
  model: string;
  analyzedAt: string;
  totalParagraphs: number;
};

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

    const parsed = AnalyzeBeatsRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "analyze-beats");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("analyze-beats.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "analyze-beats.profile-create",
          new Error(
            `${ensured.error}${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` | ${ensured.hint}` : ""}`,
          ),
        );
        return apiJsonError(
          `Could not initialize profile.${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` ${ensured.hint}` : ""}`,
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      profile = { subscription_tier: "free" };
    }

    if (profile.subscription_tier !== "pro") {
      return apiJsonError("Pacing map is a Pro feature.", ApiErrorCode.UPGRADE_REQUIRED, 403);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, book_type")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;
    if (bookType === "non_fiction") {
      return apiJsonError(
        "Pacing map is only available for fiction projects.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
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

    const rawContent = chapter.content?.trim() ?? "";
    if (!rawContent) {
      return apiJsonError("Add chapter text before analyzing beats.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const chapterText =
      rawContent.length > MAX_CHAPTER_CHARS
        ? rawContent.slice(0, MAX_CHAPTER_CHARS)
        : rawContent;

    const contentHash = hashChapterContent(chapterText);
    const totalParagraphs = countParagraphsInChapterText(chapterText);
    if (totalParagraphs < 1) {
      return apiJsonError(
        "Add at least one paragraph of chapter text (separate with blank lines).",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const { data: cached, error: cacheError } = await supabase
      .from("chapter_beats")
      .select("beats, model, analyzed_at, content_hash")
      .eq("chapter_id", chapterId)
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (cacheError) {
      logServerError("analyze-beats.cache-read", cacheError);
      return apiJsonError("Could not load pacing data.", ApiErrorCode.INTERNAL, 500);
    }

    if (cached?.beats) {
      const ar = typeof cached.beats === "string" ? JSON.parse(cached.beats) : cached.beats;
      const validated = narrativeBeatsArraySchema.safeParse(ar);
      if (validated.success) {
        const cont = validateBeatsAgainstParagraphs(validated.data, totalParagraphs);
        if (cont.ok) {
          const out: AnalyzeBeatsResponseBody = {
            cached: true,
            chapterId,
            contentHash,
            beats: validated.data,
            model: cached.model,
            analyzedAt: cached.analyzed_at,
            totalParagraphs,
          };
          return NextResponse.json(out);
        }
      }
    }

    const userMessage = `Chapter text (use blank-line paragraph breaks as defined in the system rules):\n\n${sanitizeText(chapterText)}`;

    const models = anthropicTextModelsToTry();
    let message: Message;
    let modelUsed: string;
    try {
      const result = await anthropicMessagesCreateNonStreaming(
        {
          systemPrompt: ANALYZE_BEATS_SYSTEM_PROMPT,
          max_tokens: 4000,
          temperature: 0.2,
          messages: [{ role: "user", content: userMessage }],
        },
        models,
      );
      message = result.message;
      modelUsed = result.modelUsed;
    } catch (e) {
      logServerError("analyze-beats.anthropic", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return apiJsonError(
          "AI is not configured. Set ANTHROPIC_API_KEY.",
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      return apiJsonError(
        "Could not analyze beats. Try again in a moment.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const rawText = anthropicMessageText(message);
    const withoutFence = stripJsonFence(rawText);
    let parsedArray: unknown;
    try {
      parsedArray = JSON.parse(withoutFence) as unknown;
    } catch {
      logServerError("analyze-beats.json-parse", new Error("invalid JSON from model"));
      return apiJsonError(
        "Could not read beat map. Try again.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const rawValidated = narrativeBeatsArraySchema.safeParse(parsedArray);
    if (!rawValidated.success) {
      logServerError("analyze-beats.zod-raw", rawValidated.error);
      return apiJsonError(
        "Could not validate beat map. Try again.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const contCheck = validateBeatsAgainstParagraphs(rawValidated.data, totalParagraphs);
    if (!contCheck.ok) {
      logServerError("analyze-beats.contiguity", new Error(contCheck.message));
      return apiJsonError(
        "The beat map did not match this chapter. Try again.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const analyzedAt = new Date().toISOString();

    const { error: insertError } = await supabase.from("chapter_beats").upsert(
      {
        chapter_id: chapterId,
        book_id: bookId,
        beats: rawValidated.data as unknown as Json,
        model: modelUsed,
        content_hash: contentHash,
        analyzed_at: analyzedAt,
      },
      { onConflict: "chapter_id,content_hash" },
    );

    if (insertError) {
      logServerError("analyze-beats.insert", insertError);
      return apiJsonError("Could not save pacing data.", ApiErrorCode.INTERNAL, 500);
    }

    await trackEvent(user, "beats_analyzed", bookId, {
      chapterId,
      cached: false,
      model: modelUsed,
    });

    const out: AnalyzeBeatsResponseBody = {
      cached: false,
      chapterId,
      contentHash,
      beats: rawValidated.data,
      model: modelUsed,
      analyzedAt,
      totalParagraphs,
    };
    return NextResponse.json(out);
  } catch (e) {
    logServerError("analyze-beats", e);
    return apiJsonError("Unexpected error.", ApiErrorCode.INTERNAL, 500);
  }
}

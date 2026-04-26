import { NextResponse } from "next/server";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

import { anthropicMessagesCreateNonStreaming } from "@/lib/anthropic/message-attempts";
import { anthropicTextModelsToTry } from "@/lib/anthropic/text-model";
import { buildCodexBlock } from "@/lib/ai/codex-context";
import { CHECK_CONSISTENCY_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { refinedIdeaToPlainSummary } from "@/lib/refined-idea/parse";
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
import { CheckConsistencyRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_CHAPTER_CHARS = 120_000;

const issueSchema = z.object({
  type: z.enum([
    "character_inconsistency",
    "timeline",
    "geography",
    "object_continuity",
    "other",
  ]),
  severity: z.enum(["minor", "moderate", "major"]),
  excerpt: z.string().max(80),
  problem: z.string().min(1).max(2_000),
  suggestion: z.string().max(2_000).nullish().optional(),
});

const consistencyResponseSchema = z.object({
  issues: z.array(issueSchema),
  summary: z.string().min(1).max(1_200),
});

export type ConsistencyIssue = z.infer<typeof issueSchema>;
export type ConsistencyCheckResult = z.infer<typeof consistencyResponseSchema>;

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

function formatCharacterBible(json: Json | null): string {
  if (json == null) return "No character bible recorded for this project.";
  try {
    return JSON.stringify(json, null, 2);
  } catch {
    return String(json);
  }
}

/**
 * System prompt: Claude must return only JSON (no markdown outside the object).
 * We still strip ```json fences in case the model adds them.
 */
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

    const parsed = CheckConsistencyRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "check-consistency");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("check-consistency.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "check-consistency.profile-create",
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
      return apiJsonError(
        "Consistency check is a Pro feature.",
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title, book_type, character_bible, genre, tone, refined_idea, series_id")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;
    if (bookType === "non_fiction") {
      return apiJsonError(
        "Continuity check is only available for fiction projects.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, book_id, title, chapter_number, content, outline_summary")
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: priorRows, error: priorError } = await supabase
      .from("chapters")
      .select("chapter_number, title, outline_summary")
      .eq("book_id", bookId)
      .lt("chapter_number", chapter.chapter_number)
      .order("chapter_number", { ascending: true });

    if (priorError) {
      logServerError("check-consistency.prior-chapters", priorError);
      return apiJsonError("Could not load prior chapters.", ApiErrorCode.INTERNAL, 500);
    }

    const priorOutlines = (priorRows ?? [])
      .map((row) => {
        const num = row.chapter_number;
        const t = sanitizeText(row.title?.trim() || `Chapter ${num}`);
        const o = row.outline_summary?.trim()
          ? sanitizeText(row.outline_summary.trim())
          : "(no outline summary)";
        return `Chapter ${num} — ${t}\n${o}`;
      })
      .join("\n\n---\n\n");

    const rawContent = chapter.content?.trim() ?? "";
    if (!rawContent) {
      return apiJsonError(
        "Add chapter text before running a consistency check.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const chapterText =
      rawContent.length > MAX_CHAPTER_CHARS
        ? rawContent.slice(0, MAX_CHAPTER_CHARS)
        : rawContent;
    const codexBlockResult = await buildCodexBlock(
      supabase,
      bookId,
      `${sanitizeText(chapter.title ?? "")}\n${sanitizeText(chapter.outline_summary ?? "")}\n${sanitizeText(chapterText)}`,
      { tokenBudget: 3000 },
    );
    const codexBlock = codexBlockResult.block;
    const worldbookSection = codexBlock
      ? `\n\n## Worldbook (codex entries — canonical facts, including descriptions)\n${codexBlock}`
      : "";

    const userBlock = `Book: ${sanitizeText(book.title?.trim() || "Untitled")}
Genre: ${book.genre ? sanitizeText(book.genre) : "unspecified"}
Tone: ${book.tone ? sanitizeText(book.tone) : "unspecified"}
Premise / refined idea (context):
${((): string => {
  const t = refinedIdeaToPlainSummary(
    book.refined_idea,
    "check-consistency.premise",
    8_000,
    { bookId: bookId },
  );
  return t ? sanitizeText(t) : "Not provided.";
})()}

## Character bible (JSON)
${formatCharacterBible(book.character_bible as Json)}
${worldbookSection}

## Prior chapter outlines (summaries only — not full text)
${priorOutlines || "None (this is the first chapter)."}

## Current chapter
Number: ${chapter.chapter_number}
Title: ${sanitizeText(chapter.title?.trim() || "Untitled")}
Outline / summary for this chapter:
${chapter.outline_summary?.trim() ? sanitizeText(chapter.outline_summary.trim()) : "Not provided."}

## Current chapter text (to analyze)
${sanitizeText(chapterText)}`;

    const models = anthropicTextModelsToTry();

    let message: Message;
    try {
      const result = await anthropicMessagesCreateNonStreaming(
        {
          systemPrompt: CHECK_CONSISTENCY_SYSTEM_PROMPT,
          max_tokens: 3000,
          temperature: 0.2,
          messages: [{ role: "user", content: userBlock }],
        },
        models,
      );
      message = result.message;
    } catch (e) {
      logServerError("check-consistency.anthropic", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ANTHROPIC_API_KEY")) {
        return apiJsonError(
          "AI is not configured. Set ANTHROPIC_API_KEY.",
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      return apiJsonError(
        "Could not run consistency check. Try again in a moment.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const rawText = anthropicMessageText(message);
    const withoutFence = stripJsonFence(rawText);
    let parsedOut: unknown;
    try {
      parsedOut = JSON.parse(withoutFence) as unknown;
    } catch {
      logServerError("check-consistency.json-parse", new Error("invalid JSON from model"));
      return apiJsonError(
        "Could not read the analysis result. Try again.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const validated = consistencyResponseSchema.safeParse(parsedOut);
    if (!validated.success) {
      logServerError("check-consistency.zod", validated.error);
      return apiJsonError(
        "Could not validate the analysis result. Try again.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const data = validated.data;
    const severityCounts = { minor: 0, moderate: 0, major: 0 };
    for (const iss of data.issues) {
      if (iss.severity === "minor") severityCounts.minor += 1;
      else if (iss.severity === "moderate") severityCounts.moderate += 1;
      else severityCounts.major += 1;
    }

    await trackEvent(user, "consistency_checked", bookId, {
      issueCount: data.issues.length,
      severityCounts,
    });

    return NextResponse.json(data);
  } catch (e) {
    logServerError("check-consistency", e);
    return apiJsonError("Unexpected error.", ApiErrorCode.INTERNAL, 500);
  }
}

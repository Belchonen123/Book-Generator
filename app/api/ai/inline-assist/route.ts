import { NextResponse } from "next/server";

import { buildInlineAssistPrompt } from "@/lib/ai/prompt-templates";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { buildStyleExamplesBlock } from "@/lib/openai/style-examples";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { sanitizeText } from "@/lib/utils/sanitize";
import { InlineAssistRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";

/**
 * Maximum prompt-side context the UI can send per axis. Mirrors the
 * defaults in the SlashCommands extension (500 before / 300 after) so
 * misconfigured clients can't slip wildly larger contexts through and blow
 * up the prompt budget — the schema enforces 2_000 / 1_500 hard upper
 * bounds but we tighten further here for gpt-4o-mini's context window.
 */
const MAX_CONTEXT_BEFORE_CHARS = 500;
const MAX_CONTEXT_AFTER_CHARS = 300;

function clampContext(
  contextBefore: string | undefined,
  contextAfter: string | undefined,
): { before: string; after: string } {
  const beforeRaw = contextBefore?.trim() ?? "";
  const afterRaw = contextAfter?.trim() ?? "";
  const before = beforeRaw
    ? sanitizeText(
        beforeRaw.length > MAX_CONTEXT_BEFORE_CHARS
          ? `…${beforeRaw.slice(-MAX_CONTEXT_BEFORE_CHARS)}`
          : beforeRaw,
      )
    : "";
  const after = afterRaw
    ? sanitizeText(
        afterRaw.length > MAX_CONTEXT_AFTER_CHARS
          ? `${afterRaw.slice(0, MAX_CONTEXT_AFTER_CHARS)}…`
          : afterRaw,
      )
    : "";
  return { before, after };
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

    const parsed = InlineAssistRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const body = parsed.data;
    const { bookId, chapterId } = body;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "inline-assist");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, title, genre, tone, style_examples, style_instructions")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("inline-assist.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "inline-assist.profile-create",
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

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, book_id, title, chapter_number")
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (
      profile.subscription_tier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      return apiJsonError(
        `Free plan includes AI assist for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro for chapters ${FREE_MAX_CHAPTERS_PER_BOOK + 1}+.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { before, after } = clampContext(body.contextBefore, body.contextAfter);
    const selectedText = sanitizeText(body.selectedText ?? "");

    const prompt = buildInlineAssistPrompt({
      action: body.action,
      chapterTitle: sanitizeText(chapter.title),
      bookTitle: sanitizeText(book.title),
      genre: book.genre,
      tone: book.tone,
      selectedText,
      contextBefore: before,
      contextAfter: after,
    });

    /* Inline slash commands replace small selections — a paragraph at a
     * time — but that output still needs to feel like the rest of the book.
     * Inject the project voice anchor so /rewrite, /expand, /beat, etc. all
     * stay in register. */
    const systemWithStyle = `${prompt.system}${buildStyleExamplesBlock({
      style_examples: book.style_examples,
      style_instructions: book.style_instructions,
    })}`;

    let text: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemWithStyle },
          { role: "user", content: prompt.user },
        ],
        temperature: prompt.temperature,
        max_tokens: prompt.maxTokens,
      });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "inline-assist.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    if (!text) {
      return apiJsonError(
        "The assistant returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
    }

    return NextResponse.json({ text, action: body.action });
  } catch (e) {
    logServerError("inline-assist", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

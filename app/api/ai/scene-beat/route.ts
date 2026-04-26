/**
 * POST /api/ai/scene-beat
 *
 * Novelcrafter-style scene-beat expansion. The chapter editor owns a
 * TipTap custom node (`components/book/chapter-editor/extensions/scene-beat.ts`)
 * that holds a short author-written beat — plain English with
 * [bracketed stage directions] — and streams ~200 / ~400 / ~700 words of
 * prose back into the node view.
 *
 * Shape-wise this is very close to `/api/ai/inline-command`:
 *   - auth → chapter/book ownership check → free-tier chapter cap
 *   - buildGenerationContext (full pack: codex + prior summaries + recent prose)
 *   - resolveSystemPromptFromTemplate (task_id='scene-beat')
 *   - raw `text/plain` chunked stream with no delimiter framing
 *
 * It differs in three places:
 *   1. `priorChapters: undefined` — we DO want prior-chapter summaries,
 *      unlike inline-command which suppresses them.
 *   2. `userInstruction` is the beat text itself (bracketed directives
 *      are passed through literally; the model is instructed to honor
 *      them and not echo them).
 *   3. `lengthHint` controls both the target word count advertised to
 *      the model and the `max_tokens` budget.
 */
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming";

import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
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
import {
  SCENE_BEAT_LENGTH_WORDS,
  SceneBeatRequestSchema,
  type SceneBeatLength,
} from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";

/** Hard cap after sanitize. Matches the Zod schema's 8k ceiling. */
const MAX_BEAT_CHARS = 8_000;

/**
 * Model token budget per length hint. OpenAI averages ~0.75 tokens/word
 * for English; we multiply by ~1.8× to leave headroom for punctuation +
 * occasional overrun so `long` (~700 words) never truncates.
 */
const LENGTH_MAX_TOKENS: Record<SceneBeatLength, number> = {
  short: 600,
  medium: 1_100,
  long: 1_800,
};

/**
 * Plain-English phrase we splice into the user prompt. Keeping the
 * wording stable lets authors customize their prompt template around a
 * known anchor (`approximately X words of prose`).
 */
function lengthPhrase(n: number): string {
  return `approximately ${n} words of prose`;
}

/** Build the user message. The system prompt carries everything else. */
function buildUserPrompt(args: {
  beatText: string;
  targetWords: number;
  priorSummaries: string;
  recentProse: string;
}): string {
  const { beatText, targetWords, priorSummaries, recentProse } = args;
  /* Keep section ordering parallel to the default system template so
   * authors who edit the template can reason about both halves together. */
  return [
    "PRIOR CHAPTER SUMMARIES:",
    priorSummaries || "(none — first chapter)",
    "",
    "RECENT PROSE (last ~1,500 words of the current chapter):",
    recentProse || "(the chapter is empty — this beat starts the scene)",
    "",
    "BEAT TO EXPAND:",
    beatText,
    "",
    `Expand this beat into ${lengthPhrase(targetWords)}. Implement every bracketed stage direction; never echo the brackets.`,
  ].join("\n");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiJsonError(
      "Please sign in to continue.",
      ApiErrorCode.UNAUTHORIZED,
      401,
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
  }

  const parsed = SceneBeatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
  }
  const body = parsed.data;

  const rl = await checkRateLimit(user.id, "scene-beat");
  if (!rl.allowed) {
    return apiJsonRateLimited(rl.resetAt);
  }

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id, book_id, title, chapter_number")
    .eq("id", body.chapterId)
    .maybeSingle();

  if (chapterError) {
    logServerError("scene-beat.chapter-fetch", chapterError);
    return apiJsonError("Could not load chapter.", ApiErrorCode.INTERNAL, 500);
  }
  if (!chapter) {
    return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select(
      "id, user_id, title, genre, tone, style_examples, style_instructions, series_id, series_order",
    )
    .eq("id", chapter.book_id)
    .maybeSingle();

  if (bookError) {
    logServerError("scene-beat.book-fetch", bookError);
    return apiJsonError("Could not load book.", ApiErrorCode.INTERNAL, 500);
  }
  if (!book) {
    return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
  }
  if (book.user_id !== user.id) {
    return apiJsonError(
      "You do not have access to this book.",
      ApiErrorCode.FORBIDDEN,
      403,
    );
  }
  const seriesContextInput = buildSeriesContextInputForBook(book, user.id);

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logServerError("scene-beat.profile-fetch", profileError);
    return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
  }
  if (!profile) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      logServerError(
        "scene-beat.profile-create",
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

  const beatText = sanitizeText(body.beatText).slice(0, MAX_BEAT_CHARS).trim();
  if (!beatText) {
    return apiJsonError(
      "Beat is empty after sanitizing.",
      ApiErrorCode.VALIDATION_ERROR,
      400,
    );
  }

  const lengthHint: SceneBeatLength = body.lengthHint;
  const targetWords = SCENE_BEAT_LENGTH_WORDS[lengthHint];

  /* Full-context pack: codex + prior-chapter summaries + last ~1,500 words
   * of the current chapter. The assembler handles token budgeting. Unlike
   * inline-command we leave `priorChapters` undefined so the assembler
   * actually fetches them — continuity is crucial for scene-beat prose. */
  const context = await buildGenerationContext({
    supabase,
    projectId: book.id,
    currentChapterId: chapter.id,
    taskType: "scene-beat",
    baseSystemPrompt: "", /* template-driven; no legacy concatenated prompt. */
    styleInput: {
      style_examples: book.style_examples,
      style_instructions: book.style_instructions,
    },
    projectMeta: {
      title: book.title,
      genre: book.genre,
    },
    seriesContextInput,
    chapterMeta: {
      number: chapter.chapter_number,
      title: chapter.title,
    },
    userInstruction: beatText,
  });

  const resolvedPrompt = await resolveSystemPromptFromTemplate({
    supabase,
    userId: user.id,
    projectId: book.id,
    taskId: "scene-beat",
    variables: context.variables,
    fallbackPrompt: context.systemPrompt,
  });
  const systemPrompt = resolvedPrompt.systemPrompt;
  const missingCriticalVars = missingRequiredVariables(
    resolvedPrompt.active.templateText,
    CRITICAL_VARIABLES_BY_TASK["scene-beat"],
  );
  if (missingCriticalVars.length > 0) {
    console.warn("[prompt-template] critical variables missing", {
      taskId: "scene-beat",
      templateSource: resolvedPrompt.active.source,
      templateId: resolvedPrompt.active.id,
      missingVariables: missingCriticalVars,
    });
  }
  const missingVarsHeader = process.env.NODE_ENV !== "production" &&
      missingCriticalVars.length > 0
    ? missingCriticalVars.join(",")
    : null;

  const userPrompt = buildUserPrompt({
    beatText,
    targetWords,
    priorSummaries: context.variables.prior_summaries,
    recentProse: context.variables.recent_prose,
  });

  const openai = getOpenAI();

  let completionStream: Stream<ChatCompletionChunk>;
  try {
    completionStream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.75,
      max_tokens: LENGTH_MAX_TOKENS[lengthHint],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (e) {
    return openAIRequestFailureResponse(e, "scene-beat.openai", {
      fallbackMessage: "The assistant is temporarily unavailable.",
    });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of completionStream) {
          const delta = part.choices?.[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        logServerError("scene-beat.stream", err);
        try {
          /* Plain-text terminator the client can detect so the node's
           * pulsing border doesn't hang if the upstream breaks. */
          controller.enqueue(
            encoder.encode("\n\n[ERROR] Streaming interrupted. Please retry."),
          );
        } catch {
          /* controller may already be closed */
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
    cancel() {
      /* Author discarded / deleted the beat node mid-stream. Let GC tear
       * the iterator down; the OpenAI SDK v4 doesn't expose a formal
       * cancel hook on the stream iterator. */
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-SceneBeat-Length": lengthHint,
      "X-SceneBeat-Target-Words": String(targetWords),
      ...(missingVarsHeader
        ? { "X-ChapterAI-Missing-Vars": missingVarsHeader }
        : {}),
    },
  });
}

/**
 * POST /api/ai/inline-command
 *
 * Bubble-menu multi-alternative rewriter. Given a highlighted passage + small
 * preceding/following context windows, streams `alternativeCount` rewrites of
 * the selection separated by the literal delimiter line
 * `---ALTERNATIVE---`. The client splits on that delimiter as bytes arrive
 * and renders each alternative in a card stack.
 *
 * Unlike the existing non-streaming `chapter-assist` route this one:
 *  - returns raw `text/plain` streamed bytes (no AI-SDK data-stream wrapper)
 *  - does not snapshot the chapter (changes are still a proposal at this
 *    point; the author has to explicitly pick an alternative before the
 *    editor is mutated)
 *  - accepts only `chapterId` from the client and derives `bookId` from it,
 *    because the bubble menu has no book-level context at hand.
 */
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming";

import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { buildInlineCommandSystemPrompt } from "@/lib/ai/prompt-templates";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import {
  ALTERNATIVE_DELIMITER,
  commandPromptFor,
  type InlineCommandId,
} from "@/lib/ai/inline-commands";
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
import { InlineCommandRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";

/** Server-side hard caps — belt & braces around the zod schema. */
const MAX_SELECTION_CHARS = 40_000;
const MAX_PRECEDING_CHARS = 4_000;
const MAX_FOLLOWING_CHARS = 2_500;
const MAX_CUSTOM_INSTRUCTION_CHARS = 2_000;

function clampFromEnd(value: string, max: number): string {
  if (value.length <= max) return value;
  return `…${value.slice(-max)}`;
}

function clampFromStart(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function buildUserPrompt(params: {
  genre: string;
  pov: string;
  tense: string;
  precedingContext: string;
  followingContext: string;
  selection: string;
  task: string;
  alternativeCount: number;
}): string {
  const {
    genre,
    pov,
    tense,
    precedingContext,
    followingContext,
    selection,
    task,
    alternativeCount,
  } = params;

  return (
    `GENRE: ${genre}\n` +
    `POV: ${pov}\n` +
    `TENSE: ${tense}\n\n` +
    `PRECEDING CONTEXT (for tone/voice reference, do not rewrite):\n${precedingContext || "(none)"}\n\n` +
    `---\n\n` +
    `PASSAGE TO REWRITE:\n${selection}\n\n` +
    `---\n\n` +
    `FOLLOWING CONTEXT (for tone/voice reference, do not rewrite):\n${followingContext || "(none)"}\n\n` +
    `Task: ${task}\n\n` +
    `Return ${alternativeCount} distinct alternative rewrites, separated by ` +
    `the exact delimiter line '${ALTERNATIVE_DELIMITER}' on its own line. ` +
    `Do not prefix, number, or label the alternatives. Each alternative ` +
    `must stand alone as a replacement for the PASSAGE TO REWRITE.`
  );
}

export async function POST(request: Request) {
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

  const parsed = InlineCommandRequestSchema.safeParse(json);
  if (!parsed.success) {
    return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
  }

  const body = parsed.data;
  const commandId = body.command as InlineCommandId;

  if (commandId === "custom") {
    const trimmed = body.customInstruction?.trim() ?? "";
    if (!trimmed) {
      return apiJsonError(
        "Tell the assistant how to rewrite the passage.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }
  }

  const rl = await checkRateLimit(user.id, "inline-command");
  if (!rl.allowed) {
    return apiJsonRateLimited(rl.resetAt);
  }

  /* Single lookup to (a) verify the chapter exists, (b) resolve its book,
   * and (c) enforce ownership — all via the books->chapters foreign key in
   * a join. RLS also blocks cross-user access but this keeps the 404/403
   * shape clean for the client. */
  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id, book_id, title, chapter_number")
    .eq("id", body.chapterId)
    .maybeSingle();

  if (chapterError) {
    logServerError("inline-command.chapter-fetch", chapterError);
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
    logServerError("inline-command.book-fetch", bookError);
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
    logServerError("inline-command.profile-fetch", profileError);
    return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
  }

  if (!profile) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      logServerError(
        "inline-command.profile-create",
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

  const selection = sanitizeText(body.selection).slice(0, MAX_SELECTION_CHARS);
  if (!selection.trim()) {
    return apiJsonError(
      "Selection is empty after sanitizing.",
      ApiErrorCode.VALIDATION_ERROR,
      400,
    );
  }

  const precedingContext = clampFromEnd(
    sanitizeText(body.precedingContext ?? ""),
    MAX_PRECEDING_CHARS,
  );
  const followingContext = clampFromStart(
    sanitizeText(body.followingContext ?? ""),
    MAX_FOLLOWING_CHARS,
  );

  /* `books` does not yet have dedicated POV / tense columns — those are
   * inferred from `refined_idea` elsewhere. Until Prompt 3 (codex) ships
   * real per-project POV + tense fields, we pass "unspecified" placeholders
   * and rely on the preceding-context window + style_examples to anchor
   * voice. The prompt template is kept POV/tense-aware so lighting those
   * columns up later is a one-line change. */
  const task = commandPromptFor(
    commandId,
    commandId === "custom"
      ? body.customInstruction?.slice(0, MAX_CUSTOM_INSTRUCTION_CHARS)
      : undefined,
  );

  const userPrompt = buildUserPrompt({
    genre: book.genre ?? "unspecified",
    pov: "unspecified",
    tense: "unspecified",
    precedingContext,
    followingContext,
    selection,
    task,
    alternativeCount: body.alternativeCount,
  });

  /* All cross-cutting context (style examples, codex, prior chapter
   * summaries, recent prose) is assembled + token-budgeted by the
   * context-assembler. The route still owns its base "you are a fiction
   * editor" prompt and its user message shape. */
  const context = await buildGenerationContext({
    supabase,
    projectId: book.id,
    currentChapterId: chapter.id,
    taskType: "inline-command",
    baseSystemPrompt: buildInlineCommandSystemPrompt(),
    styleInput: {
      style_examples: book.style_examples,
      style_instructions: book.style_instructions,
    },
    selectionText: selection,
    precedingProse: precedingContext,
    followingProse: followingContext,
    seriesContextInput,
    /* inline-command does not inject prior-chapter summaries into the
     * system prompt — the preceding/following windows already carry the
     * local continuity the rewriter needs. Pass an empty array so the
     * assembler skips the summaries DB roundtrip entirely. */
    priorChapters: [],
    /* Recent prose is already provided explicitly via precedingProse;
     * skip the DB fetch of the full current chapter. */
    currentChapterContent: "",
    projectMeta: {
      title: book.title,
      genre: book.genre,
    },
    chapterMeta: {
      number: chapter.chapter_number,
      title: chapter.title,
    },
    userInstruction: task,
  });

  /* Prompt Template Editor integration — if the user has an active
   * template for this task, the system prompt comes from it (with
   * variables interpolated from the context). If not, we fall back to
   * the legacy concatenated `context.systemPrompt`. */
  const resolvedPrompt = await resolveSystemPromptFromTemplate({
    supabase,
    userId: user.id,
    projectId: book.id,
    taskId: "inline-command",
    variables: context.variables,
    fallbackPrompt: context.systemPrompt,
  });
  const systemPrompt = resolvedPrompt.systemPrompt;
  const missingCriticalVars = missingRequiredVariables(
    resolvedPrompt.active.templateText,
    CRITICAL_VARIABLES_BY_TASK["inline-command"],
  );
  if (missingCriticalVars.length > 0) {
    console.warn("[prompt-template] critical variables missing", {
      taskId: "inline-command",
      templateSource: resolvedPrompt.active.source,
      templateId: resolvedPrompt.active.id,
      missingVariables: missingCriticalVars,
    });
  }
  const missingVarsHeader = process.env.NODE_ENV !== "production" &&
      missingCriticalVars.length > 0
    ? missingCriticalVars.join(",")
    : null;

  const openai = getOpenAI();

  let completionStream: Stream<ChatCompletionChunk>;
  try {
    completionStream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.75,
      /* Enough headroom for ~3 rewrites at 1.5x a typical selection. Guarded
       * by MAX_SELECTION_CHARS; a runaway output is bounded server-side. */
      max_tokens: 2_400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (e) {
    return openAIRequestFailureResponse(e, "inline-command.openai", {
      fallbackMessage: "The assistant is temporarily unavailable.",
    });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of completionStream) {
          const delta = part.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        logServerError("inline-command.stream", err);
        try {
          /* Surface a terminator the client can detect so the spinner
           * doesn't hang forever if the upstream stream breaks mid-flight. */
          controller.enqueue(
            encoder.encode(
              `\n${ALTERNATIVE_DELIMITER}\n[ERROR] Streaming interrupted. Please retry.`,
            ),
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
      /* Client aborted (closed the panel mid-stream). The OpenAI SDK
       * exposes an internal `controller` on the stream but v4 doesn't
       * formally document it, so we let GC tear the iterator down. */
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      ...(missingVarsHeader
        ? { "X-ChapterAI-Missing-Vars": missingVarsHeader }
        : {}),
    },
  });
}


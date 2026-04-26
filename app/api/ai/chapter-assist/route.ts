import { NextResponse } from "next/server";

import { snapshotChapter } from "@/lib/book/revisions";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import {
  buildChapterAssistExpandSystemPrompt,
  buildChapterAssistFallbackRewriteSystemPrompt,
  getChapterContinueSystemPrompt,
  getChapterProofreadSystemPrompt,
  getChapterRewriteSystemPrompt,
  getChapterShortenSystemPrompt,
} from "@/lib/ai/prompt-templates";
import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
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
import { parseRefinedIdeaValue } from "@/lib/refined-idea/parse";
import { ChapterAssistRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";

/** Merged for inline assist system prompts; avoids duplicating the assembler's <style_examples> block. */
function mergeStyleForAssist(
  styleExamples: string | null | undefined,
  styleInstructions: string | null | undefined,
): string | null {
  const e = styleExamples?.trim() ?? "";
  const i = styleInstructions?.trim() ?? "";
  if (e && i) return `${e}\n\n---\n\nAuthor style notes: ${i}`;
  if (e) return e;
  if (i) return i;
  return null;
}

function toneInstruction(tone: "formal" | "casual" | "dramatic"): string {
  switch (tone) {
    case "formal":
      return "Rewrite in a more formal, precise register suitable for serious nonfiction or literary prose. Keep meaning and facts.";
    case "casual":
      return "Rewrite in a warmer, more conversational voice while staying clear and professional. Keep meaning.";
    case "dramatic":
      return "Rewrite with slightly more tension, rhythm, and dramatic emphasis (without melodrama). Keep plot and meaning.";
    default:
      return "Rewrite with improved clarity.";
  }
}

/** Extract a tail excerpt from prior chapters to ground `continue` without exploding the prompt budget. */
function buildContinueContext(
  priorChapters: {
    chapter_number: number;
    title: string;
    content: string | null;
  }[],
): string {
  if (priorChapters.length === 0) return "";
  const pieces: string[] = [];
  for (const c of priorChapters) {
    const body = c.content?.trim();
    if (!body) continue;
    const excerpt = body.length > 800 ? `…${body.slice(-800)}` : body;
    pieces.push(`### Chapter ${c.chapter_number}: ${sanitizeText(c.title)}\n${sanitizeText(excerpt)}`);
  }
  return pieces.join("\n\n");
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

    const parsed = ChapterAssistRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const body = parsed.data;
    const { bookId, chapterId } = body;
    const selectedCodexEntryIds = body.selectedCodexEntryIds ?? [];

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "chapter-assist");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, tone, style_examples, style_instructions, refined_idea, series_id, series_order",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }
    const seriesContextInput = buildSeriesContextInputForBook(book, user.id);

    const refinedParsed = parseRefinedIdeaValue(book.refined_idea);
    const assistVoice =
      refinedParsed.success && refinedParsed.data?.voice_anchor
        ? refinedParsed.data.voice_anchor.trim() || null
        : null;
    const assistStyle = mergeStyleForAssist(
      book.style_examples,
      book.style_instructions,
    );

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("chapter-assist.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      /* Defense-in-depth against the on-signup profile trigger not running
       * (RLS misconfig, pending migration). Upsert a default row so the
       * user's first AI action does not 404 on "Profile not found". */
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "chapter-assist.profile-create",
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
      .select(
        "id, book_id, title, chapter_number, content, target_word_count",
      )
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

    let system: string;
    let userPrompt: string;

    if (body.action === "continue") {
      const currentContent = chapter.content?.trim() ?? "";
      if (!currentContent) {
        return apiJsonError(
          "Write (or generate) the first paragraph before continuing.",
          ApiErrorCode.VALIDATION_ERROR,
          400,
        );
      }
      const { data: priorRows } = await supabase
        .from("chapters")
        .select("chapter_number, title, content")
        .eq("book_id", bookId)
        .lt("chapter_number", chapter.chapter_number)
        .in("status", ["draft", "edited", "approved"])
        .order("chapter_number", { ascending: true });

      const priorContext = buildContinueContext(priorRows ?? []);
      const target = chapter.target_word_count ?? 2_500;
      system = getChapterContinueSystemPrompt(
        chapter.chapter_number,
        sanitizeText(chapter.title),
        book.genre,
        book.tone,
        target,
        assistVoice,
        assistStyle,
      );
      const tail =
        currentContent.length > 4_000
          ? `…${currentContent.slice(-4_000)}`
          : currentContent;
      userPrompt =
        `Book: ${sanitizeText(book.title)}\n\n` +
        (priorContext ? `## Prior chapter excerpts (end of each)\n${priorContext}\n\n` : "") +
        `## Current chapter text so far\n${sanitizeText(tail)}\n\n` +
        `Draft the next paragraphs now. Do not repeat the existing text.`;
    } else {
      const selected = sanitizeText(body.selectedText);
      if (!selected.trim()) {
        return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
      }

      if (body.action === "expand") {
        const authorInstruction = body.prompt ? sanitizeText(body.prompt).slice(0, 2_000) : "";
        system = buildChapterAssistExpandSystemPrompt({
          genre: book.genre,
          tone: book.tone,
          authorInstruction,
        });
        userPrompt =
          `Chapter: ${sanitizeText(chapter.title)}\n\n` +
          (authorInstruction ? `Author instruction:\n${authorInstruction}\n\n` : "") +
          `Passage to expand:\n\n${selected}`;
      } else if (body.action === "rewrite") {
        const instruction = sanitizeText(body.prompt).slice(0, 2_000);
        system = getChapterRewriteSystemPrompt(
          book.genre,
          book.tone,
          assistVoice,
          assistStyle,
        );
        userPrompt =
          `Chapter: ${sanitizeText(chapter.title)}\n\n` +
          `Author instruction:\n${instruction}\n\n` +
          `Passage to rewrite:\n\n${selected}`;
      } else if (body.action === "shorten") {
        system = getChapterShortenSystemPrompt(
          book.genre,
          book.tone,
          assistVoice,
          assistStyle,
        );
        userPrompt = `Chapter: ${sanitizeText(chapter.title)}\n\nPassage to shorten:\n\n${selected}`;
      } else if (body.action === "proofread") {
        system = getChapterProofreadSystemPrompt();
        userPrompt = `Chapter: ${sanitizeText(chapter.title)}\n\nPassage to proofread:\n\n${selected}`;
      } else {
        system = buildChapterAssistFallbackRewriteSystemPrompt(toneInstruction(body.tone));
        userPrompt = `Chapter: ${sanitizeText(chapter.title)}\n\nBook: ${sanitizeText(book.title)}\n\nPassage to rewrite:\n\n${selected}`;
      }
    }

    /* Style, codex, prior-chapter summaries, and recent prose are all
     * assembled + token-budgeted by the context-assembler. The route
     * still owns its action-specific base system prompt and user
     * message shape. We pass `userPrompt` as the codex match window
     * because (for "continue") it already contains the chapter tail +
     * prior excerpts and catches any named entities the selection
     * references. */
    const useAssistInlinedStyle =
      body.action === "continue" ||
      body.action === "rewrite" ||
      body.action === "shorten";

    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      currentChapterId: chapterId,
      taskType: "chapter-assist",
      baseSystemPrompt: system,
      styleInput: useAssistInlinedStyle
        ? { style_examples: null, style_instructions: null }
        : {
            style_examples: book.style_examples,
            style_instructions: book.style_instructions,
          },
      precedingProse: chapter.content ?? "",
      codexTextOverride: userPrompt,
      forcedCodexEntryIds: selectedCodexEntryIds,
      seriesContextInput,
      /* The "continue" action builds its own prior-chapter excerpt
       * block inline (see buildContinueContext above); other actions
       * don't need summaries. Skip the assembler's summary fetch. */
      priorChapters: [],
      /* precedingProse already carries the chapter body; avoid a
       * redundant DB roundtrip. */
      currentChapterContent: "",
      projectMeta: {
        title: book.title,
        genre: book.genre,
      },
      chapterMeta: {
        number: chapter.chapter_number,
        title: chapter.title,
      },
      userInstruction: userPrompt,
    });

    const resolvedPrompt = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "chapter-assist",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });
    const codexMissingFromResolvedTemplate =
      !resolvedPrompt.usedFallback &&
      !resolvedPrompt.systemPrompt.includes(context.codexBlock) &&
      context.codexBlock.trim().length > 0;
    const systemPrompt = codexMissingFromResolvedTemplate
      ? `${resolvedPrompt.systemPrompt}\n\n${context.codexBlock}`
      : resolvedPrompt.systemPrompt;
    const missingCriticalVars = missingRequiredVariables(
      resolvedPrompt.active.templateText,
      CRITICAL_VARIABLES_BY_TASK["chapter-assist"],
    );
    if (missingCriticalVars.length > 0) {
      console.warn("[prompt-template] critical variables missing", {
        taskId: "chapter-assist",
        templateSource: resolvedPrompt.active.source,
        templateId: resolvedPrompt.active.id,
        missingVariables: missingCriticalVars,
      });
    }
    const missingVarsHeader = process.env.NODE_ENV !== "production" &&
        missingCriticalVars.length > 0
      ? missingCriticalVars.join(",")
      : null;

    let text: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: body.action === "proofread" ? 0.2 : 0.65,
        max_tokens: 4096,
      });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "chapter-assist.openai", {
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

    /* For assist actions that the client applies by *replacing* chapter
     * text (expand / tone), snapshot the current pre-change chapter so the
     * author can undo the rewrite later from the Version history panel.
     * Other actions (rewrite / shorten / proofread / continue) either only
     * touch an inline selection or append, and the client's own undo stack
     * covers those — no snapshot needed here. */
    if (body.action === "expand" || body.action === "tone") {
      await snapshotChapter(supabase, {
        chapterId,
        userId: user.id,
        source: body.action === "expand" ? "assist_expand" : "assist_tone",
      });
    }

    return NextResponse.json(
      { text },
      {
        headers: missingVarsHeader
          ? { "X-ChapterAI-Missing-Vars": missingVarsHeader }
          : undefined,
      },
    );
  } catch (e) {
    logServerError("chapter-assist", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

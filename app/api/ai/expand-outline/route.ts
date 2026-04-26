import { NextResponse } from "next/server";

import { buildGenerationContext } from "@/lib/ai/context-assembler";
import {
  appendExpandOutlineAuthorInstruction,
  buildExpandOutlineSystemPrompt,
} from "@/lib/ai/prompt-templates";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { refinedIdeaToPlainSummary, refinedIdeaToTemplatePremise } from "@/lib/refined-idea/parse";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { ExpandOutlineRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";

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

    const parsed = ExpandOutlineRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, tone, refined_idea, style_examples, style_instructions, series_id, series_order",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }
    const seriesContextInput = buildSeriesContextInputForBook(book, user.id);

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("expand-outline.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      /* Defense-in-depth against the on-signup profile trigger not running
       * (RLS misconfig, pending migration). Upsert a default row so the
       * user's first AI action does not 404 on "Profile not found". */
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "expand-outline.profile-create",
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
      .select("id, book_id, title, chapter_number, outline_summary")
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
        `Free plan includes AI outline tools for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro for chapters ${FREE_MAX_CHAPTERS_PER_BOOK + 1}+.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    // Gather minimal surrounding context: the immediately previous/next
    // chapters help the model expand consistently without blowing up cost.
    const { data: neighbors } = await supabase
      .from("chapters")
      .select("chapter_number, title, outline_summary")
      .eq("book_id", bookId)
      .in("chapter_number", [chapter.chapter_number - 1, chapter.chapter_number + 1])
      .order("chapter_number", { ascending: true });

    const prior = neighbors?.find((n) => n.chapter_number === chapter.chapter_number - 1);
    const next = neighbors?.find((n) => n.chapter_number === chapter.chapter_number + 1);

    const existingOutline = sanitizeText(chapter.outline_summary ?? "").trim();
    const authorInstruction = parsed.data.prompt
      ? sanitizeText(parsed.data.prompt).slice(0, 2_000).trim()
      : "";

    const baseSystem = buildExpandOutlineSystemPrompt(authorInstruction);

    /* Even though this route outputs bullets, not prose, the bullets seed
     * chapter drafting. The context-assembler anchors the beats to the
     * author's voice and auto-injects codex entries matching the
     * existing outline (plus adjacent-chapter outlines, for continuity)
     * so expansion can reference named characters/locations by their
     * canonical description. No `precedingProse` — outline expansion
     * doesn't need the actual chapter prose yet. */
    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      currentChapterId: chapter.id,
      currentBeat: existingOutline,
      taskType: "expand-outline",
      baseSystemPrompt: baseSystem,
      styleInput: {
        style_examples: book.style_examples,
        style_instructions: book.style_instructions,
      },
      codexTextOverride: [
        chapter.title,
        existingOutline,
        prior?.outline_summary ?? "",
        next?.outline_summary ?? "",
        authorInstruction,
      ]
        .filter((s) => !!s)
        .join("\n"),
      seriesContextInput,
      priorChapters: [],
      currentChapterContent: "",
      projectMeta: {
        title: book.title,
        genre: book.genre,
        premise: refinedIdeaToTemplatePremise(
          book.refined_idea,
          "expand-outline.projectMeta",
          { bookId: bookId },
        ),
      },
      chapterMeta: {
        number: chapter.chapter_number,
        title: chapter.title,
        beat: existingOutline,
      },
      userInstruction: authorInstruction,
    });
    const resolvedPrompt = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "expand-outline",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });
    const system = resolvedPrompt.systemPrompt;
    const missingCriticalVars = missingRequiredVariables(
      resolvedPrompt.active.templateText,
      CRITICAL_VARIABLES_BY_TASK["expand-outline"],
    );
    if (missingCriticalVars.length > 0) {
      console.warn("[prompt-template] critical variables missing", {
        taskId: "expand-outline",
        templateSource: resolvedPrompt.active.source,
        templateId: resolvedPrompt.active.id,
        missingVariables: missingCriticalVars,
      });
    }
    const missingVarsHeader = process.env.NODE_ENV !== "production" &&
        missingCriticalVars.length > 0
      ? missingCriticalVars.join(",")
      : null;

    const contextLines: string[] = [
      `Book: ${sanitizeText(book.title || "Untitled")}`,
      book.genre ? `Genre: ${sanitizeText(book.genre)}` : null,
      book.tone ? `Tone: ${sanitizeText(book.tone)}` : null,
      (() => {
        const p = refinedIdeaToPlainSummary(
          book.refined_idea,
          "expand-outline.context-lines",
          2_000,
          { bookId: bookId },
        );
        return p ? `Premise: ${sanitizeText(p)}` : null;
      })(),
      "",
      `Chapter ${chapter.chapter_number}: ${sanitizeText(chapter.title || "Untitled")}`,
      `Current outline:\n${existingOutline || "(none yet — create one from scratch for this chapter)"}`,
    ].filter((l): l is string => l !== null);

    if (prior?.outline_summary?.trim()) {
      contextLines.push(
        "",
        `Previous chapter (${prior.chapter_number}: ${sanitizeText(prior.title || "Untitled")}) outline:\n${sanitizeText(prior.outline_summary).slice(0, 1_500)}`,
      );
    }
    if (next?.outline_summary?.trim()) {
      contextLines.push(
        "",
        `Next chapter (${next.chapter_number}: ${sanitizeText(next.title || "Untitled")}) outline:\n${sanitizeText(next.outline_summary).slice(0, 1_500)}`,
      );
    }
    appendExpandOutlineAuthorInstruction(contextLines, authorInstruction);

    const userPrompt = contextLines.join("\n");

    let text: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 1_200,
      });
      text = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "expand-outline.openai", {
        fallbackMessage: "The outline assistant is temporarily unavailable.",
      });
    }

    if (!text) {
      return apiJsonError(
        "The assistant returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
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
    logServerError("expand-outline", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

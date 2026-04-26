/**
 * Canonical assembly path for AI system prompts.
 *
 * Long term, every prose task should go through this module (or helpers it
 * owns): variable dictionary from {@link buildGenerationContext}, then
 * {@link resolveSystemPromptFromTemplate} with a platform / user template.
 *
 * The {@link getChapterSystemPrompt} monolith remains the **fallback body**
 * until those bodies live entirely as `prompt_templates` rows. Do not
 * duplicate its literary rules in a second place.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildGenerationContext,
  type PriorChapterSummaryInput,
} from "@/lib/ai/context-assembler";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
  type PromptTaskId,
} from "@/lib/ai/template-variables";
import { getChapterSystemPrompt } from "@/lib/ai/prompt-templates";
import { refinedIdeaToTemplatePremise } from "@/lib/refined-idea/parse";
import type { BookTypeDb, Json } from "@/types/database.types";
import type { Database } from "@/types/database.types";

export type { PromptTaskId };

export type BuildGenerateChapterPipelineInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  projectId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  targetWords: number;
  bookType: BookTypeDb;
  /** `buildBookContext` output. */
  bookContext: string;
  /** For {@link getChapterSystemPrompt} (already summarized prose blocks). */
  priorSummaries: string[];
  characterBibleText: string | null;
  voiceAnchor: string | null;
  isInSeries: boolean;
  seriesContinuity: string | null;
  /**
   * When the book is in a series, the seriesId + its 1-indexed position
   * among siblings. Passed through to the context assembler so it can
   * build the structured `<series>` tier (prior book summaries + active
   * arcs). Leave undefined for standalone books.
   */
  seriesContext?: {
    seriesId: string;
    currentBookPosition: number;
  };
  book: {
    title: string;
    genre: string | null;
    refined_idea: Json | null;
    style_examples: string | null;
    style_instructions: string | null;
  };
  /** Current chapter beat for template vars + codex. */
  outlineSummary: string | null;
  /** Freeform chapter-specific instructions from the editor steering panel. */
  authorNotes?: string | null;
  /** Passed as `codexTextOverride` to the assembler. */
  codexTextContext: string;
  /** Last ~500 words of the prior chapter, or empty. */
  precedingProse: string;
  /** Filled for `{prior_summaries}` in templates (not re-derived from `priorSummaries` text). */
  priorChapters: ReadonlyArray<PriorChapterSummaryInput>;
  /** Codex entries explicitly selected by the author for this generation. */
  forcedCodexEntryIds?: ReadonlyArray<string>;
};

export type BuildGenerateChapterPipelineResult = {
  systemPrompt: string;
  userMessage: string;
  codexMatchedEntryIds: string[];
  codexMatchedEntryCount: number;
  resolveMeta: {
    usedFallback: boolean;
    unknownVariables: string[];
  };
};

export function buildChapterGenerationUserMessage(params: {
  targetWords: number;
  outlineSummary?: string | null;
  authorNotes?: string | null;
  recentProse?: string | null;
}): string {
  const chapterBeat = (params.outlineSummary ?? "").trim();
  const chapterBeatBlock = chapterBeat
    ? `\n\n## Chapter outline (must cover this)\n\n${chapterBeat}`
    : "";
  const authorNotes = (params.authorNotes ?? "").trim();
  const authorNotesBlock = authorNotes
    ? `\n\n## Author steering notes (highest priority)\n\nFollow these instructions for this generation unless they directly violate established continuity:\n${authorNotes}`
    : "";
  const recentProseBlock = params.recentProse
    ? `\n\n---\n\n## End of the previous chapter (for voice + scene continuity; do not repeat it)\n\n${params.recentProse}`
    : "";
  return (
    `Write the complete chapter now. Target approximately ${params.targetWords} words.` +
    authorNotesBlock +
    chapterBeatBlock +
    recentProseBlock
  );
}

/**
 * One call site for chapter generation: legacy base system prompt →
 * {@link buildGenerationContext} (style, codex, template variables) →
 * {@link resolveSystemPromptFromTemplate} (`chapter-gen`).
 */
export async function buildGenerateChapterPipeline(
  input: BuildGenerateChapterPipelineInput,
): Promise<BuildGenerateChapterPipelineResult> {
  const baseSystem = getChapterSystemPrompt(
    input.chapterNumber,
    input.chapterTitle,
    input.targetWords,
    input.bookContext,
    input.priorSummaries,
    input.characterBibleText,
    input.bookType,
    input.voiceAnchor,
    input.isInSeries,
  );

  const context = await buildGenerationContext({
    supabase: input.supabase,
    projectId: input.projectId,
    currentChapterId: input.chapterId,
    currentChapterNumber: input.chapterNumber,
    taskType: "chapter-gen",
    baseSystemPrompt: baseSystem,
    styleInput: {
      style_examples: input.book.style_examples,
      style_instructions: input.book.style_instructions,
    },
    systemSuffixAfterStyle:
      input.seriesContinuity && input.seriesContinuity.trim().length > 0
        ? `\n\n## Series continuity context\n${input.seriesContinuity}`
        : "",
    seriesContinuityText: input.seriesContinuity ?? "",
    seriesContextInput: input.seriesContext
      ? {
          seriesId: input.seriesContext.seriesId,
          currentBookPosition: input.seriesContext.currentBookPosition,
          userId: input.userId,
        }
      : undefined,
    priorChapters: input.priorChapters,
    precedingProse: input.precedingProse,
    codexTextOverride: input.codexTextContext,
    forcedCodexEntryIds: input.forcedCodexEntryIds,
    currentChapterContent: "",
    projectMeta: {
      title: input.book.title,
      genre: input.book.genre,
      premise: refinedIdeaToTemplatePremise(
        input.book.refined_idea,
        "buildGenerateChapterPipeline.projectMeta",
        { bookId: input.projectId },
      ),
    },
    chapterMeta: {
      number: input.chapterNumber,
      title: input.chapterTitle,
      beat: input.outlineSummary,
    },
  });

  const resolved = await resolveSystemPromptFromTemplate({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    taskId: "chapter-gen",
    variables: context.variables,
    fallbackPrompt: context.systemPrompt,
  });
  const codexMissingFromResolvedTemplate =
    !resolved.usedFallback &&
    !resolved.systemPrompt.includes(context.codexBlock) &&
    context.codexBlock.trim().length > 0;
  const finalSystemPrompt = codexMissingFromResolvedTemplate
    ? `${resolved.systemPrompt}\n\n${context.codexBlock}`
    : resolved.systemPrompt;
  if (codexMissingFromResolvedTemplate) {
    console.warn("[chapter-gen] codex block missing from resolved template; appending fallback codex block");
  }
  const missingCriticalVars = missingRequiredVariables(
    resolved.active.templateText,
    CRITICAL_VARIABLES_BY_TASK["chapter-gen"],
  );
  if (missingCriticalVars.length > 0) {
    console.warn("[prompt-template] critical variables missing", {
      taskId: "chapter-gen",
      templateSource: resolved.active.source,
      templateId: resolved.active.id,
      missingVariables: missingCriticalVars,
    });
  }

  const userMessage = buildChapterGenerationUserMessage({
    targetWords: input.targetWords,
    outlineSummary: input.outlineSummary,
    authorNotes: input.authorNotes,
    recentProse: context.recentProse,
  });

  return {
    systemPrompt: finalSystemPrompt,
    userMessage,
    codexMatchedEntryIds: context.codexMatchedEntryIds,
    codexMatchedEntryCount: context.codexMatchedEntryCount,
    resolveMeta: {
      usedFallback: resolved.usedFallback,
      unknownVariables: resolved.unknownVariables,
    },
  };
}

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getOutlineFictionPhaseASystemPrompt,
  getOutlineSystemPromptForBookType,
} from "@/lib/ai/prompt-templates";
import { generateWithFailover } from "@/lib/ai/model-router";
import { buildGenerationContext } from "@/lib/ai/context-assembler";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import {
  buildSeriesContinuityForOutlinePrompt,
  loadSeriesMetaAndPriorBooks,
} from "@/lib/series/continuity";
import { buildChapterOutlineSummary } from "@/lib/outline/build-chapter-outline-summary";
import { extractRequestedChapterCount } from "@/lib/outline/extract-chapter-count";
import {
  coerceFictionStructuralPayload,
  outlineFictionStructuralResponseSchema,
} from "@/lib/outline/fiction-outline-schemas";
import {
  runFictionOutlineInventoryBatches,
  syncChapterOutlineSummaries,
  upsertOutlineSections,
} from "@/lib/outline/generate-outline-two-pass";
import { normalizeFictionStructuralSections } from "@/lib/outline/normalize-fiction-sections";
import type { OutlineSectionPayload } from "@/lib/outline/section-payload";
export type { OutlineSectionPayload };
import {
  emptySeriesContextMeta,
  logSeriesAiGeneration,
  type SeriesContextMeta,
} from "@/lib/series/observability";
import { buildPreviouslyInSeriesText } from "@/lib/series/previously";
import { briefSourceForBookRow } from "@/lib/refined-idea/parse";
import { formatReaderArcContextLinesFromJson } from "@/lib/refined-idea/reader-arc";
import {
  RefinedIdeaBriefSchema,
  type RefinedIdeaBrief,
} from "@/lib/refined-idea/schema";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { parseJsonObjectLenient } from "@/lib/utils/parse-lenient-json";
import { OutlineRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
/**
 * Long-running: Phase A (structural) + many Phase B (inventory) batches
 * (Prompt 17).
 */
export const maxDuration = 300;

const nonFictionChapterSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  reader_takeaway: z.string().min(1),
  content_type: z.string().min(1),
  evidence_notes: z.string().optional(),
  opening_hook_move: z.string().optional(),
  signature_example: z.string().optional(),
  bridges_to_next: z.string().optional(),
  manuscript_bible_digest: z.string().optional().default(""),
  continuity_from_prior_chapters: z.string().optional().default(""),
  stakes_for_reader: z.string().optional().default(""),
  counterargument_or_tension: z.string().optional().default(""),
  every_voice_person_or_source: z.string().optional().default(""),
  every_context_setting_or_timeframe: z.string().optional().default(""),
  every_example_evidence_or_datum: z.string().optional().default(""),
  every_term_framework_or_rule: z.string().optional().default(""),
  mandatory_beats_checklist: z.string().optional().default(""),
});

const outlineNonFictionResponseSchema = z.object({
  chapters: z.array(nonFictionChapterSchema).min(1).max(40),
});

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

function normalizeNonFictionSections(
  chapters: z.infer<typeof nonFictionChapterSchema>[],
): OutlineSectionPayload[] {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return sorted.map((c, index) => {
    const row: OutlineSectionPayload = {
      number: index + 1,
      title: c.title.trim(),
      description: c.description.trim(),
      reader_takeaway: c.reader_takeaway.trim(),
      content_type: c.content_type.trim(),
      manuscript_bible_digest: (c.manuscript_bible_digest ?? "").trim(),
      continuity_from_prior_chapters: (c.continuity_from_prior_chapters ?? "").trim(),
      stakes_for_reader: (c.stakes_for_reader ?? "").trim(),
      counterargument_or_tension: (c.counterargument_or_tension ?? "").trim(),
      every_voice_person_or_source: (c.every_voice_person_or_source ?? "").trim(),
      every_context_setting_or_timeframe: (c.every_context_setting_or_timeframe ?? "").trim(),
      every_example_evidence_or_datum: (c.every_example_evidence_or_datum ?? "").trim(),
      every_term_framework_or_rule: (c.every_term_framework_or_rule ?? "").trim(),
      mandatory_beats_checklist: (c.mandatory_beats_checklist ?? "").trim(),
    };
    if (c.evidence_notes?.trim()) {
      row.evidence_notes = c.evidence_notes.trim();
    }
    if (c.opening_hook_move?.trim()) {
      row.opening_hook_move = c.opening_hook_move.trim();
    }
    if (c.signature_example?.trim()) {
      row.signature_example = c.signature_example.trim();
    }
    if (c.bridges_to_next?.trim()) {
      row.bridges_to_next = c.bridges_to_next.trim();
    }
    return row;
  });
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

function extractBookColumnsFromRefinedBrief(b: RefinedIdeaBrief): {
  title: string | null;
  subtitle: string | null;
  genre: string | null;
  target_audience: string | null;
  tone: string | null;
} {
  return {
    title: pickString(b.title, b.suggested_title),
    subtitle: pickString(b.subtitle),
    genre: pickString(b.genre),
    target_audience: pickString(b.target_audience, b.audience),
    tone: pickString(b.tone, b.tone_and_style),
  };
}

function renderConversationTranscript(
  conversation: { role: "user" | "assistant"; content: string }[] | undefined,
): string {
  if (!conversation || conversation.length === 0) return "";
  return conversation
    .map((m) => {
      const speaker = m.role === "user" ? "Author" : "Editor";
      return `${speaker}: ${sanitizeText(m.content).trim()}`;
    })
    .filter((line) => line.length > `Author: `.length)
    .join("\n\n");
}

function renderSeriesCharacterBible(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    return sanitizeText(raw).trim();
  }
  if (typeof raw === "object") {
    try {
      return sanitizeText(JSON.stringify(raw, null, 2)).trim();
    } catch {
      return "";
    }
  }
  return "";
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

    const parsed = OutlineRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const {
      bookId,
      rawIdea: rawIdeaIn,
      refinedIdeaOverride: refinedIn,
      conversation: conversationIn,
    } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rawIdea = rawIdeaIn !== undefined ? sanitizeText(rawIdeaIn) : undefined;
    const refinedIdeaOverride =
      refinedIn !== undefined ? sanitizeText(refinedIn) : undefined;

    if (rawIdea !== undefined && rawIdea.trim().length > 0) {
      const { error: rawUpdateError } = await supabase
        .from("books")
        .update({ raw_idea: rawIdea.trim() })
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (rawUpdateError) {
        logServerError("generate-outline.raw-idea", rawUpdateError);
        return apiJsonError("Could not save concept.", ApiErrorCode.INTERNAL, 500);
      }
    }

    let statusWasBumpedToRefining = false;

    if (
      refinedIdeaOverride !== undefined &&
      refinedIdeaOverride.trim().length > 0
    ) {
      const trimmedRefined = refinedIdeaOverride.trim();
      let parsed: RefinedIdeaBrief;
      try {
        const raw = JSON.parse(trimmedRefined) as unknown;
        const z = RefinedIdeaBriefSchema.safeParse(raw);
        if (!z.success) {
          logServerError("generate-outline.refined-idea", z.error, { details: { bookId } });
          return apiJsonError(
            "The refined idea could not be saved. It must be valid JSON matching the expected brief shape.",
            ApiErrorCode.VALIDATION_ERROR,
            400,
          );
        }
        parsed = z.data;
      } catch (e) {
        logServerError("generate-outline.refined-idea-json", e, { details: { bookId } });
        return apiJsonError(
          "The refined idea must be valid JSON.",
          ApiErrorCode.VALIDATION_ERROR,
          400,
        );
      }
      const cols = extractBookColumnsFromRefinedBrief(parsed);
      const refinedUpdate: {
        refined_idea: Json;
        status: "refining";
        title?: string;
        subtitle?: string | null;
        genre?: string | null;
        target_audience?: string | null;
        tone?: string | null;
      } = {
        refined_idea: parsed as unknown as Json,
        status: "refining",
      };
      if (cols.title) refinedUpdate.title = cols.title;
      if (cols.subtitle !== null) refinedUpdate.subtitle = cols.subtitle;
      if (cols.genre !== null) refinedUpdate.genre = cols.genre;
      if (cols.target_audience !== null) refinedUpdate.target_audience = cols.target_audience;
      if (cols.tone !== null) refinedUpdate.tone = cols.tone;

      const { error: refinedUpdateError } = await supabase
        .from("books")
        .update(refinedUpdate)
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (refinedUpdateError) {
        logServerError("generate-outline.refined-idea", refinedUpdateError);
        return apiJsonError("Could not save refined idea.", ApiErrorCode.INTERNAL, 500);
      }
      statusWasBumpedToRefining = true;
    }

    const rollbackRefiningStatus = async (): Promise<void> => {
      if (!statusWasBumpedToRefining) return;
      try {
        await supabase
          .from("books")
          .update({ status: "idea" })
          .eq("id", bookId)
          .eq("user_id", user.id);
      } catch {
        /* ignore */
      }
    };

    const { data: bookFresh, error: refetchError } = await supabase
      .from("books")
      .select(
        "refined_idea, raw_idea, title, book_type, series_id, series_order, previously_in_series, style_examples, style_instructions",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (refetchError || !bookFresh) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (bookFresh.series_id) {
      const { data: proProf } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();
      if (proProf?.subscription_tier !== "pro") {
        return apiJsonError("Series is a Pro feature.", ApiErrorCode.UPGRADE_REQUIRED, 403);
      }
    }

    const bookType: BookTypeDb = bookFresh.book_type ?? "fiction";

    const briefRaw = briefSourceForBookRow({
      refined_idea: bookFresh.refined_idea,
      raw_idea: bookFresh.raw_idea,
      title: bookFresh.title,
      bookId,
      logContext: "generate-outline",
    });
    const brief = sanitizeText(briefRaw);

    const readerArcText = formatReaderArcContextLinesFromJson(bookFresh.refined_idea).join(
      "\n",
    );
    const readerArcBlock = readerArcText
      ? `\n\n## Reader arc (use to calibrate per-chapter tension, reader_takeaway, and beat choices; must stay consistent with the full brief above)\n${readerArcText}`
      : "";

    if (!brief) {
      return apiJsonError(
        "Add a refined idea or paste a concept before generating an outline.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const baseSystemPromptNonFiction = getOutlineSystemPromptForBookType(bookType);
    const baseSystemPromptFictionPhaseA = getOutlineFictionPhaseASystemPrompt();
    const transcript = renderConversationTranscript(conversationIn);
    const transcriptBlock =
      transcript.length > 0
        ? `\n\n## Full refinement chat transcript (for extra nuance; the brief above is authoritative)\n${transcript}`
        : "";
    let seriesBlock = "";
    /* Observability meta — populated alongside `seriesBlock` so the logger
     * at the tail of this route can record exactly which fragments the
     * outline model was shown. Spec § 362-371. */
    const seriesMeta: SeriesContextMeta = emptySeriesContextMeta();
    if (bookFresh.series_id && bookFresh.series_order != null) {
      const [ctx, livePreviously] = await Promise.all([
        loadSeriesMetaAndPriorBooks(supabase, bookId, user.id),
        buildPreviouslyInSeriesText(
          supabase,
          bookFresh.series_id,
          user.id,
          bookFresh.series_order,
          bookId,
        ),
      ]);
      if (ctx?.series) {
        const cont = buildSeriesContinuityForOutlinePrompt({
          bookNumberInSeries: ctx.bookNumberInSeries,
          seriesName: ctx.series.name,
          priorBooks: ctx.priorBooks,
        });
        const sharedWorld = sanitizeText((ctx.series.shared_world_notes ?? "").trim());
        const sharedCharacterBible = renderSeriesCharacterBible(ctx.series.shared_character_bible);
        const prev =
          livePreviously.trim() || bookFresh.previously_in_series?.trim() || "";
        if (prev) {
          seriesBlock += `\n\n## Previously in the series (recap; honor continuity)\n${prev}`;
        }
        if (sharedWorld) {
          seriesBlock += `\n\n## Series world notes (shared canon)\n${sharedWorld}`;
        }
        if (sharedCharacterBible) {
          seriesBlock += `\n\n## Series character bible (shared cast canon)\n${sharedCharacterBible}`;
        }
        seriesBlock += `\n\n## Series continuity context\n${cont}`;
        seriesMeta.blocksUsed = {
          head: true,
          series_world: Boolean(sharedWorld || sharedCharacterBible),
          prior_books_list: ctx.priorBooks.length > 0,
          previously_text: prev.length > 0,
          series_codex: sharedCharacterBible.length > 0,
        };
        seriesMeta.priorBooksCount = ctx.priorBooks.length;
        seriesMeta.priorBookIds = ctx.priorBooks.map((p) => p.id);
      }
    }
    const chapterTarget = extractRequestedChapterCount(`${brief}\n${transcript}`);
    const chapterTargetBlock =
      chapterTarget != null
        ? `\n\n## Author chapter target (mandatory)\nProduce exactly **${chapterTarget}** objects in the \`chapters\` array with \`number\` running 1 through ${chapterTarget}. Do not stop early. If the brief and this line conflict, follow **this line** for count.`
        : "";

    const userContent = `Book brief (structured JSON and/or prose):\n${brief}${readerArcBlock}${transcriptBlock}${seriesBlock}${chapterTargetBlock}`;

    /* Outline generation returns JSON (response_format: json_object), so
     * the style block MUST stay outside the JSON structure. The
     * assembler appends it to the system prompt; the model keeps
     * emitting the required JSON but tilts chapter titles/descriptions
     * toward the author's voice. Codex entries matched in the brief +
     * transcript (plus always-on entries) ride along — they sit outside
     * the JSON contract as additional context. No chapters exist yet,
     * so summary / recent-prose blocks short-circuit to empty. */
    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      taskType: "generate-outline",
      baseSystemPrompt:
        bookType === "non_fiction"
          ? baseSystemPromptNonFiction
          : baseSystemPromptFictionPhaseA,
      styleInput: {
        style_examples: bookFresh.style_examples,
        style_instructions: bookFresh.style_instructions,
      },
      codexTextOverride: `${brief}\n${transcript}\n${seriesBlock}`,
      seriesContextInput:
        bookFresh.series_id && bookFresh.series_order != null
          ? {
              seriesId: bookFresh.series_id,
              currentBookPosition: bookFresh.series_order,
              userId: user.id,
            }
          : undefined,
      priorChapters: [],
      currentChapterContent: "",
      projectMeta: {
        title: bookFresh.title,
        premise: brief,
      },
      userInstruction: transcript,
    });

    const resolvedPrompt = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "generate-outline",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });
    const systemPrompt = resolvedPrompt.systemPrompt;
    const missingCriticalVars = missingRequiredVariables(
      resolvedPrompt.active.templateText,
      CRITICAL_VARIABLES_BY_TASK["generate-outline"],
    );
    if (missingCriticalVars.length > 0) {
      console.warn("[prompt-template] critical variables missing", {
        taskId: "generate-outline",
        templateSource: resolvedPrompt.active.source,
        templateId: resolvedPrompt.active.id,
        missingVariables: missingCriticalVars,
      });
    }
    const missingVarsHeader = process.env.NODE_ENV !== "production" &&
        missingCriticalVars.length > 0
      ? missingCriticalVars.join(",")
      : null;

    let completionText: string;
    let tokensUsed = 0;
    let modelUsed = "gpt-4o";

    try {
      const completion = await generateWithFailover({
        primary: "openai",
        system: systemPrompt,
        prompt: userContent,
        stream: false,
        responseFormat: "json_object",
        temperature: 0.7,
        maxTokens: 16_384,
        route: "/api/ai/generate-outline",
        userId: user.id,
      });

      tokensUsed =
        completion.input_tokens + completion.output_tokens ||
        Math.ceil((systemPrompt.length + userContent.length) / 4);
      modelUsed = completion.model_used;
      if (!completion.text) {
        await rollbackRefiningStatus();
        return apiJsonError(
          "The model returned an empty outline.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          502,
        );
      }
      completionText = stripJsonFence(completion.text);
    } catch (err: unknown) {
      await rollbackRefiningStatus();
      logServerError("generate-outline.model-router", err);
      return apiJsonError(
        "The outline generator is temporarily unavailable.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const persistOutlineAndChapters = async (sections: OutlineSectionPayload[]) => {
      const sectionsJson = sections as unknown as Json;
      const { data: upserted, error: upsertError } = await supabase
        .from("outlines")
        .upsert(
          {
            book_id: bookId,
            sections: sectionsJson,
            approved: false,
          },
          { onConflict: "book_id" },
        )
        .select("id, sections")
        .single();

      if (upsertError || !upserted) {
        logServerError("generate-outline.upsert", upsertError);
        throw new Error("upsert");
      }

      const { error: deleteChaptersError } = await supabase
        .from("chapters")
        .delete()
        .eq("book_id", bookId);

      if (deleteChaptersError) {
        logServerError("generate-outline.delete-chapters", deleteChaptersError);
        throw new Error("delete-chapters");
      }

      const chapterRows = sections.map((s) => ({
        book_id: bookId,
        chapter_number: s.number,
        title: s.title,
        outline_summary: buildChapterOutlineSummary(s),
        status: "pending" as const,
      }));

      const { error: insertChaptersError } = await supabase.from("chapters").insert(chapterRows);

      if (insertChaptersError) {
        logServerError("generate-outline.insert-chapters", insertChaptersError);
        throw new Error("insert-chapters");
      }

      const { error: bookUpdateError } = await supabase
        .from("books")
        .update({
          status: "outlining",
          chapter_count: sections.length,
        })
        .eq("id", bookId)
        .eq("user_id", user.id);

      if (bookUpdateError) {
        logServerError("generate-outline.book-update", bookUpdateError);
        throw new Error("book-update");
      }
      return upserted;
    };

    const respondSuccess = async (sections: OutlineSectionPayload[], outlineId: string) => {
      await supabase.from("api_usage").insert({
        user_id: user.id,
        route: "/api/ai/generate-outline",
        tokens_used: tokensUsed,
          model: modelUsed,
      });

      if (bookFresh.series_id && bookFresh.series_order != null) {
        const syncPrev = await buildPreviouslyInSeriesText(
          supabase,
          bookFresh.series_id,
          user.id,
          bookFresh.series_order,
          bookId,
        );
        await supabase
          .from("books")
          .update({ previously_in_series: syncPrev || null, updated_at: new Date().toISOString() })
          .eq("id", bookId)
          .eq("user_id", user.id);
      }

      if (bookFresh.series_id) {
        void logSeriesAiGeneration(supabase, {
          userId: user.id,
          seriesId: bookFresh.series_id,
          bookId,
          operation: "outline_generation",
          model: modelUsed,
          context: seriesMeta,
          metadata: {
            tokens_used: tokensUsed,
            chapter_count: sections.length,
          },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          outlineId,
          sections,
        },
        {
          headers: missingVarsHeader
            ? { "X-ChapterAI-Missing-Vars": missingVarsHeader }
            : undefined,
        },
      );
    };

    let sections: OutlineSectionPayload[];

    if (bookType === "non_fiction") {
      const obj = parseJsonObjectLenient(completionText);
      if (obj == null) {
        await rollbackRefiningStatus();
        return apiJsonError(
          "Could not parse outline JSON from the model.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      const zResult = outlineNonFictionResponseSchema.safeParse(obj);
      if (!zResult.success) {
        logServerError("generate-outline.parse-zod", zResult.error);
        await rollbackRefiningStatus();
        return apiJsonError(
          "Could not parse outline from the model.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      sections = normalizeNonFictionSections(zResult.data.chapters);

      if (chapterTarget != null && sections.length !== chapterTarget) {
        await rollbackRefiningStatus();
        return apiJsonError(
          `The outline has ${sections.length} chapters but your brief requests ${chapterTarget}. This often happens when the combined premise is very long. Try generating again, or shorten the premise slightly so the full JSON fits in one response.`,
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }

      let upserted: { id: string };
      try {
        upserted = await persistOutlineAndChapters(sections);
      } catch {
        return apiJsonError("Could not save outline.", ApiErrorCode.INTERNAL, 500);
      }
      return respondSuccess(sections, upserted.id);
    }

    /* Fiction — two-pass (Prompt 17): structural JSON, then inventory batches. */
    {
      const obj = parseJsonObjectLenient(completionText);
      if (obj == null) {
        await rollbackRefiningStatus();
        return apiJsonError(
          "Could not parse outline JSON from the model.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      const coerced = coerceFictionStructuralPayload(obj);
      let parsed = outlineFictionStructuralResponseSchema.safeParse(coerced);
      if (!parsed.success) {
        parsed = outlineFictionStructuralResponseSchema.safeParse(obj);
      }
      if (!parsed.success) {
        logServerError("generate-outline.parse-zod", parsed.error, {
          details: { phase: "fiction-structural" },
        });
        await rollbackRefiningStatus();
        return apiJsonError(
          "Could not parse structural outline from the model.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      sections = normalizeFictionStructuralSections(parsed.data.chapters);
    }

    if (chapterTarget != null && sections.length !== chapterTarget) {
      await rollbackRefiningStatus();
      return apiJsonError(
        `The outline has ${sections.length} chapters but your brief requests ${chapterTarget}. Try generating again or lower the requested chapter count.`,
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const phaseATokens = tokensUsed;
    let upsertedFic: { id: string };
    try {
      upsertedFic = await persistOutlineAndChapters(sections);
    } catch {
      return apiJsonError("Could not save outline.", ApiErrorCode.INTERNAL, 500);
    }

    const { sections: finalSections, totalTokens } = await runFictionOutlineInventoryBatches({
      supabase,
      bookId,
      userId: user.id,
      bookBriefForInventory: userContent,
      initialSections: sections,
      phaseATokens,
      onAfterBatch: async (merged) => {
        await upsertOutlineSections(supabase, bookId, merged, false);
        await syncChapterOutlineSummaries(supabase, bookId, merged);
      },
    });
    tokensUsed = totalTokens;
    sections = finalSections;

    return respondSuccess(sections, upsertedFic.id);
  } catch (e) {
    logServerError("generate-outline", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

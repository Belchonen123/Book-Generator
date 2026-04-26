import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGenerationContext,
  estimateTokens,
} from "@/lib/ai/context-assembler";
import {
  fixtureBook,
  fixtureCodexEntries,
  fixtureCurrentChapter,
  fixturePriorSeriesBook,
  fixtureSeries,
  makeMockSupabase,
  makePriorChapters,
} from "@/lib/ai/__tests__/fixtures/ai-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildGenerationContext", () => {
  it("assembles standalone book context without series, worldbook, or prior chapters", async () => {
    const supabase = makeMockSupabase({
      books: [{ id: fixtureBook.id, series_id: null }],
    });
    const baseSystemPrompt = [
      `Refined idea: ${fixtureBook.refinedIdea}`,
      `Current outline summary: ${fixtureCurrentChapter.outline_summary}`,
    ].join("\n");

    const context = await buildGenerationContext({
      supabase,
      projectId: fixtureBook.id,
      taskType: "chapter-gen",
      baseSystemPrompt,
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
      projectMeta: {
        title: fixtureBook.title,
        genre: fixtureBook.genre,
        premise: fixtureBook.refinedIdea,
      },
      chapterMeta: {
        number: fixtureCurrentChapter.chapter_number,
        title: fixtureCurrentChapter.title,
        beat: fixtureCurrentChapter.outline_summary,
      },
    });

    expect(context.systemPrompt).toContain(fixtureBook.refinedIdea);
    expect(context.systemPrompt).toContain(fixtureCurrentChapter.outline_summary);
    expect(context.systemPrompt).not.toContain("<series");
    expect(context.systemPrompt).not.toContain("<worldbook>");
    expect(context.chapterSummaries).toBe("");
    expect(context.variables["project.premise"]).toBe(fixtureBook.refinedIdea);
    expect(context.variables["chapter.beat"]).toBe(
      fixtureCurrentChapter.outline_summary,
    );
  });

  it("includes only relevant codex entries matched by name or alias in the outline summary", async () => {
    const supabase = makeMockSupabase({
      books: [{ id: fixtureBook.id, series_id: null }],
      codex_entries: fixtureCodexEntries,
    });

    const context = await buildGenerationContext({
      supabase,
      projectId: fixtureBook.id,
      taskType: "chapter-gen",
      baseSystemPrompt: "Base chapter prompt.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
      codexTextOverride: fixtureCurrentChapter.outline_summary,
    });

    expect(context.codexBlock).toContain("<worldbook>");
    expect(context.codexBlock).toContain("Mara Vale");
    expect(context.codexBlock).toContain("Bell Tree");
    expect(context.codexBlock).toContain("Brass Key");
    expect(context.codexBlock).not.toContain("Glass River");
    expect(context.codexBlock).not.toContain("Silent Guild");
    expect(context.codexMatchedEntryIds).toEqual(
      expect.arrayContaining(["codex-mara", "codex-bell-tree", "codex-brass-key"]),
    );
  });

  it("uses summaries, not full prior-chapter text, and trims to the requested token budget", async () => {
    const priorFixtures = makePriorChapters(10);
    const supabase = makeMockSupabase({
      books: [{ id: fixtureBook.id, series_id: null }],
    });

    const context = await buildGenerationContext({
      supabase,
      projectId: fixtureBook.id,
      taskType: "chapter-gen",
      baseSystemPrompt: "Base chapter prompt.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: priorFixtures.map(({ chapterNumber, title, summary }) => ({
        chapterNumber,
        title,
        summary: `${summary} ${"memory clue ".repeat(120)}`,
      })),
      currentChapterContent: "",
      tokenBudget: 500,
    });

    expect(context.chapterSummaries).toContain("Summary only for chapter");
    expect(context.chapterSummaries).not.toContain("FULL TEXT SHOULD NOT APPEAR");
    expect(context.tokensUsed).toBeLessThanOrEqual(context.tokenBudget);
    expect(context.blocksIncluded).toContain("summaries");
    expect(context.blocksTrimmed).toContain("summaries");
    expect(estimateTokens(context.chapterSummaries)).toBeLessThanOrEqual(500);
  });

  it("places series canon before worldbook context and carries a do-not-contradict marker", async () => {
    const supabase = makeMockSupabase({
      series: [fixtureSeries],
      books: [
        fixturePriorSeriesBook,
        {
          id: fixtureBook.id,
          user_id: "user-1",
          series_id: fixtureSeries.id,
          series_order: 2,
          title: fixtureBook.title,
          subtitle: null,
          series_plot_summary: null,
          series_end_state_dossier: null,
          series_summary_generated_at: null,
        },
      ],
      codex_entries: fixtureCodexEntries,
    });

    const context = await buildGenerationContext({
      supabase,
      projectId: fixtureBook.id,
      taskType: "chapter-gen",
      baseSystemPrompt: "Base chapter prompt.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
      codexTextOverride: fixtureCurrentChapter.outline_summary,
      seriesContextInput: {
        seriesId: fixtureSeries.id,
        currentBookPosition: 2,
        userId: "user-1",
      },
    });

    const seriesIndex = context.systemPrompt.indexOf("<series");
    const worldbookIndex = context.systemPrompt.indexOf("<worldbook>");
    expect(seriesIndex).toBeGreaterThanOrEqual(0);
    expect(worldbookIndex).toBeGreaterThan(seriesIndex);
    expect(context.seriesContextBlock).toContain("Do not contradict");
    expect(context.seriesContextBlock).toContain("The First Orchard");
    expect(context.codexBlock).toContain("Bell Tree");
  });

  it("includes partial current chapter content as recent prose for current-chapter continuation", async () => {
    const supabase = makeMockSupabase({
      books: [{ id: fixtureBook.id, series_id: null }],
    });

    const context = await buildGenerationContext({
      supabase,
      projectId: fixtureBook.id,
      taskType: "chapter-assist",
      baseSystemPrompt: "Base assistant prompt.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: fixtureCurrentChapter.content,
    });

    expect(context.recentProse).toContain("glass pears rang softly");
    expect(context.variables.recent_prose).toBe(context.recentProse);
    // TODO: The assembler returns the prose block only. The "Current chapter so far"
    // heading is supplied by templates/routes, not by buildGenerationContext itself.
    expect(context.recentProse).not.toContain("Current chapter so far");
  });

  it("does not throw when the outline beat is empty", async () => {
    const supabase = makeMockSupabase({
      books: [{ id: fixtureBook.id, series_id: null }],
    });

    await expect(
      buildGenerationContext({
        supabase,
        projectId: fixtureBook.id,
        taskType: "expand-outline",
        baseSystemPrompt: "Base outline prompt.",
        styleInput: { style_examples: null, style_instructions: null },
        priorChapters: [],
        currentChapterContent: "",
        chapterMeta: {
          number: 1,
          title: "Empty Beat",
          beat: "",
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        variables: expect.objectContaining({ "chapter.beat": "" }),
      }),
    );
  });

  it("does not throw for a chapter number beyond available outline metadata and currently does not warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const supabase = makeMockSupabase({
      books: [{ id: fixtureBook.id, series_id: null }],
    });

    const context = await buildGenerationContext({
      supabase,
      projectId: fixtureBook.id,
      taskType: "chapter-gen",
      baseSystemPrompt: "Base chapter prompt.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
      chapterMeta: {
        number: 99,
        title: "Past the Outline",
        beat: "",
      },
    });

    expect(context.variables["chapter.number"]).toBe("99");
    // TODO: Desired behavior is to log a warning when route-level outline
    // metadata is out of range. buildGenerationContext has no outline length
    // input today, so current behavior is no warning.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

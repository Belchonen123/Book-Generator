/**
 * Tests for the context-assembler.
 *
 * We stub the Supabase client so the tests never talk to a DB — the
 * assembler's branching for codex lookups tolerates failure (it returns
 * an empty block on error), which is exactly what we want in unit mode:
 * the DB path short-circuits and we can verify the budget/trimming
 * logic in isolation.
 */
import { describe, it, expect, vi } from "vitest";

import {
  buildGenerationContext,
  estimateTokens,
  type PriorChapterSummaryInput,
} from "@/lib/ai/context-assembler";

/* ------------------------------------------------------------------ */
/*   Helpers                                                          */
/* ------------------------------------------------------------------ */

type FakeChain = {
  select: (columns?: string, options?: { count?: "exact"; head?: boolean }) => FakeChain;
  eq: (column: string, value: unknown) => FakeChain;
  neq: (column: string, value: unknown) => FakeChain;
  lt: (column: string, value: number) => FakeChain;
  in: (column: string, values: unknown[]) => FakeChain;
  order: (column: string, options?: { ascending?: boolean }) => FakeChain;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (resolve: (value: { data: unknown; error: null; count?: number | null }) => unknown) => unknown;
};

/**
 * Fake Supabase client with tiny filter support so we can unit-test
 * series-context behavior without a DB.
 */
function makeFakeSupabase(fixtures?: {
  series?: Array<Record<string, unknown>>;
  books?: Array<Record<string, unknown>>;
  series_arcs?: Array<Record<string, unknown>>;
  series_arc_beats?: Array<Record<string, unknown>>;
  codex_entries?: Array<Record<string, unknown>>;
  codex_entry_overlays?: Array<Record<string, unknown>>;
  chapters?: Array<Record<string, unknown>>;
}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    series: fixtures?.series ?? [],
    books: fixtures?.books ?? [],
    series_arcs: fixtures?.series_arcs ?? [],
    series_arc_beats: fixtures?.series_arc_beats ?? [],
    codex_entries: fixtures?.codex_entries ?? [],
    codex_entry_overlays: fixtures?.codex_entry_overlays ?? [],
    chapters: fixtures?.chapters ?? [],
  };

  const buildChain = (table: string): FakeChain => {
    const rows = [...(tables[table] ?? [])];
    let filtered = rows;
    let wantHead = false;
    let wantCount = false;

    const chain: FakeChain = {
      select: (_columns, options) => {
        wantHead = Boolean(options?.head);
        wantCount = options?.count === "exact";
        return chain;
      },
      eq: (column, value) => {
        filtered = filtered.filter((r) => r[column] === value);
        return chain;
      },
      neq: (column, value) => {
        filtered = filtered.filter((r) => r[column] !== value);
        return chain;
      },
      lt: (column, value) => {
        filtered = filtered.filter((r) => {
          const v = r[column];
          return typeof v === "number" && v < value;
        });
        return chain;
      },
      in: (column, values) => {
        const set = new Set(values);
        filtered = filtered.filter((r) => set.has(r[column]));
        return chain;
      },
      order: (column, options) => {
        const ascending = options?.ascending !== false;
        filtered = [...filtered].sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (typeof av === "number" && typeof bv === "number") {
            return ascending ? av - bv : bv - av;
          }
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          return ascending ? as.localeCompare(bs) : bs.localeCompare(as);
        });
        return chain;
      },
      maybeSingle: () =>
        Promise.resolve({ data: filtered[0] ?? null, error: null }),
      then: (resolve) =>
        resolve({
          data: (wantHead ? null : filtered) as unknown,
          error: null,
          count: wantCount ? filtered.length : null,
        }),
    };
    return chain;
  };

  return {
    from: (table: string) => buildChain(table),
  };
}

function makeWords(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

/* ------------------------------------------------------------------ */
/*   estimateTokens                                                   */
/* ------------------------------------------------------------------ */

describe("estimateTokens", () => {
  it("treats empty strings as zero tokens", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("uses the 4-chars-per-token heuristic, min 1", () => {
    expect(estimateTokens("a")).toBe(1);
    expect(estimateTokens("a".repeat(4))).toBe(1);
    expect(estimateTokens("a".repeat(8))).toBe(2);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/*   buildGenerationContext — budgeting                               */
/* ------------------------------------------------------------------ */

describe("buildGenerationContext", () => {
  it("emits an observability log tagged with taskType", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const supabase = makeFakeSupabase();
    await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "You are a writer.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
    });
    expect(spy).toHaveBeenCalledWith(
      "[context-assembler]",
      expect.objectContaining({ taskType: "chapter-gen", projectId: "proj-1" }),
    );
    spy.mockRestore();
  });

  it("returns just the base system prompt when nothing else is supplied", async () => {
    const supabase = makeFakeSupabase();
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "You are a writer.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
    });
    expect(ctx.systemPrompt).toBe("You are a writer.");
    expect(ctx.styleBlock).toBe("");
    expect(ctx.codexBlock).toBe("");
    expect(ctx.chapterSummaries).toBe("");
    expect(ctx.recentProse).toBe("");
    expect(ctx.blocksIncluded).toEqual(["system"]);
    expect(ctx.blocksTrimmed).toEqual([]);
  });

  it("attaches the style block when style_examples is present", async () => {
    const supabase = makeFakeSupabase();
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "Base.",
      styleInput: {
        style_examples: "Short paragraph of sample prose.",
        style_instructions: null,
      },
      priorChapters: [],
      currentChapterContent: "",
    });
    expect(ctx.styleBlock).toContain("<style_examples>");
    expect(ctx.systemPrompt).toContain("Short paragraph of sample prose.");
    expect(ctx.blocksIncluded).toContain("style");
  });

  it("truncates oversized style examples and flags the trim", async () => {
    const supabase = makeFakeSupabase();
    /* 5,000 words at ~5 chars/word ≈ 25k chars → ~6,250 tokens. The
     * style block cap is 1,500 tokens, so this must trigger the
     * truncation branch. */
    const oversized = makeWords(5_000);
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "Base.",
      styleInput: {
        style_examples: oversized,
        style_instructions: null,
      },
      priorChapters: [],
      currentChapterContent: "",
    });
    expect(ctx.blocksTrimmed).toContain("style");
    expect(estimateTokens(ctx.styleBlock)).toBeLessThanOrEqual(1_600);
    /* Final block still has to start with the style-examples tag so the
     * model can still see it's a voice anchor. */
    expect(ctx.styleBlock).toContain("<style_examples>");
  });

  it("renders prior chapter summaries in chronological order", async () => {
    const supabase = makeFakeSupabase();
    const priors: PriorChapterSummaryInput[] = [
      { chapterNumber: 2, title: "Rising", summary: "The storm breaks." },
      { chapterNumber: 1, title: "Opening", summary: "A knock at the door." },
      { chapterNumber: 3, title: "Climax", summary: "The roof collapses." },
    ];
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "Base.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: priors,
      currentChapterContent: "",
    });
    const idx1 = ctx.chapterSummaries.indexOf("Chapter 1");
    const idx2 = ctx.chapterSummaries.indexOf("Chapter 2");
    const idx3 = ctx.chapterSummaries.indexOf("Chapter 3");
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThan(idx1);
    expect(idx3).toBeGreaterThan(idx2);
    expect(ctx.blocksIncluded).toContain("summaries");
  });

  it("drops oldest summaries first when the summary budget is tight", async () => {
    const supabase = makeFakeSupabase();
    /* Each summary ≈ 1,000 tokens → 4 of them ≈ 4,000 tokens. The
     * summary budget is 2,500 tokens, so at least one should drop, and
     * the OLDEST (chapter 1) should be the first to go. */
    const heavySummary = makeWords(800);
    const priors: PriorChapterSummaryInput[] = [1, 2, 3, 4].map((n) => ({
      chapterNumber: n,
      title: `Chapter ${n}`,
      summary: heavySummary,
    }));
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "Base.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: priors,
      currentChapterContent: "",
    });
    expect(ctx.blocksTrimmed).toContain("summaries");
    /* The newest chapter (4) should survive. */
    expect(ctx.chapterSummaries).toContain("Chapter 4");
  });

  it("keeps the TAIL of recent prose and caps at ~1,500 words", async () => {
    const supabase = makeFakeSupabase();
    const prose = makeWords(3_000);
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "inline-command",
      baseSystemPrompt: "Base.",
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      precedingProse: prose,
      currentChapterContent: "",
    });
    expect(ctx.recentProse).toContain("word2999");
    expect(ctx.recentProse).not.toContain("word0 ");
    const recentWords = ctx.recentProse
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    expect(recentWords).toBeLessThanOrEqual(1_500);
    expect(ctx.blocksIncluded).toContain("recentProse");
  });

  it("drops recent prose FIRST when the total budget overflows", async () => {
    const supabase = makeFakeSupabase();
    /* Tight overall budget forces the assembler to shed something. Per
     * the priority ladder, recentProse is the lowest-priority block. */
    const prose = makeWords(2_000);
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "inline-command",
      baseSystemPrompt: "Base.".repeat(500),
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      precedingProse: prose,
      currentChapterContent: "",
      tokenBudget: 800,
    });
    expect(ctx.blocksTrimmed).toContain("recentProse");
    expect(ctx.recentProse).toBe("");
  });

  it("appends systemSuffixAfterStyle between the style block and codex", async () => {
    const supabase = makeFakeSupabase();
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "BASE.",
      styleInput: {
        style_examples: "A voice sample.",
        style_instructions: null,
      },
      systemSuffixAfterStyle: "\n\n## Series continuity\nSeries canon text.",
      priorChapters: [],
      currentChapterContent: "",
    });
    const basePos = ctx.systemPrompt.indexOf("BASE.");
    const stylePos = ctx.systemPrompt.indexOf("A voice sample.");
    const seriesPos = ctx.systemPrompt.indexOf("Series canon text.");
    expect(basePos).toBeGreaterThanOrEqual(0);
    expect(stylePos).toBeGreaterThan(basePos);
    expect(seriesPos).toBeGreaterThan(stylePos);
  });

  it("populates series_continuity variable from seriesContinuityText", async () => {
    const supabase = makeFakeSupabase();
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: "Base.",
      styleInput: { style_examples: null, style_instructions: null },
      seriesContinuityText: "Series paragraph continuity text.",
      priorChapters: [],
      currentChapterContent: "",
    });
    expect(ctx.variables.series_continuity).toContain(
      "Series paragraph continuity text.",
    );
  });

  it("populates series_context for all series-aware route task types", async () => {
    const taskTypes = [
      "chat",
      "chapter-assist",
      "expand-outline",
      "inline-command",
      "refine-idea",
      "scene-beat",
    ] as const;

    for (const taskType of taskTypes) {
      const supabase = makeFakeSupabase({
        series: [
          {
            id: "series-1",
            user_id: "user-1",
            name: "Saga",
            description: "Shared world stakes across books.",
            tagline: "A long war",
            genre: "Fantasy",
          },
        ],
        books: [
          {
            id: "book-0",
            user_id: "user-1",
            series_id: "series-1",
            series_order: 1,
            title: "Book Zero",
            subtitle: null,
            series_plot_summary: "Book one summary.",
            series_end_state_dossier: "Book one end state.",
            series_summary_generated_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "book-1",
            user_id: "user-1",
            series_id: "series-1",
            series_order: 2,
            title: "Book One",
            subtitle: null,
            series_plot_summary: null,
            series_end_state_dossier: null,
            series_summary_generated_at: null,
          },
        ],
      });

      const ctx = await buildGenerationContext({
        // @ts-expect-error fake client
        supabase,
        projectId: "book-1",
        currentChapterId: "chapter-1",
        taskType,
        baseSystemPrompt: "Base.",
        styleInput: { style_examples: null, style_instructions: null },
        seriesContextInput: {
          seriesId: "series-1",
          currentBookPosition: 2,
          userId: "user-1",
        },
        priorChapters: [],
        currentChapterContent: "",
      });

      expect(ctx.variables.series_context.trim().length).toBeGreaterThan(0);
    }
  });

  it("reports budget utilization as a fraction of tokenBudget", async () => {
    const supabase = makeFakeSupabase();
    const ctx = await buildGenerationContext({
      // @ts-expect-error fake client
      supabase,
      projectId: "proj-1",
      taskType: "chapter-gen",
      baseSystemPrompt: makeWords(400),
      styleInput: { style_examples: null, style_instructions: null },
      priorChapters: [],
      currentChapterContent: "",
      tokenBudget: 10_000,
    });
    expect(ctx.tokenBudget).toBe(10_000);
    expect(ctx.budgetUtilization).toBeGreaterThan(0);
    expect(ctx.budgetUtilization).toBeLessThan(1);
  });
});

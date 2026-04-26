/**
 * Prompt 16 § 408-421 (TESTING scenarios #3-#6): the series continuity
 * builder must:
 *   #3-#4. Surface a progression logged in Book 1 Ch 5 when generating a
 *          chapter in Book 2 (it appears in the "Established events from
 *          prior books" block).
 *   #5-#6. When a per-book overlay exists (Faiga is 9 in Book 1, overlaid
 *          to age 12 in Book 2), the overlay wins in the Book-2 codex
 *          block.
 *
 * The builder hits seven different tables, so we stub Supabase with a
 * table-dispatching fake that returns fixture rows per `.from(table)`.
 */
import { describe, it, expect } from "vitest";

import { buildSeriesContinuityForChapterPrompt } from "@/lib/series/continuity";

/* ------------------------------------------------------------------ */
/*  Fixture helpers                                                    */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

/**
 * Minimal fake query builder: satisfies `.select().eq().in().order()`
 * chains plus terminals `.single()`, `.maybeSingle()`, `.limit()`,
 * then awaits to a supabase-shaped `{ data, error }`.
 *
 * The fake IGNORES filters (continuity code already runs against
 * pre-filtered fixture rows supplied per-table). That keeps the fake
 * small while preserving the call shape the production code uses.
 */
function makeQuery(rows: Row[]) {
  const api: {
    select: () => typeof api;
    eq: () => typeof api;
    in: () => typeof api;
    order: () => typeof api;
    limit: () => typeof api;
    single: () => Promise<{ data: Row | null; error: null }>;
    maybeSingle: () => Promise<{ data: Row | null; error: null }>;
    then: (
      resolve: (value: { data: Row[]; error: null }) => unknown,
    ) => unknown;
  } = {
    select: () => api,
    eq: () => api,
    in: () => api,
    order: () => api,
    limit: () => api,
    single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    maybeSingle: () =>
      Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (resolve) => resolve({ data: rows, error: null }),
  };
  return api;
}

function makeFakeSupabase(tables: Record<string, Row[]>) {
  return {
    from: (name: string) => makeQuery(tables[name] ?? []),
  };
}

/* ------------------------------------------------------------------ */
/*  Scenarios #3-#4: prior-book progression surfaces in Book 2 prompt  */
/* ------------------------------------------------------------------ */

describe("buildSeriesContinuityForChapterPrompt — prior-book progressions", () => {
  it("includes a Book-1 progression in the Book-2 continuity text and meta", async () => {
    const BOOK_1 = "11111111-1111-1111-1111-111111111111";
    const BOOK_2 = "22222222-2222-2222-2222-222222222222";
    const SERIES = "ssssssss-ssss-ssss-ssss-ssssssssssss";
    const FAIGA = "ffffffff-ffff-ffff-ffff-ffffffffffff";

    const supabase = makeFakeSupabase({
      /* The builder hits books twice: first for the CURRENT book, then
       * for the series siblings list. Returning the full sibling set
       * works for both because `.eq()` is a noop in the fake and the
       * first row is used by `.single()` / `.maybeSingle()`. */
      books: [
        {
          id: BOOK_2,
          series_id: SERIES,
          series_order: 2,
          title: "Book Two",
          refined_idea: { core_premise: "Book 2 premise." },
        },
        {
          id: BOOK_1,
          series_id: SERIES,
          series_order: 1,
          title: "Book One",
          refined_idea: { core_premise: "Book 1 premise." },
        },
      ],
      series: [
        {
          id: SERIES,
          name: "The Saga",
          shared_world_notes: null,
          shared_character_bible: null,
        },
      ],
      chapters: [
        /* `lastChapterExcerpt` pulls the final chapter of Book 1. */
        { content: "The closing words of Book One." },
      ],
      codex_entries: [
        {
          id: FAIGA,
          entry_type: "character",
          name: "Faiga",
          aliases: [],
          summary: "A young girl.",
          description_md: null,
          scope: "series",
          custom_fields: {},
        },
      ],
      codex_entry_overlays: [],
      codex_progressions: [
        {
          codex_entry_id: FAIGA,
          book_id: BOOK_1,
          event_type: "loss",
          description: "Faiga loses her siddur at the market.",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      series_arcs: [],
      series_arc_beats: [],
    });

    const result = await buildSeriesContinuityForChapterPrompt(
      // @ts-expect-error fake client
      supabase,
      BOOK_2,
      "user-1",
    );

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.text).toContain(
      "Faiga loses her siddur at the market.",
    );
    /* Canonical series codex section should appear regardless. */
    expect(result.text).toContain("Series codex");
    /* The established-events header confirms the progression-block
     * branch actually fired. */
    expect(result.text).toContain(
      "Established events from prior books",
    );

    expect(result.meta.priorBooksCount).toBeGreaterThan(0);
    expect(result.meta.progressionsCount).toBe(1);
    expect(result.meta.codexEntryIds).toContain(FAIGA);
    expect(result.meta.blocksUsed.progressions).toBe(true);
    expect(result.meta.blocksUsed.series_codex).toBe(true);
  });

  it("returns null for books that aren't in a series", async () => {
    const supabase = makeFakeSupabase({
      books: [
        {
          id: "book-1",
          series_id: null,
          series_order: null,
          title: "Standalone",
          refined_idea: null,
        },
      ],
    });
    const result = await buildSeriesContinuityForChapterPrompt(
      // @ts-expect-error fake client
      supabase,
      "book-1",
      "user-1",
    );
    expect(result).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Scenarios #5-#6: per-book overlay wins over canonical entry        */
/* ------------------------------------------------------------------ */

describe("buildSeriesContinuityForChapterPrompt — overlay precedence", () => {
  it("shows the Book-2 overlay description (age 12) instead of canonical (age 9)", async () => {
    const BOOK_1 = "11111111-1111-1111-1111-111111111111";
    const BOOK_2 = "22222222-2222-2222-2222-222222222222";
    const SERIES = "ssssssss-ssss-ssss-ssss-ssssssssssss";
    const FAIGA = "ffffffff-ffff-ffff-ffff-ffffffffffff";

    const supabase = makeFakeSupabase({
      books: [
        {
          id: BOOK_2,
          series_id: SERIES,
          series_order: 2,
          title: "Book Two",
          refined_idea: null,
        },
        {
          id: BOOK_1,
          series_id: SERIES,
          series_order: 1,
          title: "Book One",
          refined_idea: null,
        },
      ],
      series: [
        {
          id: SERIES,
          name: "The Saga",
          shared_world_notes: null,
          shared_character_bible: null,
        },
      ],
      chapters: [{ content: "Closing line." }],
      codex_entries: [
        {
          id: FAIGA,
          entry_type: "character",
          name: "Faiga",
          aliases: [],
          summary: null,
          description_md: "Faiga is 9 years old and carries her mother's siddur.",
          scope: "series",
          custom_fields: {},
        },
      ],
      codex_entry_overlays: [
        {
          codex_entry_id: FAIGA,
          description_override:
            "Faiga is 12 years old and has inherited her grandmother's shawl.",
          field_overrides: {},
        },
      ],
      codex_progressions: [],
      series_arcs: [],
      series_arc_beats: [],
    });

    const result = await buildSeriesContinuityForChapterPrompt(
      // @ts-expect-error fake client
      supabase,
      BOOK_2,
      "user-1",
    );

    expect(result).not.toBeNull();
    if (!result) return;

    /* The overlay's description_override must win; the canonical
     * "age 9" copy must be absent from the Book-2 prompt so the
     * model never sees the stale age. */
    expect(result.text).toContain("12 years old");
    expect(result.text).not.toContain("9 years old");
    /* And the "per-book variation applies" marker should be rendered
     * so the model knows this isn't the canonical line. */
    expect(result.text).toContain("per-book variation applies");
  });
});

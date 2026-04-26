import { describe, expect, it } from "vitest";

import { buildCodexBlock } from "@/lib/ai/codex-context";

type FakeChain = {
  select: (columns?: string, options?: { count?: "exact"; head?: boolean }) => FakeChain;
  eq: (column: string, value: unknown) => FakeChain;
  neq: (column: string, value: unknown) => FakeChain;
  in: (column: string, values: unknown[]) => FakeChain;
  order: (column: string, options?: { ascending?: boolean }) => FakeChain;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (
    resolve: (value: { data: unknown; error: null; count?: number | null }) => unknown,
  ) => unknown;
};

function makeFakeSupabase(fixtures: Record<string, Array<Record<string, unknown>>>) {
  const buildChain = (table: string): FakeChain => {
    const rows = [...(fixtures[table] ?? [])];
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
      maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
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

describe("buildCodexBlock", () => {
  it("includes shared-scope entries in worldbook output", async () => {
    const supabase = makeFakeSupabase({
      books: [
        {
          id: "book-1",
          series_id: "series-1",
          title: "Book One",
          series_order: 2,
        },
      ],
      codex_entries: [
        {
          id: "shared-1",
          scope: "shared",
          book_id: null,
          series_id: null,
          entry_type: "lore",
          name: "The Oath",
          aliases: [],
          description_md: "A binding oath recognized across worlds.",
          summary: "Cross-series oath rule",
          custom_fields: {},
          ai_scope: "always",
        },
      ],
      codex_entry_overlays: [],
      codex_progressions: [],
      chapters: [],
    });

    const result = await buildCodexBlock(
      // @ts-expect-error fake client
      supabase,
      "book-1",
      "The chapter references the oath by name.",
    );

    expect(result.block).toContain("<worldbook>");
    expect(result.block).toContain("The Oath");
  });

  it("reports matched entry metadata for on_match entries", async () => {
    const supabase = makeFakeSupabase({
      books: [{ id: "book-1", series_id: null, title: "Book One", series_order: null }],
      codex_entries: [
        {
          id: "character-1",
          scope: "project",
          book_id: "book-1",
          series_id: null,
          entry_type: "character",
          name: "Ben",
          aliases: ["Benjamin"],
          description_md: "An elder mentor.",
          summary: "Mentor archetype",
          custom_fields: {},
          ai_scope: "on_match",
        },
      ],
      codex_entry_overlays: [],
      codex_progressions: [],
      chapters: [],
    });

    const result = await buildCodexBlock(
      // @ts-expect-error fake client
      supabase,
      "book-1",
      "Ben walks into the room.",
    );

    expect(result.matchedEntryCount).toBe(1);
    expect(result.matchedEntryIds).toEqual(["character-1"]);
    expect(result.entriesIncluded).toEqual(["character-1"]);
    expect(result.block).toContain("Ben");
  });

  it("force-includes entries even when ai_scope is never", async () => {
    const supabase = makeFakeSupabase({
      books: [{ id: "book-1", series_id: null, title: "Book One", series_order: null }],
      codex_entries: [
        {
          id: "lore-1",
          scope: "project",
          book_id: "book-1",
          series_id: null,
          entry_type: "lore",
          name: "Hidden Protocol",
          aliases: [],
          description_md: "Secret rule text.",
          summary: "Never auto-include unless forced",
          custom_fields: {},
          ai_scope: "never",
        },
      ],
      codex_entry_overlays: [],
      codex_progressions: [],
      chapters: [],
    });

    const result = await buildCodexBlock(
      // @ts-expect-error fake client
      supabase,
      "book-1",
      "No explicit mention here.",
      { forceIncludeEntryIds: ["lore-1"] },
    );

    expect(result.matchedEntryCount).toBe(0);
    expect(result.entriesIncluded).toEqual(["lore-1"]);
    expect(result.block).toContain("Hidden Protocol");
  });
});


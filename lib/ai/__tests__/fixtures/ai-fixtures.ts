import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type FixtureRow = Record<string, unknown>;

type FixtureTables = Partial<Record<string, FixtureRow[]>>;

type QueryResult = {
  data: unknown;
  error: null;
  count?: number | null;
};

type QueryChain = PromiseLike<QueryResult> & {
  select: (columns?: string, options?: { count?: "exact"; head?: boolean }) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  neq: (column: string, value: unknown) => QueryChain;
  lt: (column: string, value: number) => QueryChain;
  in: (column: string, values: readonly unknown[]) => QueryChain;
  order: (column: string, options?: { ascending?: boolean }) => QueryChain;
  maybeSingle: <T = FixtureRow>() => Promise<{ data: T | null; error: null }>;
  single: <T = FixtureRow>() => Promise<{ data: T | null; error: null }>;
};

export const fixtureBook = {
  id: "book-main",
  user_id: "user-1",
  title: "The Glass Orchard",
  genre: "Literary fantasy",
  pov: "Close third",
  tense: "Past",
  refinedIdea:
    "A grieving orchardist discovers every glass fruit preserves one memory the town has agreed to forget.",
};

export const fixtureCurrentChapter = {
  id: "chapter-3",
  book_id: fixtureBook.id,
  chapter_number: 3,
  title: "The Bell Tree",
  outline_summary:
    "Mara follows the Bell Tree's chime into the abandoned conservatory and finds Lio's brass key.",
  content:
    "Mara had already learned not to trust the orchard at dusk. The glass pears rang softly above her.",
};

export const fixtureCodexEntries = [
  {
    id: "codex-mara",
    book_id: fixtureBook.id,
    scope: "project",
    entry_type: "character",
    name: "Mara Vale",
    aliases: ["Mara", "the orchardist"],
    summary: "Keeper of the glass orchard.",
    description_md: "Mara tends the trees and remembers what everyone else pays to forget.",
    custom_fields: { signature_object: "pruning knife" },
    ai_scope: "on_match",
  },
  {
    id: "codex-bell-tree",
    book_id: fixtureBook.id,
    scope: "project",
    entry_type: "lore",
    name: "Bell Tree",
    aliases: ["chiming tree"],
    summary: "A glass tree that rings when a hidden memory is near.",
    description_md: "The Bell Tree only sounds for memories that want to be found.",
    custom_fields: { rule: "rings at dusk" },
    ai_scope: "on_match",
  },
  {
    id: "codex-brass-key",
    book_id: fixtureBook.id,
    scope: "project",
    entry_type: "object",
    name: "Brass Key",
    aliases: ["Lio's key"],
    summary: "A key Lio left behind.",
    description_md: "It opens the conservatory cabinet and nothing else.",
    custom_fields: {},
    ai_scope: "on_match",
  },
  {
    id: "codex-glass-river",
    book_id: fixtureBook.id,
    scope: "project",
    entry_type: "location",
    name: "Glass River",
    aliases: ["river"],
    summary: "A place not referenced by the target chapter.",
    description_md: "The river runs under the western wall.",
    custom_fields: {},
    ai_scope: "on_match",
  },
  {
    id: "codex-never",
    book_id: fixtureBook.id,
    scope: "project",
    entry_type: "faction",
    name: "Silent Guild",
    aliases: ["guild"],
    summary: "Should never be injected automatically.",
    description_md: "A guild that buys memories.",
    custom_fields: {},
    ai_scope: "never",
  },
];

export const fixtureSeries = {
  id: "series-1",
  user_id: "user-1",
  name: "Orchard Cycle",
  tagline: "Memory has roots",
  genre: "Literary fantasy",
  description:
    "Series canon: the glass orchards preserve memory at a cost. Do not contradict established book-end states.",
};

export const fixturePriorSeriesBook = {
  id: "book-prior",
  user_id: "user-1",
  series_id: fixtureSeries.id,
  series_order: 1,
  title: "The First Orchard",
  subtitle: null,
  series_plot_summary:
    "Mara inherited the orchard and learned that every harvested fruit erases one public memory.",
  series_end_state_dossier:
    "Mara knows the orchard is older than the town. Lio vanished with the brass key.",
  series_summary_generated_at: "2026-01-01T00:00:00Z",
};

export function makePriorChapters(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const chapterNumber = index + 1;
    return {
      chapterNumber,
      title: `Prior Chapter ${chapterNumber}`,
      summary: `Summary only for chapter ${chapterNumber}: Mara learns clue ${chapterNumber}.`,
      fullText: `FULL TEXT SHOULD NOT APPEAR ${chapterNumber} `.repeat(50),
    };
  });
}

export function makeMockSupabase(tables: FixtureTables = {}) {
  const tableRows: Record<string, FixtureRow[]> = {
    books: [],
    chapters: [],
    codex_entries: [],
    codex_entry_overlays: [],
    codex_progressions: [],
    prompt_templates: [],
    series: [],
    series_arcs: [],
    series_arc_beats: [],
    ...tables,
  };

  const makeChain = (table: string): QueryChain => {
    let filtered = [...(tableRows[table] ?? [])];
    let head = false;
    let exactCount = false;

    const chain: QueryChain = {
      select: (_columns, options) => {
        head = Boolean(options?.head);
        exactCount = options?.count === "exact";
        return chain;
      },
      eq: (column, value) => {
        filtered = filtered.filter((row) => row[column] === value);
        return chain;
      },
      neq: (column, value) => {
        filtered = filtered.filter((row) => row[column] !== value);
        return chain;
      },
      lt: (column, value) => {
        filtered = filtered.filter((row) => {
          const rowValue = row[column];
          return typeof rowValue === "number" && rowValue < value;
        });
        return chain;
      },
      in: (column, values) => {
        const valueSet = new Set(values);
        filtered = filtered.filter((row) => valueSet.has(row[column]));
        return chain;
      },
      order: (column, options) => {
        const ascending = options?.ascending !== false;
        filtered = [...filtered].sort((left, right) => {
          const a = left[column];
          const b = right[column];
          if (typeof a === "number" && typeof b === "number") {
            return ascending ? a - b : b - a;
          }
          const as = String(a ?? "");
          const bs = String(b ?? "");
          return ascending ? as.localeCompare(bs) : bs.localeCompare(as);
        });
        return chain;
      },
      maybeSingle: async <T = FixtureRow>() => ({
        data: (filtered[0] ?? null) as T | null,
        error: null,
      }),
      single: async <T = FixtureRow>() => ({
        data: (filtered[0] ?? null) as T | null,
        error: null,
      }),
      then: (resolve, reject) =>
        Promise.resolve({
          data: head ? null : filtered,
          error: null,
          count: exactCount ? filtered.length : null,
        }).then(resolve, reject),
    };

    return chain;
  };

  return {
    from: (table: string) => makeChain(table),
  } as unknown as SupabaseClient<Database>;
}

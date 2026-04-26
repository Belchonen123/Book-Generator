import { describe, expect, it, vi } from "vitest";

const createCompletionMock = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  getOpenAI: () => ({
    chat: {
      completions: {
        create: createCompletionMock,
      },
    },
  }),
}));

import { runFictionOutlineInventoryBatches } from "@/lib/outline/generate-outline-two-pass";
import type { OutlineSectionPayload } from "@/lib/outline/section-payload";

type FakeChain = {
  select: (columns?: string, options?: { count?: "exact"; head?: boolean }) => FakeChain;
  eq: (column: string, value: unknown) => FakeChain;
  neq: (column: string, value: unknown) => FakeChain;
  lt: (column: string, value: number) => FakeChain;
  in: (column: string, values: unknown[]) => FakeChain;
  order: (column: string, options?: { ascending?: boolean }) => FakeChain;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (
    resolve: (value: { data: unknown; error: null; count?: number | null }) => unknown,
  ) => unknown;
};

function makeFakeSupabase(fixtures?: Record<string, Array<Record<string, unknown>>>) {
  const tables = fixtures ?? {};
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
          return String(av ?? "").localeCompare(String(bv ?? ""));
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

describe("runFictionOutlineInventoryBatches", () => {
  it("injects worldbook block into Phase B user prompt when codex exists", async () => {
    createCompletionMock.mockResolvedValue({
      usage: { total_tokens: 111 },
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              enrichments: [
                {
                  number: 1,
                  book_canon_digest: "Canon digest.",
                  story_bible_anchors: "Anchors.",
                  every_character_in_this_chapter: "Ari — lead investigator.",
                  every_location_and_time: "City center — night.",
                  every_prop_object_and_key_detail: "Badge — Ari carries it.",
                  every_concept_term_and_rule: "Case Protocol — investigation rule.",
                  mandatory_beats_checklist: "1) Ari arrives.",
                  character_state: "Ari is determined.",
                  continuity_from_prior_chapters: "Chapter one opens the sequence.",
                  stakes_and_costs: "If Ari fails, the case collapses.",
                  motifs_and_restraint: "Echo rain imagery.",
                  reader_takeaway: "The mystery has a personal cost.",
                  forced_codex_entry_ids: ["codex-1"],
                },
              ],
            }),
          },
        },
      ],
    });

    const supabase = makeFakeSupabase({
      books: [
        {
          id: "book-1",
          user_id: "user-1",
          series_id: null,
          series_order: null,
        },
      ],
      codex_entries: [
        {
          id: "codex-1",
          book_id: "book-1",
          scope: "project",
          ai_scope: "always",
          entry_type: "character",
          name: "Ari",
          aliases: [],
          description_md: "Ari is the lead investigator.",
          summary: "Lead investigator",
          custom_fields: {},
        },
      ],
    });

    const sections: OutlineSectionPayload[] = [
      {
        number: 1,
        title: "Chapter 1",
        description: "Ari arrives in the city.",
      },
    ];

    await runFictionOutlineInventoryBatches({
      // @ts-expect-error test fake
      supabase,
      bookId: "book-1",
      userId: "user-1",
      bookBriefForInventory: "A city mystery led by Ari.",
      initialSections: sections,
      phaseATokens: 0,
      onAfterBatch: async () => {},
    });

    expect(createCompletionMock).toHaveBeenCalled();
    const call = createCompletionMock.mock.calls[0]?.[0];
    const userMessage = call?.messages?.find((m: { role: string }) => m.role === "user")
      ?.content;
    expect(typeof userMessage).toBe("string");
    expect(userMessage).toContain("## Worldbook (characters, locations, lore — canonical)");
    expect(userMessage).toContain("<worldbook>");
  });
});


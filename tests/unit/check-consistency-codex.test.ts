import { describe, expect, it, vi } from "vitest";

const {
  anthropicMessagesCreateNonStreamingMock,
  buildCodexBlockMock,
} = vi.hoisted(() => ({
  anthropicMessagesCreateNonStreamingMock: vi.fn(),
  buildCodexBlockMock: vi.fn(),
}));

vi.mock("@/lib/anthropic/message-attempts", () => ({
  anthropicMessagesCreateNonStreaming: anthropicMessagesCreateNonStreamingMock,
}));
vi.mock("@/lib/anthropic/text-model", () => ({
  anthropicTextModelsToTry: () => ["claude-sonnet"],
}));
vi.mock("@/lib/ai/codex-context", () => ({
  buildCodexBlock: buildCodexBlockMock,
}));
vi.mock("@/lib/api/book-access", () => ({
  requireBookOwnedByUser: async () => null,
}));
vi.mock("@/lib/utils/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, resetAt: null }),
}));
vi.mock("@/lib/utils/analytics", () => ({
  trackEvent: async () => {},
}));

type FakeChain = {
  select: () => FakeChain;
  eq: (column: string, value: unknown) => FakeChain;
  lt: (column: string, value: number) => FakeChain;
  order: (column: string, options?: { ascending?: boolean }) => FakeChain;
  single: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  then: (
    resolve: (value: { data: Array<Record<string, unknown>> | null; error: null }) => unknown,
  ) => unknown;
};

function makeFakeSupabase(fixtures: Record<string, Array<Record<string, unknown>>>) {
  const buildChain = (table: string): FakeChain => {
    let rows = [...(fixtures[table] ?? [])];
    const chain: FakeChain = {
      select: () => chain,
      eq: (column, value) => {
        rows = rows.filter((r) => r[column] === value);
        return chain;
      },
      lt: (column, value) => {
        rows = rows.filter((r) => {
          const v = r[column];
          return typeof v === "number" && v < value;
        });
        return chain;
      },
      order: (column, options) => {
        const ascending = options?.ascending !== false;
        rows = [...rows].sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (typeof av === "number" && typeof bv === "number") {
            return ascending ? av - bv : bv - av;
          }
          return String(av ?? "").localeCompare(String(bv ?? ""));
        });
        return chain;
      },
      single: async () => ({ data: rows[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve) => resolve({ data: rows, error: null }),
    };
    return chain;
  };

  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: "11111111-1111-1111-1111-111111111111" } },
        error: null,
      }),
    },
    from: (table: string) => buildChain(table),
  };
}

const fakeSupabase = makeFakeSupabase({
  profiles: [{ id: "11111111-1111-1111-1111-111111111111", subscription_tier: "pro" }],
  books: [
    {
      id: "22222222-2222-2222-2222-222222222222",
      user_id: "11111111-1111-1111-1111-111111111111",
      title: "Book",
      book_type: "fiction",
      character_bible: {},
      genre: "Fantasy",
      tone: "Dark",
      refined_idea: null,
      series_id: null,
    },
  ],
  chapters: [
    {
      id: "33333333-3333-3333-3333-333333333333",
      book_id: "22222222-2222-2222-2222-222222222222",
      title: "Chapter One",
      chapter_number: 1,
      content: "Aria enters the archive and finds the oath tablet.",
      outline_summary: "Aria discovers a canon object.",
    },
  ],
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fakeSupabase,
}));

import { POST } from "@/app/api/ai/check-consistency/route";

describe("check-consistency codex injection", () => {
  it("includes codex description text in Anthropic user block", async () => {
    buildCodexBlockMock.mockResolvedValue({
      block:
        '<worldbook><entry type="character" name="Aria">Arias canon description text.</entry></worldbook>',
      entriesIncluded: ["codex-1"],
      entriesTrimmed: [],
      tokensUsed: 42,
    });
    anthropicMessagesCreateNonStreamingMock.mockResolvedValue({
      message: {
        content: [
          {
            type: "text",
            text: '{"issues":[],"summary":"No continuity issues found in this pass."}',
          },
        ],
      },
    });

    const request = new Request("http://localhost/api/ai/check-consistency", {
      method: "POST",
      body: JSON.stringify({
        bookId: "22222222-2222-2222-2222-222222222222",
        chapterId: "33333333-3333-3333-3333-333333333333",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const payload = anthropicMessagesCreateNonStreamingMock.mock.calls[0]?.[0] as
      | { messages?: Array<{ role: string; content: string }> }
      | undefined;
    const userBlock = payload?.messages?.find((m) => m.role === "user")?.content ?? "";
    expect(userBlock).toContain("Arias canon description text.");
  });
});


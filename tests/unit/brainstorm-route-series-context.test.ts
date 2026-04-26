import { describe, expect, it, vi } from "vitest";

const {
  buildCodexBlockMock,
  buildSeriesContextBlockMock,
  createCompletionMock,
} = vi.hoisted(() => ({
  buildCodexBlockMock: vi.fn(),
  buildSeriesContextBlockMock: vi.fn(),
  createCompletionMock: vi.fn(),
}));

vi.mock("@/lib/ai/codex-context", () => ({
  buildCodexBlock: buildCodexBlockMock,
}));
vi.mock("@/lib/ai/series-context", () => ({
  buildSeriesContextBlock: buildSeriesContextBlockMock,
}));
vi.mock("@/lib/api/book-access", () => ({
  requireBookOwnedByUser: async () => null,
}));
vi.mock("@/lib/utils/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, resetAt: null }),
}));
vi.mock("@/lib/openai/client", () => ({
  getOpenAI: () => ({
    chat: {
      completions: {
        create: createCompletionMock,
      },
    },
  }),
}));

type Row = Record<string, unknown>;

function makeFakeSupabase() {
  const itemRows = [
    { id: "item-1", position: 0 },
    { id: "item-2", position: 1 },
    { id: "item-3", position: 2 },
  ];
  const chainNoop = {
    eq: async () => ({ data: null, error: null }),
  };
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: "11111111-1111-1111-1111-111111111111" } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "books") {
        const row: Row = {
          id: "22222222-2222-2222-2222-222222222222",
          title: "Book",
          genre: "Fantasy",
          refined_idea: null,
          series_id: "33333333-3333-3333-3333-333333333333",
          series_order: 2,
        };
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: row, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "brainstorm_sessions") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "session-1" }, error: null }),
            }),
          }),
          delete: () => chainNoop,
        };
      }
      if (table === "brainstorm_items") {
        return {
          insert: () => ({
            select: () => ({
              order: async () => ({ data: itemRows, error: null }),
            }),
          }),
          update: () => chainNoop,
          delete: () => chainNoop,
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  };
}

const fakeSupabase = makeFakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fakeSupabase,
}));

import { POST } from "@/app/api/ai/brainstorm/route";

describe("brainstorm series context grounding", () => {
  it("includes <series block in the brainstorm user prompt for series books", async () => {
    buildCodexBlockMock.mockResolvedValue({
      block: "<worldbook><entry>canon</entry></worldbook>",
      entriesIncluded: [],
      entriesTrimmed: [],
      tokensUsed: 20,
    });
    buildSeriesContextBlockMock.mockResolvedValue({
      block: '<series name="Trilogy"><description>Canon</description></series>',
      tokensUsed: 30,
      blocksIncluded: [],
      blocksTrimmed: [],
      meta: {
        priorBooksAvailable: 1,
        priorBooksIncluded: 1,
        arcsAvailable: 1,
        arcsIncluded: 1,
        missingSummaries: 0,
      },
    });
    createCompletionMock.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "1. A\n2. B\n3. C" } }] };
      },
    });

    const request = new Request("http://localhost/api/ai/brainstorm", {
      method: "POST",
      body: JSON.stringify({
        bookId: "22222222-2222-2222-2222-222222222222",
        topic: "custom",
        prompt: "Give me conflict ideas",
        count: 3,
        keepers: [],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const payload = createCompletionMock.mock.calls[0]?.[0] as
      | { messages?: Array<{ role: string; content: string }> }
      | undefined;
    const userPrompt =
      payload?.messages?.find((m) => m.role === "user")?.content ?? "";
    expect(userPrompt).toContain("<series");
  });
});


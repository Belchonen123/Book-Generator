import { describe, expect, it, vi } from "vitest";

const {
  anthropicMessagesCreateStreamingMock,
  buildCodexBlockMock,
  transcriptionsCreateMock,
} = vi.hoisted(() => ({
  anthropicMessagesCreateStreamingMock: vi.fn(),
  buildCodexBlockMock: vi.fn(),
  transcriptionsCreateMock: vi.fn(),
}));

vi.mock("ai", () => ({
  AnthropicStream: vi.fn(
    () =>
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
  ),
  StreamingTextResponse: class StreamingTextResponse extends Response {
    constructor(stream: ReadableStream, init?: ResponseInit) {
      super(stream, init);
    }
  },
}));

vi.mock("openai/uploads", () => ({
  toFile: async () => new Blob(["voice"]),
}));

vi.mock("@/lib/anthropic/message-attempts", () => ({
  anthropicMessagesCreateStreaming: anthropicMessagesCreateStreamingMock,
  getChapterTextForPersistence: async () => "",
}));
vi.mock("@/lib/anthropic/vercel-anthropic-bridge", () => ({
  toVercelAnthropicStreamInput: () => ({}),
}));
vi.mock("@/lib/anthropic/text-model", () => ({
  anthropicTextModelsToTry: () => ["claude-sonnet"],
}));
vi.mock("@/lib/openai/client", () => ({
  getOpenAI: () => ({
    audio: { transcriptions: { create: transcriptionsCreateMock } },
  }),
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
vi.mock("@/lib/supabase/ensure-profile-row", () => ({
  ensureProfileRowForUser: async () => ({ ok: true as const }),
}));

type Row = Record<string, unknown>;
type SelectResult =
  | { data: Row[] | null; error: null }
  | { data: Row | null; error: null }
  | { count: number | null; error: null };

type FakeChain = {
  select: () => FakeChain;
  eq: (column: string, value: unknown) => FakeChain;
  lt: (column: string, value: number) => FakeChain;
  in: (column: string, values: unknown[]) => FakeChain;
  order: (column: string, options?: { ascending?: boolean }) => FakeChain;
  update: (_payload: Record<string, unknown>) => FakeChain;
  maybeSingle: () => Promise<{ data: Row | null; error: null }>;
  single: () => Promise<{ data: Row | null; error: null }>;
  then: (resolve: (value: SelectResult) => unknown) => unknown;
};

function makeFakeSupabase(fixtures: Record<string, Row[]>) {
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
      in: (column, values) => {
        rows = rows.filter((r) => values.includes(r[column]));
        return chain;
      },
      order: (column, options) => {
        const asc = options?.ascending !== false;
        rows = [...rows].sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (typeof av === "number" && typeof bv === "number") {
            return asc ? av - bv : bv - av;
          }
          return String(av ?? "").localeCompare(String(bv ?? ""));
        });
        return chain;
      },
      update: () => chain,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => ({ data: rows[0] ?? null, error: null }),
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
      genre: "Fantasy",
      refined_idea: null,
      style_examples: "Style sample",
      style_instructions: "Keep it tense.",
      series_id: null,
      series_order: null,
    },
  ],
  chapters: [
    {
      id: "33333333-3333-3333-3333-333333333333",
      book_id: "22222222-2222-2222-2222-222222222222",
      title: "Chapter One",
      outline_summary: "Aria enters the archive.",
      author_notes: null,
      chapter_number: 1,
      content: "Existing draft text.",
      status: "draft",
      generation_count: 0,
      target_word_count: 1200,
      ai_summary: null,
    },
  ],
  prompt_templates: [],
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fakeSupabase,
}));

import { POST } from "@/app/api/ai/voice-to-chapter/route";

describe("voice-to-chapter context assembly", () => {
  it("includes worldbook codex in the final system prompt", async () => {
    transcriptionsCreateMock.mockResolvedValue({
      text: "Aria confronts the archivist and finally opens the sealed map case.",
    });
    buildCodexBlockMock.mockResolvedValue({
      block:
        '<worldbook><entry type="character" name="Aria">Aria lost her left hand in a foundry fire.</entry></worldbook>',
      entriesIncluded: ["codex-1"],
      entriesTrimmed: [],
      tokensUsed: 40,
    });
    anthropicMessagesCreateStreamingMock.mockResolvedValue({
      stream: {},
      modelUsed: "claude-sonnet",
    });

    const audioFile = {
      size: 128,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as Blob;
    const form = {
      get: (key: string) => {
        if (key === "audio") return audioFile;
        if (key === "bookId") return "22222222-2222-2222-2222-222222222222";
        if (key === "chapterId") return "33333333-3333-3333-3333-333333333333";
        if (key === "mode") return "append";
        if (key === "durationMs") return "12000";
        return null;
      },
    } as unknown as FormData;

    const request = {
      formData: async () => form,
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(200);

    const payload = anthropicMessagesCreateStreamingMock.mock.calls[0]?.[0] as
      | { systemPrompt?: string }
      | undefined;
    expect(payload?.systemPrompt ?? "").toContain("<worldbook>");
    expect(payload?.systemPrompt ?? "").toContain("Aria lost her left hand");
  });
});


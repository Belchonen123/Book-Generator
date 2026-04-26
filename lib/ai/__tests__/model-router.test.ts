import { beforeEach, describe, expect, it, vi } from "vitest";

const openAICreateMock = vi.fn();
const anthropicCreateMock = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  getOpenAI: () => ({
    chat: {
      completions: {
        create: openAICreateMock,
      },
    },
  }),
  isOpenAIConfigError: (err: unknown) =>
    err instanceof Error && err.message === "OPENAI_API_KEY is not configured",
}));

vi.mock("@/lib/anthropic/client", () => ({
  getAnthropicClient: () => ({
    messages: {
      create: anthropicCreateMock,
    },
  }),
}));

function providerError(status: number, message = `provider ${status}`): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

describe("generateWithFailover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the primary OpenAI result when the primary succeeds", async () => {
    openAICreateMock.mockResolvedValue({
      model: "gpt-4o",
      usage: { prompt_tokens: 12, completion_tokens: 7 },
      choices: [{ message: { content: "primary text" } }],
    });

    const { generateWithFailover } = await import("@/lib/ai/model-router");
    const result = await generateWithFailover({
      primary: "openai",
      system: "system",
      prompt: "prompt",
      stream: false,
      route: "/test",
      userId: "user-1",
    });

    expect(result).toMatchObject({
      text: "primary text",
      provider_used: "openai",
      model_used: "gpt-4o",
      input_tokens: 12,
      output_tokens: 7,
      fell_back: false,
    });
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("falls back to Anthropic when the OpenAI primary returns a 5xx", async () => {
    openAICreateMock.mockRejectedValue(providerError(503));
    anthropicCreateMock.mockResolvedValue({
      model: "claude-3-5-sonnet-20241022",
      usage: { input_tokens: 10, output_tokens: 5 },
      content: [{ type: "text", text: "fallback text" }],
    });

    const router = await import("@/lib/ai/model-router");
    const captureSpy = vi.spyOn(router.Sentry, "captureMessage");
    const result = await router.generateWithFailover({
      primary: "openai",
      system: "system",
      prompt: "prompt",
      stream: false,
      route: "/api/ai/generate-outline",
      userId: "user-1",
    });

    expect(result).toMatchObject({
      text: "fallback text",
      provider_used: "anthropic",
      fell_back: true,
    });
    expect(anthropicCreateMock).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledWith(
      "AI provider fallback",
      expect.objectContaining({
        level: "warning",
        extra: expect.objectContaining({
          from: "openai",
          to: "anthropic",
          route: "/api/ai/generate-outline",
          userId: "user-1",
        }),
      }),
    );
  });

  it("does not fall back for a non-retryable 400 from the primary", async () => {
    const badRequest = providerError(400, "invalid request");
    openAICreateMock.mockRejectedValue(badRequest);

    const { generateWithFailover } = await import("@/lib/ai/model-router");
    await expect(
      generateWithFailover({
        primary: "openai",
        system: "system",
        prompt: "prompt",
        stream: false,
      }),
    ).rejects.toBe(badRequest);

    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("throws when the primary is retryable but the fallback provider also fails", async () => {
    openAICreateMock.mockRejectedValue(providerError(500));
    const fallbackError = providerError(503, "fallback unavailable");
    anthropicCreateMock.mockRejectedValue(fallbackError);

    const { generateWithFailover } = await import("@/lib/ai/model-router");
    await expect(
      generateWithFailover({
        primary: "openai",
        system: "system",
        prompt: "prompt",
        stream: false,
      }),
    ).rejects.toBe(fallbackError);

    expect(openAICreateMock).toHaveBeenCalledTimes(1);
    expect(anthropicCreateMock).toHaveBeenCalledTimes(1);
  });
});

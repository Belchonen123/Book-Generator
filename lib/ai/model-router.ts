import { APIConnectionError, APIConnectionTimeoutError, APIError, RateLimitError } from "openai";
import {
  APIConnectionError as AnthropicConnectionError,
  APIConnectionTimeoutError as AnthropicConnectionTimeoutError,
  APIError as AnthropicAPIError,
  RateLimitError as AnthropicRateLimitError,
} from "@anthropic-ai/sdk";
import { formatStreamPart } from "ai";

import { getAnthropicClient } from "@/lib/anthropic/client";
import { AI_FAILOVER_ENABLED } from "@/lib/env";
import { getOpenAI, isOpenAIConfigError } from "@/lib/openai/client";

export type AiProvider = "openai" | "anthropic";

export type GenerationResult = {
  text: string;
  model_used: string;
  provider_used: AiProvider;
  input_tokens: number;
  output_tokens: number;
  fell_back: boolean;
  stream?: ReadableStream<Uint8Array>;
  finalResult?: Promise<GenerationResult>;
};

export type GenerateWithFailoverArgs = {
  primary: AiProvider;
  prompt: string;
  system: string;
  stream: boolean;
  onToken?: (token: string) => void;
  route?: string;
  userId?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
};

export const OPENAI_EQUIVALENT_MODEL = "gpt-4o";
export const ANTHROPIC_EQUIVALENT_MODEL = "claude-3-5-sonnet-20241022";

const encoder = new TextEncoder();

export const Sentry = {
  captureMessage(
    message: string,
    context?: {
      level?: "warning" | "error" | "info";
      extra?: Record<string, unknown>;
    },
  ): void {
    const globalSentry = (globalThis as {
      Sentry?: {
        captureMessage?: (message: string, context?: unknown) => void;
      };
    }).Sentry;
    if (globalSentry?.captureMessage) {
      globalSentry.captureMessage(message, context);
      return;
    }
    // Lightweight local fallback when Sentry is not installed in this app.
    if (context?.level === "warning") {
      console.warn(message, context.extra);
    }
  },
};

function otherProvider(provider: AiProvider): AiProvider {
  return provider === "openai" ? "anthropic" : "openai";
}

function estimateTokens(text: string): number {
  return text ? Math.max(1, Math.ceil(text.length / 4)) : 0;
}

function errorStatus(err: unknown): number | undefined {
  if (err instanceof APIError || err instanceof AnthropicAPIError) {
    return err.status;
  }
  const candidate = err as { status?: unknown; code?: unknown };
  return typeof candidate.status === "number"
    ? candidate.status
    : typeof candidate.code === "number"
      ? candidate.code
      : undefined;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function isRetryableProviderFailure(err: unknown): boolean {
  if (
    err instanceof RateLimitError ||
    err instanceof APIConnectionError ||
    err instanceof APIConnectionTimeoutError ||
    err instanceof AnthropicRateLimitError ||
    err instanceof AnthropicConnectionError ||
    err instanceof AnthropicConnectionTimeoutError
  ) {
    return true;
  }
  if (isOpenAIConfigError(err)) return false;
  if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
    return false;
  }
  const status = errorStatus(err);
  if (status === 408 || status === 409 || status === 425 || status === 429) {
    return true;
  }
  if (typeof status === "number") {
    if (status === 400 || status === 401 || status === 403) return false;
    return status >= 500;
  }
  const msg = errorMessage(err).toLowerCase();
  if (
    msg.includes("content policy") ||
    msg.includes("content_policy") ||
    msg.includes("safety") ||
    msg.includes("invalid request") ||
    msg.includes("unauthorized") ||
    msg.includes("authentication")
  ) {
    return false;
  }
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("socket")
  );
}

function logFallback(params: {
  from: AiProvider;
  to: AiProvider;
  err: unknown;
  route?: string;
  userId?: string;
}): void {
  Sentry.captureMessage("AI provider fallback", {
    level: "warning",
    extra: {
      from: params.from,
      to: params.to,
      route: params.route ?? "unknown",
      userId: params.userId ?? "unknown",
      originalError: errorMessage(params.err),
      originalStatus: errorStatus(params.err) ?? null,
    },
  });
}

function extractAnthropicText(message: {
  content?: Array<{ type?: string; text?: string }>;
}): string {
  return (message.content ?? [])
    .map((part) => (part.type === "text" ? part.text ?? "" : ""))
    .join("")
    .trim();
}

function extractAnthropicStreamDelta(event: unknown): string {
  const e = event as {
    type?: string;
    delta?: { type?: string; text?: string };
  };
  if (e.type === "content_block_delta" && e.delta?.type === "text_delta") {
    return e.delta.text ?? "";
  }
  return "";
}

async function generateNonStreaming(
  provider: AiProvider,
  args: GenerateWithFailoverArgs,
  fellBack: boolean,
): Promise<GenerationResult> {
  const maxTokens = args.maxTokens ?? 16_384;
  const temperature = args.temperature ?? 0.7;
  if (provider === "openai") {
    const completion = await getOpenAI().chat.completions.create({
      model: OPENAI_EQUIVALENT_MODEL,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.prompt },
      ],
      response_format:
        args.responseFormat === "json_object" ? { type: "json_object" } : undefined,
      temperature,
      max_completion_tokens: maxTokens,
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return {
      text,
      model_used: completion.model || OPENAI_EQUIVALENT_MODEL,
      provider_used: "openai",
      input_tokens:
        completion.usage?.prompt_tokens ??
        estimateTokens(`${args.system}\n${args.prompt}`),
      output_tokens: completion.usage?.completion_tokens ?? estimateTokens(text),
      fell_back: fellBack,
    };
  }

  const message = await getAnthropicClient().messages.create({
    model: ANTHROPIC_EQUIVALENT_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: args.system,
    messages: [{ role: "user", content: args.prompt }],
  });
  const text = extractAnthropicText(message);
  return {
    text,
    model_used: message.model || ANTHROPIC_EQUIVALENT_MODEL,
    provider_used: "anthropic",
    input_tokens: message.usage?.input_tokens ?? estimateTokens(`${args.system}\n${args.prompt}`),
    output_tokens: message.usage?.output_tokens ?? estimateTokens(text),
    fell_back: fellBack,
  };
}

async function streamProvider(
  provider: AiProvider,
  args: GenerateWithFailoverArgs,
  enqueue: (token: string) => void,
): Promise<{
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const maxTokens = args.maxTokens ?? 16_384;
  const temperature = args.temperature ?? 0.8;
  let text = "";

  if (provider === "openai") {
    const completion = await getOpenAI().chat.completions.create({
      model: OPENAI_EQUIVALENT_MODEL,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.prompt },
      ],
      temperature,
      max_completion_tokens: maxTokens,
      stream: true,
    });
    let model = OPENAI_EQUIVALENT_MODEL;
    for await (const chunk of completion) {
      model = chunk.model || model;
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (!token) continue;
      text += token;
      enqueue(token);
    }
    return {
      text: text.trim(),
      model,
      inputTokens: estimateTokens(`${args.system}\n${args.prompt}`),
      outputTokens: estimateTokens(text),
    };
  }

  const stream = getAnthropicClient().messages.stream({
    model: ANTHROPIC_EQUIVALENT_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: args.system,
    messages: [{ role: "user", content: args.prompt }],
  });
  for await (const event of stream) {
    const token = extractAnthropicStreamDelta(event);
    if (!token) continue;
    text += token;
    enqueue(token);
  }
  return {
    text: text.trim(),
    model: ANTHROPIC_EQUIVALENT_MODEL,
    inputTokens: estimateTokens(`${args.system}\n${args.prompt}`),
    outputTokens: estimateTokens(text),
  };
}

function generateStreaming(args: GenerateWithFailoverArgs): GenerationResult {
  const primary = args.primary;
  const fallback = otherProvider(primary);
  let finalResolve!: (result: GenerationResult) => void;
  let finalReject!: (err: unknown) => void;
  const finalResult = new Promise<GenerationResult>((resolve, reject) => {
    finalResolve = resolve;
    finalReject = reject;
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        let provider = primary;
        let fellBack = false;
        let emittedAnyToken = false;
        for (;;) {
          try {
            const result = await streamProvider(provider, args, (token) => {
              emittedAnyToken = true;
              args.onToken?.(token);
              controller.enqueue(
                encoder.encode(formatStreamPart("text", token) + "\n"),
              );
            });
            const final = {
              text: result.text,
              model_used: result.model,
              provider_used: provider,
              input_tokens: result.inputTokens,
              output_tokens: result.outputTokens,
              fell_back: fellBack,
            } satisfies GenerationResult;
            finalResolve(final);
            controller.close();
            return;
          } catch (err) {
            if (emittedAnyToken) {
              const message = "AI stream failed after partial content; not falling back.";
              controller.enqueue(
                encoder.encode(formatStreamPart("error", message) + "\n"),
              );
              finalReject(err);
              controller.close();
              return;
            }
            if (
              AI_FAILOVER_ENABLED &&
              provider === primary &&
              isRetryableProviderFailure(err)
            ) {
              logFallback({
                from: provider,
                to: fallback,
                err,
                route: args.route,
                userId: args.userId,
              });
              provider = fallback;
              fellBack = true;
              continue;
            }
            finalReject(err);
            controller.error(err);
            return;
          }
        }
      })();
    },
  });

  return {
    text: "",
    model_used: "",
    provider_used: primary,
    input_tokens: 0,
    output_tokens: 0,
    fell_back: false,
    stream,
    finalResult,
  };
}

export async function generateWithFailover(
  args: GenerateWithFailoverArgs,
): Promise<GenerationResult> {
  if (args.stream) {
    return generateStreaming(args);
  }

  const primary = args.primary;
  try {
    return await generateNonStreaming(primary, args, false);
  } catch (err) {
    if (!AI_FAILOVER_ENABLED || !isRetryableProviderFailure(err)) {
      throw err;
    }
    const fallback = otherProvider(primary);
    logFallback({
      from: primary,
      to: fallback,
      err,
      route: args.route,
      userId: args.userId,
    });
    return generateNonStreaming(fallback, args, true);
  }
}

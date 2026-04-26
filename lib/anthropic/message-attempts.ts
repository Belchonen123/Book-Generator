import { APIError } from "@anthropic-ai/sdk";
import { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

import { getAnthropicClient } from "@/lib/anthropic/client";

type RetryDecision = "stop" | "try_plain_system" | "next_model";

/**
 * Returns a retry decision given an Anthropic SDK error. Callers are responsible
 * for attempt loops; this function is stateless.
 */
function classifyAnthropicCreateError(
  err: unknown,
  usedCachedSystem: boolean,
): RetryDecision {
  if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
    return "stop";
  }
  if (!(err instanceof APIError) || err.status === undefined) {
    return "stop";
  }

  const { status } = err;
  const msg = err.message.toLowerCase();

  if (status === 401 || status === 403 || status === 429) {
    return "stop";
  }
  if (status === 404) {
    return "next_model";
  }
  if (status === 400) {
    if (
      usedCachedSystem &&
      (msg.includes("cache") || msg.includes("cache_control"))
    ) {
      return "try_plain_system";
    }
    if (
      msg.includes("model") ||
      msg.includes("not_found") ||
      msg.includes("invalid_request_error")
    ) {
      return "next_model";
    }
    return usedCachedSystem ? "try_plain_system" : "next_model";
  }
  if (status >= 500) {
    return "stop";
  }
  // Remaining status codes (e.g. 408) — not eligible for model or cache heuristics.
  return "stop";
}

export type AnthropicMessagesArgs = {
  systemPrompt: string;
  max_tokens: number;
  temperature: number;
  messages: MessageParam[];
};

export async function anthropicMessagesCreateNonStreaming(
  args: AnthropicMessagesArgs,
  models: string[],
): Promise<{ message: Message; modelUsed: string }> {
  let lastErr: unknown;

  for (const model of models) {
    for (const mode of ["cached", "plain"] as const) {
      const usedCache = mode === "cached";
      const system = usedCache
        ? [
            {
              type: "text" as const,
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : args.systemPrompt;

      try {
        const message = await getAnthropicClient().messages.create({
          model,
          max_tokens: args.max_tokens,
          temperature: args.temperature,
          system,
          messages: args.messages,
          stream: false,
        });
        return { message, modelUsed: model };
      } catch (err) {
        lastErr = err;
        const decision = classifyAnthropicCreateError(err, usedCache);
        if (decision === "stop") {
          throw err;
        }
        if (decision === "try_plain_system" && usedCache) {
          continue;
        }
        if (decision === "next_model") {
          break;
        }
      }
    }
  }

  throw lastErr;
}

export async function anthropicMessagesCreateStreaming(
  args: AnthropicMessagesArgs,
  models: string[],
): Promise<{ stream: MessageStream; modelUsed: string }> {
  let lastErr: unknown;

  for (const model of models) {
    for (const mode of ["cached", "plain"] as const) {
      const usedCache = mode === "cached";
      const system = usedCache
        ? [
            {
              type: "text" as const,
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : args.systemPrompt;

      try {
        const stream = getAnthropicClient().messages.stream({
          model,
          max_tokens: args.max_tokens,
          temperature: args.temperature,
          system,
          messages: args.messages,
        });
        return { stream, modelUsed: model };
      } catch (err) {
        lastErr = err;
        const decision = classifyAnthropicCreateError(err, usedCache);
        if (decision === "stop") {
          throw err;
        }
        if (decision === "try_plain_system" && usedCache) {
          continue;
        }
        if (decision === "next_model") {
          break;
        }
      }
    }
  }

  throw lastErr;
}

/**
 * The Vercel AI SDK `AnthropicStream` `onFinal` callback sometimes receives an
 * empty string even when the model produced text (stream event shape vs.
 * `streamable` aggregation mismatch). The Anthropic `MessageStream` still
 * holds the final assistant text; call `finalText()` after the stream ends.
 */
export async function getChapterTextForPersistence(
  messageStream: MessageStream,
  aiSdkOnFinalText: string,
): Promise<string> {
  const fromSdk = aiSdkOnFinalText.trim();
  if (fromSdk) return fromSdk;
  try {
    return (await messageStream.finalText()).trim();
  } catch {
    return "";
  }
}

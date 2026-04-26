import { AnthropicStream } from "ai";
import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";

type VercelAnthropicStreamSource = Extract<
  Parameters<typeof AnthropicStream>[0],
  AsyncIterable<unknown>
>;

/**
 * Vercel's `AnthropicStream` is typed for `ai`'s `MessageStreamEvent` union, while the
 * Anthropic SDK's `MessageStream` yields the SDK's raw stream events. At runtime the
 * shapes match; the packages' declarations diverge (e.g. thinking vs text content blocks).
 * This is the single type bridge; routes do not use ad-hoc `as` on the stream.
 */
export function toVercelAnthropicStreamInput(
  stream: MessageStream,
): VercelAnthropicStreamSource {
  return stream as VercelAnthropicStreamSource;
}

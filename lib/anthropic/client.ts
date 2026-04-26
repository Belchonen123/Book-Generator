import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy singleton — server-only; do not import from Client Components.
 * Uses ANTHROPIC_API_KEY from the environment.
 */
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

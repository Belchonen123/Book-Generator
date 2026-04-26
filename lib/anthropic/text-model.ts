/** Default text model for outline / chapter generation (Messages API). Sonnet 4.5. */
export const DEFAULT_ANTHROPIC_TEXT_MODEL = "claude-sonnet-4-5-20250929";

/**
 * When the primary alias is not enabled for an API key, try dated Sonnet IDs next.
 * Override order with ANTHROPIC_TEXT_MODEL (single model id).
 */
const FALLBACK_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
] as const;

export function anthropicTextModelsToTry(): string[] {
  const fromEnv = process.env.ANTHROPIC_TEXT_MODEL?.trim();
  const primary = fromEnv || DEFAULT_ANTHROPIC_TEXT_MODEL;
  const seen = new Set<string>([primary]);
  const out: string[] = [primary];
  for (const m of FALLBACK_MODELS) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

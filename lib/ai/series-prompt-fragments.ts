/**
 * Canonical series-continuity system-prompt fragment. Drift in this exact
 * wording has been shown to let the model resolve "developing" arcs ahead of
 * schedule. Do not rewrite, paraphrase, or construct alternative fragments in
 * random call sites. Always use {@link renderSeriesContinuityFragment}; new
 * variants belong in this file (v2, v3, …) and require explicit
 * prompt-engineering review.
 */
const SERIES_CONTINUITY_FRAGMENT_V1 = `This book is part of a series. Honor existing character history, established world rules, and arcs currently in motion. When characters reference past events, the events in <progression> elements are real and have happened. Do not contradict them. Do not resolve arcs whose status is 'developing' unless explicitly asked.`;

/** The only supported way to inject the v1 series continuity line into system prompts. */
export function renderSeriesContinuityFragment(): string {
  return SERIES_CONTINUITY_FRAGMENT_V1;
}

/** Tests and diagnostics: verify a string is exactly the canonical fragment (trimmed). */
export function isSeriesContinuityFragment(s: string): boolean {
  return s.trim() === SERIES_CONTINUITY_FRAGMENT_V1;
}

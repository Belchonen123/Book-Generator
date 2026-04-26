import OpenAI from "openai";

/**
 * Lazy singleton OpenAI client — server-only, never import from Client Components.
 *
 * Nothing in this module executes at import time beyond type declarations, so a
 * missing `OPENAI_API_KEY` only surfaces when an AI call is actually attempted
 * (letting the rest of the app still boot and render cleanly).
 *
 * Cached on `globalThis` so Next.js dev-mode HMR does not spawn duplicate
 * clients across hot reloads.
 */
const globalForOpenAI = globalThis as unknown as {
  __chapterai_openai?: OpenAI;
};

/** Sentinel we throw when the API key is missing; surfaces as `CONFIGURATION 503`. */
export const OPENAI_CONFIG_ERROR_MESSAGE = "OPENAI_API_KEY is not configured";

export function getOpenAI(): OpenAI {
  if (globalForOpenAI.__chapterai_openai) {
    return globalForOpenAI.__chapterai_openai;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(OPENAI_CONFIG_ERROR_MESSAGE);
  }
  globalForOpenAI.__chapterai_openai = new OpenAI({ apiKey });
  return globalForOpenAI.__chapterai_openai;
}

/** True if `err` is the sentinel thrown by {@link getOpenAI} for a missing key. */
export function isOpenAIConfigError(err: unknown): boolean {
  return err instanceof Error && err.message === OPENAI_CONFIG_ERROR_MESSAGE;
}

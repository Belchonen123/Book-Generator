/**
 * Tests for the summary-staleness detector. The actual `summarizeChapter`
 * round-trip is integration-scope (real OpenAI + real Supabase); this
 * file covers the pure decision logic that gates whether a refresh is
 * worth an API call.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

import {
  isSummaryStale,
  MIN_WORDS_FOR_SUMMARY,
  STALE_WORD_COUNT_DELTA,
} from "@/lib/ai/auto-summarize";

function makeWords(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

function hashShort(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

describe("isSummaryStale", () => {
  it("is not stale for empty content — nothing to summarize", () => {
    expect(
      isSummaryStale({
        currentContent: "",
        storedSummary: null,
        storedHash: null,
      }),
    ).toBe(false);
  });

  it("is not stale when content is shorter than the minimum word count", () => {
    /* Below the floor we skip summarization entirely. */
    const short = makeWords(MIN_WORDS_FOR_SUMMARY - 5);
    expect(
      isSummaryStale({
        currentContent: short,
        storedSummary: null,
        storedHash: null,
      }),
    ).toBe(false);
  });

  it("is stale when there is no stored summary and content is long enough", () => {
    const longEnough = makeWords(MIN_WORDS_FOR_SUMMARY + 50);
    expect(
      isSummaryStale({
        currentContent: longEnough,
        storedSummary: null,
        storedHash: null,
      }),
    ).toBe(true);
  });

  it("is stale when the stored hash is malformed", () => {
    const longEnough = makeWords(MIN_WORDS_FOR_SUMMARY + 50);
    expect(
      isSummaryStale({
        currentContent: longEnough,
        storedSummary: "Existing summary.",
        storedHash: "not-a-valid-hash",
      }),
    ).toBe(true);
  });

  it("is NOT stale when the stored hash matches current content exactly", () => {
    const longEnough = makeWords(MIN_WORDS_FOR_SUMMARY + 50);
    const words = longEnough.split(/\s+/).length;
    const hash = `${words}:${hashShort(longEnough)}`;
    expect(
      isSummaryStale({
        currentContent: longEnough,
        storedSummary: "Existing summary.",
        storedHash: hash,
      }),
    ).toBe(false);
  });

  it("is NOT stale when content drift is below the threshold", () => {
    /* 5% word-count drift is under the 10% threshold, so no refresh. */
    const original = makeWords(300);
    const hash = `300:${hashShort(original)}`;
    const driftedSlightly = makeWords(310);
    expect(
      isSummaryStale({
        currentContent: driftedSlightly,
        storedSummary: "Existing summary.",
        storedHash: hash,
      }),
    ).toBe(false);
  });

  it("IS stale when content drift exceeds the threshold", () => {
    /* 20% word-count drift is well over the 10% threshold. */
    const original = makeWords(300);
    const hash = `300:${hashShort(original)}`;
    const driftedALot = makeWords(400);
    expect(
      isSummaryStale({
        currentContent: driftedALot,
        storedSummary: "Existing summary.",
        storedHash: hash,
      }),
    ).toBe(true);
  });

  it("STALE_WORD_COUNT_DELTA is exactly 10% (contract test)", () => {
    /* Guard against a future refactor accidentally changing the
     * threshold — the spec commits to 10%. */
    expect(STALE_WORD_COUNT_DELTA).toBeCloseTo(0.1);
  });
});

import { describe, expect, it } from "vitest";

import { extractTrailingProse } from "@/lib/prose/trailing";

function makeChapter(wordLens: number[]): string {
  return wordLens
    .map(
      (n) =>
        Array.from({ length: n }, (_, i) => `w${i % 7}`).join(" ") + ".",
    )
    .join("\n\n");
}

describe("extractTrailingProse", () => {
  it("returns the full string when under the word target", () => {
    const s = "One two three.";
    expect(extractTrailingProse(s, 500)).toBe("One two three.");
  });

  it("preserves \\n\\n between paragraphs in the tail", () => {
    const body = makeChapter([80, 20, 300, 40, 200, 30]);
    const out = extractTrailingProse(body, 500);
    expect(out).toMatch(/\n\n/);
    const wordCount = out.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(750);
    expect(wordCount).toBeGreaterThanOrEqual(300);
  });

  it("is roughly 500 words for a 1500-word multi-paragraph sample", () => {
    const many = makeChapter(
      Array.from({ length: 20 }, () => 75),
    );
    const total = many.split(/\s+/).filter(Boolean).length;
    expect(total).toBeGreaterThan(1400);
    const out = extractTrailingProse(many, 500);
    const wc = out.split(/\s+/).filter(Boolean).length;
    expect(wc).toBeLessThanOrEqual(700);
  });
});

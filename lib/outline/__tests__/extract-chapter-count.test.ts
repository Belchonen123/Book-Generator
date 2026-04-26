import { describe, expect, it } from "vitest";

import { extractRequestedChapterCount } from "@/lib/outline/extract-chapter-count";

describe("extractRequestedChapterCount", () => {
  it('matches compiled "N chapters · … words" format', () => {
    expect(extractRequestedChapterCount("12 chapters · 60,000 words")).toBe(12);
  });

  it("matches chapter_count: 15 style", () => {
    expect(extractRequestedChapterCount("chapter_count: 15")).toBe(15);
  });

  it("matches Chapter count: 8", () => {
    expect(extractRequestedChapterCount("Chapter count: 8")).toBe(8);
  });

  it("does not pick up incidental prose (Tehillim)", () => {
    expect(
      extractRequestedChapterCount(
        "My grandfather knew 50 chapters of Tehillim by heart",
      ),
    ).toBeNull();
  });

  it("does not pick up mid-sentence chapter counts", () => {
    expect(
      extractRequestedChapterCount("It's a 3-act story with 12 chapters"),
    ).toBeNull();
  });

  it("matches chapter_count = 20 on its own line", () => {
    expect(extractRequestedChapterCount("\nchapter_count = 20\n")).toBe(20);
  });

  it("matches chapters: 7 at line start", () => {
    expect(extractRequestedChapterCount("\nchapters: 7\n")).toBe(7);
  });
});

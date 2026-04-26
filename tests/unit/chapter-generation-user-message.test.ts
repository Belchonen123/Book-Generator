import { describe, expect, it } from "vitest";

import { buildChapterGenerationUserMessage } from "@/lib/ai/pipeline";

describe("buildChapterGenerationUserMessage", () => {
  it("injects chapter steering notes into the final user message", () => {
    const message = buildChapterGenerationUserMessage({
      targetWords: 2500,
      outlineSummary: "Sarah discovers the lighthouse key.",
      authorNotes: "Keep Sarah's POV only and end on a cliffhanger.",
      recentProse: "The previous chapter ended at the harbor.",
    });

    expect(message).toContain("Author steering notes (highest priority)");
    expect(message).toContain("Keep Sarah's POV only and end on a cliffhanger.");
    expect(message.indexOf("Author steering notes")).toBeLessThan(
      message.indexOf("Chapter outline"),
    );
  });

  it("omits the steering section when no notes are supplied", () => {
    const message = buildChapterGenerationUserMessage({
      targetWords: 2500,
      outlineSummary: "Sarah discovers the lighthouse key.",
      authorNotes: "   ",
    });

    expect(message).not.toContain("Author steering notes");
    expect(message).toContain("Chapter outline");
  });
});

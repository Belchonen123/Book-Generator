import { describe, it, expect } from "vitest";

import {
  parseRefinedIdeaValue,
  refinedIdeaToPlainSummary,
  briefSourceForBookRow,
} from "@/lib/refined-idea/parse";

describe("parseRefinedIdeaValue", () => {
  it("accepts partial brief objects (e.g. genre only)", () => {
    const r = parseRefinedIdeaValue({ genre: "thriller" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data?.genre).toBe("thriller");
    }
  });

  it("rejects arrays", () => {
    const r = parseRefinedIdeaValue([1, 2] as unknown as null);
    expect(r.success).toBe(false);
  });
});

describe("refinedIdeaToPlainSummary", () => {
  it("returns premise line when present", () => {
    const t = refinedIdeaToPlainSummary(
      { core_premise: "A spy in Berlin." },
      "test",
      500,
    );
    expect(t).toContain("spy");
  });
});

describe("briefSourceForBookRow", () => {
  it("falls back to raw when refined is not a valid object brief", () => {
    const s = briefSourceForBookRow({
      refined_idea: [1, 2, 3] as unknown as import("@/types/database.types").Json,
      raw_idea: "Raw backup idea.",
      title: "Untitled Book",
      logContext: "test",
    });
    expect(s).toBe("Raw backup idea.");
  });
});

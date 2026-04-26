import { describe, expect, it } from "vitest";

import { scanForSlop } from "@/lib/ai/slop-scan";

describe("scanForSlop", () => {
  it("flags eyes twinkled (fiction)", () => {
    const text = "The moment was quiet, and her eyes twinkled in the lamplight.";
    const m = scanForSlop(text, "fiction");
    const hit = m.find((x) => /twinkled/i.test(x.matchedText));
    expect(hit).toBeDefined();
  });

  it("flags the held-breath cliché (fiction)", () => {
    const text = "She let out a breath she didn't know she was holding and looked away.";
    const m = scanForSlop(text, "fiction");
    expect(m.length).toBeGreaterThan(0);
    expect(
      m.some(
        (x) =>
          /let\s+out\s+a\s+breath/i.test(x.matchedText) &&
          /didn't\s+know/i.test(x.matchedText),
      ),
    ).toBe(true);
  });

  it("returns no matches for generic neutral prose", () => {
    const text = `The bus arrived on time. She opened her notebook and sketched a rough map
of the old quarter while commuters filed past. Nothing about the day felt portentous.`;
    const m = scanForSlop(text, "fiction");
    expect(m.length).toBe(0);
  });
});

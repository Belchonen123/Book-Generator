import { describe, expect, it } from "vitest";

import { coerceNonFictionOutlinePayload } from "@/lib/outline/nonfiction-outline-coerce";

describe("coerceNonFictionOutlinePayload", () => {
  it("unwraps nested outline.chapters", () => {
    const out = coerceNonFictionOutlinePayload({
      outline: {
        chapters: [{ number: 1, title: "A", description: "D." }],
      },
    }) as { chapters: { title: string }[] };
    expect(out.chapters).toHaveLength(1);
    expect(out.chapters[0].title).toBe("A");
  });

  it("coerces string chapter numbers and fills missing NF fields", () => {
    const out = coerceNonFictionOutlinePayload({
      chapters: [
        {
          number: "2",
          title: "Workflows",
          description: "Hospitals waste hours on paperwork. Clinicians need relief.",
        },
      ],
    }) as {
      chapters: Array<{
        number: number;
        reader_takeaway: string;
        content_type: string;
      }>;
    };
    expect(out.chapters[0].number).toBe(2);
    expect(out.chapters[0].reader_takeaway.length).toBeGreaterThan(10);
    expect(out.chapters[0].content_type).toBe("mixed");
  });

  it("accepts readerTakeaway alias and normalizes content_type", () => {
    const out = coerceNonFictionOutlinePayload({
      chapters: [
        {
          number: 1,
          title: "Intro",
          description: "Body.",
          readerTakeaway: "Custom takeaway line.",
          contentType: "FRAMEWORK",
        },
      ],
    }) as { chapters: Array<{ reader_takeaway: string; content_type: string }> };
    expect(out.chapters[0].reader_takeaway).toBe("Custom takeaway line.");
    expect(out.chapters[0].content_type).toBe("framework");
  });
});

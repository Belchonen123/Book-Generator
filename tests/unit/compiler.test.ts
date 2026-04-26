import { describe, expect, it } from "vitest";

import {
  buildDocxBufferFromData,
  TRIM_SIZE_OPTIONS,
  TRIM_SIZES,
} from "@/lib/docx/compiler";

describe("buildDocxBufferFromData", () => {
  it("returns a ZIP/docx payload for a basic manuscript at default (US Letter) trim size", async () => {
    const buf = await buildDocxBufferFromData(
      { title: "Unit Test Book", genre: "Speculative fiction" },
      [
        {
          chapter_number: 1,
          title: "Arrival",
          content: "## Dawn\n\nHello **world** and *italics*.",
        },
        {
          chapter_number: 2,
          title: "Departure",
          content: "> A blockquote line",
        },
      ],
      true,
    );

    expect(buf instanceof Buffer).toBe(true);
    expect(buf.length).toBeGreaterThan(1500);
    expect(buf.subarray(0, 2).toString("binary")).toBe("PK");
  });

  it("omits free-tier footer when isFreeTier is false", async () => {
    const buf = await buildDocxBufferFromData(
      { title: "Pro Export", genre: "Essay" },
      [{ chapter_number: 1, title: "Only", content: "Body" }],
      false,
    );
    expect(buf instanceof Buffer).toBe(true);
    expect(buf.toString("utf8")).not.toContain("Created with ChapterAI");
  });

  it("renders boxes, pull quotes, scene breaks, and lists without throwing", async () => {
    const rich = [
      "The city hummed beneath them.",
      "",
      "* * *",
      "",
      ">> One sentence can change everything.",
      "",
      "> [!NOTE] From the archivist",
      "> A boxed aside with multiple paragraphs.",
      ">",
      "> - bullet one",
      "> - bullet two",
      "",
      "> [!TIP] A lighter sidebar",
      "> Short and useful.",
      "",
      "> [!KEY] Takeaway",
      "> Remember this.",
      "",
      "Back to ordinary prose.",
    ].join("\n");

    const buf = await buildDocxBufferFromData(
      { title: "Rich Layout", genre: "Non-fiction" },
      [{ chapter_number: 1, title: "Opening", content: rich }],
      false,
    );
    expect(buf instanceof Buffer).toBe(true);
    expect(buf.length).toBeGreaterThan(2000);
  });

  it("supports every declared trim size", async () => {
    for (const trim of TRIM_SIZES) {
      const buf = await buildDocxBufferFromData(
        { title: `Trim ${trim}`, genre: "Fiction" },
        [
          {
            chapter_number: 1,
            title: "Only Chapter",
            content:
              "The opening sentence sets the tone.\n\n> [!SIDE] Margin\n> A small sidenote.\n\n* * *\n\nLater, the mood shifts.",
          },
        ],
        false,
        { trimSize: trim, authorName: "Test Author" },
      );
      expect(buf instanceof Buffer).toBe(true);
      expect(buf.subarray(0, 2).toString("binary")).toBe("PK");
    }
  });

  it("exposes one TRIM_SIZE_OPTION per supported trim size with width/height metadata", () => {
    expect(TRIM_SIZE_OPTIONS.length).toBe(TRIM_SIZES.length);
    for (const opt of TRIM_SIZE_OPTIONS) {
      expect(opt.widthIn).toBeGreaterThan(0);
      expect(opt.heightIn).toBeGreaterThan(0);
      expect(opt.label).toMatch(/\d/);
      expect(opt.description.length).toBeGreaterThan(10);
    }
  });
});

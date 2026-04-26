import { describe, expect, it } from "vitest";

import { renderSeriesContinuityFragment } from "@/lib/ai/series-prompt-fragments";
import { getChapterSystemPrompt } from "@/lib/ai/prompt-templates";
import {
  buildFictionChapterHeader,
  buildNonFictionChapterOpen,
  buildSectionBannedPhrases,
  buildSectionBookContext,
  buildSectionCharacterBlock,
  buildSectionFailureModes,
  buildSectionFictionCraftRequirements,
  buildSectionFormatting,
  buildSectionPriorSummaries,
  buildSectionSeriesFragment,
  buildSectionVoiceAnchor,
} from "@/lib/openai/chapter-system-prompt-sections";

describe("buildSection* helpers (chapter system prompt)", () => {
  it("empty voice anchor returns empty string", () => {
    expect(buildSectionVoiceAnchor(null)).toBe("");
    expect(buildSectionVoiceAnchor("  ")).toBe("");
  });

  it("non-empty voice anchor includes fenced reference block", () => {
    const s = buildSectionVoiceAnchor("Hello reader.");
    expect(s).toContain("VOICE ANCHOR");
    expect(s).toContain("~~~\nHello reader.\n~~~");
  });

  it("buildSectionCharacterBlock is empty without bible", () => {
    expect(buildSectionCharacterBlock(null, true)).toBe("");
    expect(buildSectionCharacterBlock("  \n  ", false)).toBe("");
  });

  it("buildSectionCharacterBlock uses NF vs fiction labels", () => {
    const nf = buildSectionCharacterBlock("Bio here.", true);
    expect(nf).toContain("Author voice and positioning");
    const f = buildSectionCharacterBlock("Cast here.", false);
    expect(f).toContain("Character reference");
  });

  it("buildSectionSeriesFragment is empty when not in series", () => {
    expect(buildSectionSeriesFragment(false)).toBe("");
  });

  it("buildSectionSeriesFragment includes the canonical series fragment", () => {
    const s = buildSectionSeriesFragment(true);
    expect(s).toContain("SERIES CONTINUITY");
    expect(s).toContain(renderSeriesContinuityFragment());
  });

  it("buildSectionFormatting includes chapter number", () => {
    const s = buildSectionFormatting(4);
    expect(s).toContain("# Chapter 4");
  });

  it("buildSectionBookContext and prior mirror headings", () => {
    const c = buildSectionBookContext("CTX");
    expect(c).toBe("## Book context\nCTX");
    const p = buildSectionPriorSummaries("PR");
    expect(p).toBe("## Prior chapter summaries\nPR");
  });

  it("buildSectionFailureModes: NF vs fiction", () => {
    const nf = buildSectionFailureModes("non_fiction");
    expect(nf).toMatch(/What makes AI non-fiction fail/);
    const fic = buildSectionFailureModes("fiction");
    expect(fic).toMatch(/EXPLAINING INSTEAD OF SHOWING/);
    const ficDef = buildSectionFailureModes(null);
    expect(ficDef).toBe(fic);
  });

  it("banned phrases + craft are fiction-only", () => {
    expect(buildSectionBannedPhrases("non_fiction")).toBe("");
    expect(buildSectionFictionCraftRequirements("non_fiction")).toBe("");
    expect(buildSectionBannedPhrases("fiction")).toContain("SLOP FILTERS");
    expect(buildSectionFictionCraftRequirements("fiction")).toContain(
      "CONTINUITY",
    );
  });

  it("open/header lines include target word count formatting", () => {
    const o = buildNonFictionChapterOpen(2, "Title", 12_000);
    expect(o).toContain("12,000");
    expect(o).toContain("Chapter 2: \"Title\"");
    const h = buildFictionChapterHeader(2, "Title", 12_000);
    expect(h).toContain("12,000");
  });
});

describe("getChapterSystemPrompt composition", () => {
  it("is stable for fixed fiction and nonfiction inputs (golden)", () => {
    const bookContext = "BOOK_CTX";
    const prior = "PRIOR_ONE";
    const args = {
      characterBible: "BIBLE",
      voice: "Prose for voice only.",
    } as const;
    const fiction = getChapterSystemPrompt(
      1,
      "Chapter title",
      5000,
      bookContext,
      prior,
      args.characterBible,
      null,
      args.voice,
      true,
    );
    const nonFic = getChapterSystemPrompt(
      1,
      "Chapter title",
      5000,
      bookContext,
      prior,
      args.characterBible,
      "non_fiction",
      args.voice,
      true,
    );
    expect(fiction).toMatchSnapshot("fiction");
    expect(nonFic).toMatchSnapshot("nonfiction");
  });
});

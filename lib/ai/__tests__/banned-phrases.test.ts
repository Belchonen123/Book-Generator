import { describe, expect, it } from "vitest";

import { getChapterSystemPrompt } from "@/lib/ai/prompt-templates";
import { buildSectionBannedPhrases } from "@/lib/openai/chapter-system-prompt-sections";
import {
  BANNED_PHRASES,
  renderBannedPhrasesBlock,
  renderLiteraryFictionBannedList,
  renderLiteraryNonFictionBusinessList,
} from "@/lib/ai/banned-phrases";

describe("renderBannedPhrasesBlock", () => {
  it("produces stable fiction (chapter) SLOP text", () => {
    expect(renderBannedPhrasesBlock("fiction")).toMatchSnapshot("chapter-fiction");
  });
  it("produces stable nonfiction BANNED MOVES block", () => {
    expect(renderBannedPhrasesBlock("non_fiction")).toMatchSnapshot("chapter-nonf");
  });
  it("produces stable blurb inline fragment", () => {
    expect(renderBannedPhrasesBlock("blurb")).toMatchSnapshot("blurb");
  });
  it("produces stable rewrite tics string", () => {
    expect(renderBannedPhrasesBlock("rewrite")).toMatchSnapshot("rewrite");
  });
});

describe("BANNED_PHRASES registry", () => {
  it("exposes a non-empty list", () => {
    expect(BANNED_PHRASES.length).toBeGreaterThan(10);
  });
});

describe("literary list renderers", () => {
  it("renders the literary fiction # BANNED PHRASES list", () => {
    expect(renderLiteraryFictionBannedList()).toMatchSnapshot("literary-fiction");
  });
  it("renders the literary nonfiction business slop list", () => {
    expect(renderLiteraryNonFictionBusinessList()).toMatchSnapshot("literary-nf");
  });
});

describe("injection points", () => {
  it("chapter fiction SLOP matches buildSectionBannedPhrases (fiction)", () => {
    expect(buildSectionBannedPhrases("fiction")).toBe(
      renderBannedPhrasesBlock("fiction"),
    );
  });
  it("getChapterSystemPrompt still embeds the SLOP block (fiction path)", () => {
    const p = getChapterSystemPrompt(1, "T", 2000, "c", "p", null, null, null, false);
    expect(p).toContain("SLOP FILTERS");
    expect(p).toContain("Her eyes twinkled / widened");
  });
});

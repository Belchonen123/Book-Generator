import { describe, expect, it } from "vitest";

import {
  getCharacterBiblePromptForBookType,
  getChapterSystemPrompt,
  getChapterSystemPromptForBookType,
  getCoverPromptSystemPrompt,
  getIdeaRefinementPromptForBookType,
  getIdeaRefinementSystemPrompt,
  getKDPInstructionsPrompt,
  getNonFictionChapterSystemPrompt,
  getNonFictionIdeaRefinementSystemPrompt,
  getNonFictionOutlineSystemPrompt,
  getOutlineFictionPhaseASystemPrompt,
  getOutlineFictionPhaseBSystemPrompt,
  getOutlineSystemPrompt,
  getOutlineSystemPromptForBookType,
} from "@/lib/ai/prompt-templates";

describe("prompt templates", () => {
  it("getIdeaRefinementSystemPrompt returns a non-empty string", () => {
    const s = getIdeaRefinementSystemPrompt();
    expect(s.length).toBeGreaterThan(200);
    expect(s).toContain("REFINED_IDEA");
    expect(s).toContain("senior book development editor");
    expect(s).toContain("protagonist_core_wound");
    expect(s).toContain("ONE focused question per turn");
  });

  it("getOutlineSystemPrompt returns JSON shape and story-bible outline rules", () => {
    const s = getOutlineSystemPrompt();
    expect(s.length).toBeGreaterThan(200);
    expect(s).toContain('"chapters"');
    expect(s).toContain("book_canon_digest");
    expect(s).toContain("story_bible_anchors");
    expect(s).toContain("continuity_from_prior_chapters");
    expect(s).toContain("tension_level");
    expect(s).toContain("reader_takeaway");
    expect(s).toContain("every_character_in_this_chapter");
    expect(s).toContain("every_location_and_time");
    expect(s).toContain("every_prop_object_and_key_detail");
    expect(s).toContain("every_concept_term_and_rule");
    expect(s).toContain("mandatory_beats_checklist");
    expect(s).toContain("STEP 1");
    expect(s).toContain("STORY BIBLE");
  });

  it("getChapterSystemPrompt interpolates chapter metadata and context", () => {
    const s = getChapterSystemPrompt(
      3,
      "The River",
      4200,
      "Genre: literary fiction. Tone: warm.",
      ["Previously the hero left town.", "A storm approached."],
    );
    expect(s).toMatch(/Chapter 3:\s*"The River"/);
    expect(s).toMatch(/TARGET:.*4[,.]?200/);
    expect(s).toContain("Genre: literary fiction");
    expect(s).toContain("EXPLAINING INSTEAD OF SHOWING");
    expect(s).toContain("SLOP FILTERS");
    expect(s).toContain("Prior chapter 1");
    expect(s).toContain("Previously the hero left town.");
    expect(s).toContain("Prior chapter 2");
    expect(s).toContain("## Book context");
  });

  it("getChapterSystemPrompt handles string prior summaries", () => {
    const s = getChapterSystemPrompt(1, "Open", 1000, "", "Only one prior.");
    expect(s).toContain("Only one prior.");
  });

  it("getChapterSystemPrompt adds fiction character bible block when provided", () => {
    const s = getChapterSystemPrompt(
      2,
      "Mirror",
      2000,
      "Book title: Test",
      ["Prior beat."],
      '{"characters":[{"name":"Ava"}]}',
    );
    expect(s).toContain("Character reference (hard continuity");
    expect(s).toContain('{"characters":[{"name":"Ava"}]}');
    expect(s).toContain("Prior chapter 1");
  });

  it("getChapterSystemPrompt non-fiction path uses author voice block for bible", () => {
    const s = getChapterSystemPrompt(
      1,
      "Hook",
      2000,
      "Ctx",
      [],
      "Voice notes",
      "non_fiction",
    );
    expect(s).toContain("non-fiction author");
    expect(s).toContain("Author voice and positioning (treat as canon)");
    expect(s).toContain("Voice notes");
  });

  it("getChapterSystemPrompt injects voice anchor block when provided", () => {
    const s = getChapterSystemPrompt(
      2,
      "Tide",
      2000,
      "Context",
      [],
      null,
      null,
      "A short sample paragraph. It has two sentences.",
    );
    expect(s).toContain("VOICE ANCHOR (imitate this register)");
    expect(s).toContain("~~~");
    expect(s).toContain("A short sample paragraph.");
  });

  it("getCharacterBiblePromptForBookType requests JSON bible output", () => {
    const s = getCharacterBiblePromptForBookType("fiction");
    expect(s.length).toBeGreaterThan(100);
    expect(s).toContain("characters");
    expect(s).toContain("physical_description");
    expect(s).toContain("nervous_habit");
    expect(s).toContain("Specificity produces specificity");
  });

  it("getIdeaRefinementPromptForBookType switches non-fiction copy", () => {
    const nf = getIdeaRefinementPromptForBookType("non_fiction");
    expect(nf).toContain("acquisitions editor");
    expect(getNonFictionIdeaRefinementSystemPrompt().length).toBeGreaterThan(200);
    const fic = getIdeaRefinementPromptForBookType("fiction");
    expect(fic).toContain("book development editor");
    expect(fic).toEqual(getIdeaRefinementSystemPrompt());
  });

  it("getOutlineSystemPromptForBookType switches outline shape hints", () => {
    expect(getOutlineSystemPromptForBookType("fiction")).toContain("book_canon_digest");
    expect(getOutlineSystemPromptForBookType("fiction")).toContain("story_bible_anchors");
    expect(getOutlineSystemPromptForBookType("fiction")).toContain("tension_level");
    expect(getOutlineSystemPromptForBookType("non_fiction")).toContain("reader_takeaway");
    expect(getOutlineSystemPromptForBookType("non_fiction")).toContain("manuscript_bible_digest");
    expect(getNonFictionOutlineSystemPrompt()).toContain("content_type");
    expect(getNonFictionOutlineSystemPrompt()).toContain("every_voice_person_or_source");
    expect(getNonFictionOutlineSystemPrompt()).toContain("every_example_evidence_or_datum");
    expect(getNonFictionOutlineSystemPrompt()).toContain("mandatory_beats_checklist");
  });

  it("getOutlineFictionPhaseASystemPrompt is structural only (Prompt 17)", () => {
    const s = getOutlineFictionPhaseASystemPrompt();
    expect(s).toContain("chapter_ends_with");
    expect(s).toContain("characters_introduced");
    expect(s).toContain("Do **not** include book_canon_digest");
  });

  it("getOutlineFictionPhaseBSystemPrompt lists inventory fields for enrichment", () => {
    const s = getOutlineFictionPhaseBSystemPrompt();
    expect(s).toContain("every_character_in_this_chapter");
    expect(s).toContain("book_canon_digest");
    expect(s).toContain("enrichments");
  });

  it("getChapterSystemPromptForBookType returns craft blocks", () => {
    expect(getChapterSystemPromptForBookType("non_fiction")).toContain("Nonfiction-specific");
    expect(getChapterSystemPromptForBookType("non_fiction")).toContain("BANNED MOVES");
    expect(getChapterSystemPromptForBookType("fiction")).toContain("Fiction-specific");
    expect(getChapterSystemPromptForBookType("fiction")).toContain("POV: Stay locked");
    expect(getChapterSystemPromptForBookType("fiction")).toContain("picture-book narrator");
  });

  it("getNonFictionChapterSystemPrompt matches getChapterSystemPrompt with non_fiction", () => {
    const viaWrapper = getNonFictionChapterSystemPrompt(1, "Hook", 1800, "ctx", [], "terms");
    const direct = getChapterSystemPrompt(1, "Hook", 1800, "ctx", [], "terms", "non_fiction", null);
    expect(viaWrapper).toEqual(direct);
    expect(viaWrapper).toContain("Author voice and positioning (treat as canon)");
  });

  it("getCoverPromptSystemPrompt includes book fields", () => {
    const s = getCoverPromptSystemPrompt(
      "North Line",
      "Thriller",
      "A missing train.",
      "Tense",
    );
    expect(s).toContain('Title "North Line"');
    expect(s).toContain("Genre: Thriller");
    expect(s).toContain("A missing train.");
    expect(s).toContain("Tone: Tense");
  });

  it("getKDPInstructionsPrompt interpolates title and genre", () => {
    const s = getKDPInstructionsPrompt("  Sea Glass  ", "  Cozy mystery ");
    expect(s).toContain('titled "Sea Glass"');
    expect(s).toContain("Cozy mystery");
    expect(s).toContain("Sea Glass");
  });

  it("getKDPInstructionsPrompt falls back when title or genre empty", () => {
    const s = getKDPInstructionsPrompt("  ", "");
    expect(s).toContain("Untitled work");
    expect(s).toContain("General fiction");
  });
});

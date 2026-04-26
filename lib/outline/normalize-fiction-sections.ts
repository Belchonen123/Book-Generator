import type { FictionChapterStructural } from "@/lib/outline/fiction-outline-schemas";
import type { OutlineSectionPayload } from "@/lib/outline/section-payload";

/**
 * Phase A only → stored outline rows. Inventory fields are empty until Phase B.
 */
export function normalizeFictionStructuralSections(
  chapters: FictionChapterStructural[],
): OutlineSectionPayload[] {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return sorted.map((c, index) => ({
    number: index + 1,
    title: c.title.trim(),
    description: c.description.trim(),
    tension_level: c.tension_level ?? 5,
    opening_psychological_move: (c.opening_psychological_move ?? "").trim(),
    signature_chapter_detail: (c.signature_chapter_detail ?? "").trim(),
    ending_opens_what: (c.ending_opens_what ?? "").trim(),
    chapter_ends_with: (c.chapter_ends_with ?? "").trim(),
    characters_introduced:
      Array.isArray(c.characters_introduced) && c.characters_introduced.length > 0
        ? c.characters_introduced.map((s) => s.trim()).filter(Boolean)
        : undefined,
    book_canon_digest: "",
    story_bible_anchors: "",
    character_state: "",
    continuity_from_prior_chapters: "",
    stakes_and_costs: "",
    motifs_and_restraint: "",
    reader_takeaway: "",
    every_character_in_this_chapter: "",
    every_location_and_time: "",
    every_prop_object_and_key_detail: "",
    every_concept_term_and_rule: "",
    mandatory_beats_checklist: "",
    forced_codex_entry_ids: undefined,
  }));
}

/**
 * Full fiction outline (structural + inventory merged). Partial inventory is OK
 * (empty strings) while Phase B is still running.
 */
export function normalizeFictionSections(chapters: OutlineSectionPayload[]): OutlineSectionPayload[] {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return sorted.map((c, index) => ({
    number: index + 1,
    title: c.title.trim(),
    description: c.description.trim(),
    book_canon_digest: (c.book_canon_digest ?? "").trim(),
    story_bible_anchors: (c.story_bible_anchors ?? "").trim(),
    character_state: (c.character_state ?? "").trim(),
    continuity_from_prior_chapters: (c.continuity_from_prior_chapters ?? "").trim(),
    stakes_and_costs: (c.stakes_and_costs ?? "").trim(),
    motifs_and_restraint: (c.motifs_and_restraint ?? "").trim(),
    opening_psychological_move: (c.opening_psychological_move ?? "").trim(),
    signature_chapter_detail: (c.signature_chapter_detail ?? "").trim(),
    ending_opens_what: (c.ending_opens_what ?? "").trim(),
    tension_level: c.tension_level ?? 5,
    reader_takeaway: (c.reader_takeaway ?? "").trim(),
    chapter_ends_with: (c.chapter_ends_with ?? "").trim(),
    characters_introduced:
      Array.isArray(c.characters_introduced) && c.characters_introduced.length > 0
        ? c.characters_introduced.map((s) => String(s).trim()).filter(Boolean)
        : undefined,
    every_character_in_this_chapter: (c.every_character_in_this_chapter ?? "").trim(),
    every_location_and_time: (c.every_location_and_time ?? "").trim(),
    every_prop_object_and_key_detail: (c.every_prop_object_and_key_detail ?? "").trim(),
    every_concept_term_and_rule: (c.every_concept_term_and_rule ?? "").trim(),
    mandatory_beats_checklist: (c.mandatory_beats_checklist ?? "").trim(),
    forced_codex_entry_ids:
      Array.isArray(c.forced_codex_entry_ids) && c.forced_codex_entry_ids.length > 0
        ? c.forced_codex_entry_ids.map((s) => String(s).trim()).filter(Boolean)
        : undefined,
  }));
}

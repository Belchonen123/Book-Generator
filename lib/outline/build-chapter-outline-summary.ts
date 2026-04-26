/**
 * Builds the full `chapters.outline_summary` text from outline section fields.
 * Used by generate-outline API and OutlineEditor persist so chapter generation
 * always receives the same rich bible block after save.
 */
export type ChapterOutlineSummaryInput = {
  description: string;
  content_type?: string;
  reader_takeaway?: string;
  book_canon_digest?: string;
  story_bible_anchors?: string;
  character_state?: string;
  continuity_from_prior_chapters?: string;
  stakes_and_costs?: string;
  motifs_and_restraint?: string;
  opening_psychological_move?: string;
  signature_chapter_detail?: string;
  ending_opens_what?: string;
  tension_level?: number;
  chapter_ends_with?: string;
  characters_introduced?: string[];
  opening_hook_move?: string;
  signature_example?: string;
  bridges_to_next?: string;
  evidence_notes?: string;
  manuscript_bible_digest?: string;
  stakes_for_reader?: string;
  counterargument_or_tension?: string;
  every_character_in_this_chapter?: string;
  every_location_and_time?: string;
  every_prop_object_and_key_detail?: string;
  every_concept_term_and_rule?: string;
  mandatory_beats_checklist?: string;
  every_voice_person_or_source?: string;
  every_context_setting_or_timeframe?: string;
  every_example_evidence_or_datum?: string;
  every_term_framework_or_rule?: string;
};

function append(label: string, body: string | undefined): string {
  const t = body?.trim();
  if (!t) return "";
  return `\n\n${label}\n${t}`;
}

export function buildChapterOutlineSummary(s: ChapterOutlineSummaryInput): string {
  const isNonFiction = Boolean(s.content_type?.trim());
  if (isNonFiction) {
    return [
      s.description,
      append("EVERY VOICE, PERSON, OR SOURCE (THIS CHAPTER)", s.every_voice_person_or_source),
      append("EVERY CONTEXT, SETTING, OR TIMEFRAME", s.every_context_setting_or_timeframe),
      append("EVERY EXAMPLE, EVIDENCE, OR DATUM", s.every_example_evidence_or_datum),
      append("EVERY TERM, FRAMEWORK, OR RULE", s.every_term_framework_or_rule),
      append("MANDATORY BEATS CHECKLIST", s.mandatory_beats_checklist),
      append("MANUSCRIPT BIBLE (BOOK-WIDE CANON)", s.manuscript_bible_digest),
      append("CONTINUITY FROM PRIOR CHAPTERS", s.continuity_from_prior_chapters),
      append("READER TAKEAWAY", s.reader_takeaway),
      append("STAKES FOR THE READER", s.stakes_for_reader),
      append("COUNTERARGUMENT OR TENSION TO OVERCOME", s.counterargument_or_tension),
      append("OPENING HOOK MOVE", s.opening_hook_move),
      append("SIGNATURE EXAMPLE", s.signature_example),
      append("BRIDGES TO NEXT CHAPTER", s.bridges_to_next),
      append("EVIDENCE / NOTES", s.evidence_notes),
    ]
      .join("")
      .trim();
  }

  const tensionNote =
    typeof s.tension_level === "number"
      ? `\n\nPLANNED TENSION LEVEL (1–10): ${s.tension_level}`
      : "";

  const charIntro =
    Array.isArray(s.characters_introduced) && s.characters_introduced.length > 0
      ? s.characters_introduced.join("; ")
      : undefined;

  return [
    s.description,
    append("CHAPTER ENDS WITH (FINAL BEAT ON THE PAGE)", s.chapter_ends_with),
    append("CHARACTERS INTRODUCED (STRUCTURAL PASS)", charIntro),
    append("EVERY CHARACTER IN THIS CHAPTER", s.every_character_in_this_chapter),
    append("EVERY LOCATION AND TIME", s.every_location_and_time),
    append("EVERY PROP, OBJECT, AND KEY DETAIL", s.every_prop_object_and_key_detail),
    append("EVERY CONCEPT, TERM, AND RULE", s.every_concept_term_and_rule),
    append("MANDATORY BEATS CHECKLIST", s.mandatory_beats_checklist),
    append("BOOK CANON DIGEST (NON-NEGOTIABLE)", s.book_canon_digest),
    append("STORY BIBLE ANCHORS FOR THIS CHAPTER", s.story_bible_anchors),
    append("CHARACTER STATE ENTERING THIS CHAPTER", s.character_state),
    append("CONTINUITY FROM PRIOR CHAPTERS", s.continuity_from_prior_chapters),
    append("STAKES AND COSTS THIS CHAPTER", s.stakes_and_costs),
    append("MOTIFS AND CRAFT RESTRAINT", s.motifs_and_restraint),
    append("OPENING PSYCHOLOGICAL MOVE", s.opening_psychological_move),
    append("SIGNATURE CHAPTER DETAIL", s.signature_chapter_detail),
    append("ENDING MUST OPEN (NEXT-CHAPTER HOOK)", s.ending_opens_what),
    append("THIS CHAPTER MUST MAKE THE READER FEEL OR UNDERSTAND", s.reader_takeaway),
    tensionNote,
  ]
    .join("")
    .trim();
}

/**
 * Per-chapter row stored in `outlines.sections` (JSONB) for generate-outline
 * and merged two-pass (fiction) results.
 */
export type OutlineSectionPayload = {
  number: number;
  title: string;
  description: string;
  /** Fiction: compressed book-wide canon repeated each chapter for self-contained generation. */
  book_canon_digest?: string;
  /** Fiction: anchors tying this chapter to the locked story bible. */
  story_bible_anchors?: string;
  /** Fiction: emotional/motivational state of named characters entering the chapter. */
  character_state?: string;
  /** Fiction: causal facts in play from prior chapters. */
  continuity_from_prior_chapters?: string;
  stakes_and_costs?: string;
  motifs_and_restraint?: string;
  tension_level?: number;
  character_moment?: string;
  chapter_ends_with?: string;
  characters_introduced?: string[];
  /** Fiction: craft target for how the chapter opens (psychology before scenery). */
  opening_psychological_move?: string;
  /** Fiction: one concrete object/sensory/detail the draft must include. */
  signature_chapter_detail?: string;
  /** Fiction: new question or problem the ending sets up for the next chapter. */
  ending_opens_what?: string;
  reader_takeaway?: string;
  content_type?: string;
  evidence_notes?: string;
  /** Non-fiction: opening hook, not topic setup. */
  opening_hook_move?: string;
  /** Non-fiction: anchor example or through-line. */
  signature_example?: string;
  /** Non-fiction: tension or question the ending passes to the next chapter. */
  bridges_to_next?: string;
  /** Non-fiction: compressed thesis/reader arc repeated each chapter. */
  manuscript_bible_digest?: string;
  stakes_for_reader?: string;
  counterargument_or_tension?: string;
  /** Fiction: exhaustive cast inventory for this chapter. */
  every_character_in_this_chapter?: string;
  every_location_and_time?: string;
  every_prop_object_and_key_detail?: string;
  every_concept_term_and_rule?: string;
  mandatory_beats_checklist?: string;
  /** Fiction: codex IDs force-included during chapter generation. */
  forced_codex_entry_ids?: string[];
  /** Non-fiction: exhaustive inventories. */
  every_voice_person_or_source?: string;
  every_context_setting_or_timeframe?: string;
  every_example_evidence_or_datum?: string;
  every_term_framework_or_rule?: string;
};

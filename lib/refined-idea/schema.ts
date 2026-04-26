import { z } from "zod";

/** Protagonist / antagonist blocks in `<REFINED_IDEA>` JSON. */
export const IdeaBriefFictionRoleBlockSchema = z
  .object({
    name: z.string().optional(),
    name_or_description: z.string().optional(),
    age: z.string().optional(),
    occupation_or_role: z.string().optional(),
    want: z.string().optional(),
    need: z.string().optional(),
    wound: z.string().optional(),
    fatal_flaw: z.string().optional(),
    embarrassing_habit: z.string().optional(),
    specific_habit: z.string().optional(),
    wrong_belief_at_start: z.string().optional(),
    true_belief_at_end: z.string().optional(),
    motivation: z.string().optional(),
    valid_point: z.string().optional(),
    personal_stake: z.string().optional(),
  })
  .passthrough();

export type IdeaBriefFictionRoleBlock = z.infer<
  typeof IdeaBriefFictionRoleBlockSchema
>;

/**
 * Zod model for `books.refined_idea` (jsonb). Unknown keys are kept for
 * forward compatibility.
 */
export const RefinedIdeaBriefSchema = z
  .object({
    title: z.string().optional(),
    suggested_title: z.string().optional(),
    subtitle: z.string().optional(),
    title_alternates: z.array(z.string()).optional(),
    genre: z.string().optional(),
    subgenre: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    target_audience: z.string().optional(),
    audience: z.string().optional(),
    target_reader: z.string().optional(),
    comparable_titles: z.array(z.string()).optional(),
    protagonist: IdeaBriefFictionRoleBlockSchema.optional(),
    antagonist: IdeaBriefFictionRoleBlockSchema.optional(),
    try_fail_cycle: z.string().optional(),
    narrator_mode: z.string().optional(),
    dominant_emotion: z.string().optional(),
    signature_image: z.string().optional(),
    signature_scene: z.string().optional(),
    specific_world_detail: z.string().optional(),
    core_premise: z.string().optional(),
    premise: z.string().optional(),
    one_sentence_thesis: z.string().optional(),
    unique_angle: z.string().optional(),
    emotional_contract: z.string().optional(),
    arc_shape: z.string().optional(),
    /** Legacy alias; prefer `reader_before_state`. */
    before_state: z.string().optional(),
    /** Legacy alias; prefer `reader_after_state`. */
    after_state: z.string().optional(),
    reader_before_state: z.string().optional(),
    reader_after_state: z.string().optional(),
    what_comps_get_wrong: z.string().optional(),
    author_credibility: z.string().optional(),
    structure_type: z.string().optional(),
    evidence_base: z.string().optional(),
    hardest_objection: z.string().optional(),
    signature_case_study: z.string().optional(),
    tone: z.string().optional(),
    tone_and_style: z.string().optional(),
    dominant_tone: z.string().optional(),
    themes: z.union([z.string(), z.array(z.string())]).optional(),
    key_themes: z.union([z.string(), z.array(z.string())]).optional(),
    voice_anchor: z.string().optional(),
    voice_anchor_source: z.string().optional(),
    cultural_texture: z.string().optional(),
    authorial_stance: z.string().optional(),
    specific_openers: z.array(z.string()).optional(),
    forbidden_moves: z.union([z.string(), z.array(z.string())]).optional(),
    codex_characters: z.union([z.string(), z.array(z.string())]).optional(),
    codex_locations: z.union([z.string(), z.array(z.string())]).optional(),
    codex_objects: z.union([z.string(), z.array(z.string())]).optional(),
    codex_factions: z.union([z.string(), z.array(z.string())]).optional(),
    codex_lore: z.union([z.string(), z.array(z.string())]).optional(),
    codex_subplots: z.union([z.string(), z.array(z.string())]).optional(),
    estimated_length: z.string().optional(),
    chapters: z.number().optional(),
    word_count: z.number().optional(),
    principle_count: z.number().optional(),
    includes_exercises: z.boolean().optional(),
    includes_case_studies: z.boolean().optional(),
  })
  .passthrough();

export type RefinedIdeaBrief = z.infer<typeof RefinedIdeaBriefSchema>;

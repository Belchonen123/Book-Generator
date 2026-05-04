import { z } from "zod";

const MAX_FICTION_CHAPTER_STRUCTS = 40;

function firstNonEmptyString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0 && !/^tbd\b/i.test(t)) return t;
    }
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function pickString(c: Record<string, unknown>, keys: string[]): string {
  return firstNonEmptyString(...keys.map((key) => c[key]));
}

function pickStringFromAny(sources: Record<string, unknown>[], keys: string[]): string {
  for (const source of sources) {
    const value = pickString(source, keys);
    if (value) return value;
  }
  return "";
}

function fallbackDescriptionFromOutlineFields(c: Record<string, unknown>): string {
  const nestedSources = [
    c,
    isRecord(c.outline) ? c.outline : null,
    isRecord(c.structure) ? c.structure : null,
    isRecord(c.beats) ? c.beats : null,
  ].filter(isRecord);

  const emotionalContract = pickStringFromAny(nestedSources, [
    "emotional_contract",
    "emotionalContract",
    "reader_emotional_contract",
    "readerEmotionalContract",
  ]);
  const opening = pickStringFromAny(nestedSources, [
    "opening_psychological_move",
    "openingPsychologicalMove",
    "opening_move",
    "openingMove",
    "opening_hook_move",
    "openingHookMove",
    "opening_hook",
    "openingHook",
    "first_beat",
    "firstBeat",
  ]);
  const want = pickStringFromAny(nestedSources, [
    "who_wants_what",
    "whoWantsWhat",
    "chapter_goal",
    "chapterGoal",
    "goal",
    "wants",
    "desire",
  ]);
  const obstacle = pickStringFromAny(nestedSources, [
    "what_stops_them",
    "whatStopsThem",
    "obstacle",
    "conflict",
    "antagonistic_force",
    "antagonisticForce",
  ]);
  const whatHappens = pickStringFromAny(nestedSources, [
    "what_happens",
    "whatHappens",
    "chapter_events",
    "chapterEvents",
    "main_events",
    "mainEvents",
    "scene_events",
    "sceneEvents",
  ]);
  const failureOrCost = pickStringFromAny(nestedSources, [
    "try_fail_cost",
    "tryFailCost",
    "failure_or_cost",
    "failureOrCost",
    "how_it_fails",
    "howItFails",
    "cost",
    "consequence",
    "complication",
    "stakes",
  ]);
  const whatChanges = pickStringFromAny(nestedSources, [
    "what_changes",
    "whatChanges",
    "irreversible_change",
    "irreversibleChange",
    "turning_point",
    "turningPoint",
    "character_moment",
    "characterMoment",
  ]);
  const signature = pickStringFromAny(nestedSources, [
    "signature_chapter_detail",
    "signatureChapterDetail",
    "signature_detail",
    "signatureDetail",
    "signature_example",
    "signatureExample",
    "unique_detail",
    "uniqueDetail",
  ]);
  const finalBeat = pickStringFromAny(nestedSources, [
    "chapter_ends_with",
    "chapterEndsWith",
    "chapter_end",
    "chapterEnd",
    "final_beat",
    "finalBeat",
    "ending",
    "ending_beat",
    "endingBeat",
    "closing_beat",
    "closingBeat",
  ]);
  const nextProblem = pickStringFromAny(nestedSources, [
    "ending_opens_what",
    "endingOpensWhat",
    "question_the_chapter_opens",
    "questionTheChapterOpens",
    "question_chapter_opens",
    "questionChapterOpens",
    "question_that_pulls_forward",
    "questionThatPullsForward",
    "question_pulls_next",
    "questionPullsNext",
    "bridges_to_next",
    "bridgesToNext",
    "next_question",
    "nextQuestion",
    "chapter_question",
    "chapterQuestion",
    "hook_to_next",
    "hookToNext",
  ]);

  const parts = [
    emotionalContract ? `Reader emotional contract: ${emotionalContract}` : "",
    opening ? `Opening move: ${opening}` : "",
    want ? `Chapter want: ${want}` : "",
    obstacle ? `Obstacle: ${obstacle}` : "",
    whatHappens ? `What happens: ${whatHappens}` : "",
    failureOrCost ? `Failure, cost, or complication: ${failureOrCost}` : "",
    whatChanges ? `What changes: ${whatChanges}` : "",
    signature ? `Signature detail: ${signature}` : "",
    finalBeat ? `Final beat: ${finalBeat}` : "",
    nextProblem ? `Next problem or question: ${nextProblem}` : "",
  ].filter(Boolean);
  return parts.length >= 2 ? parts.join(" ") : "";
}

function pickArrayStrings(c: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const v = c[key];
    if (Array.isArray(v)) {
      const arr = v
        .map((x) => {
          if (typeof x === "string") return x.trim();
          if (isRecord(x)) return firstNonEmptyString(x.name, x.title, x.character);
          return String(x ?? "").trim();
        })
        .filter(Boolean);
      if (arr.length > 0) return arr;
    }
    if (typeof v === "string") {
      const arr = v
        .split(/[,;]|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length > 0) return arr;
    }
  }
  return [];
}

function coerceChapterNumber(c: Record<string, unknown>, index: number): number {
  const rawNum =
    c.number ??
    c.chapter_number ??
    c.chapterNumber ??
    c.chapter_num ??
    c.chapterNum ??
    c.chapter ??
    c.ch ??
    c.index ??
    c.order;

  if (typeof rawNum === "number" && Number.isFinite(rawNum)) {
    return Math.max(1, Math.trunc(rawNum));
  }

  const p = parseInt(String(rawNum ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(p) && p > 0 ? p : index + 1;
}

function coerceTension(c: Record<string, unknown>): number {
  const tv = c.tension_level ?? c.tensionLevel ?? c.tension ?? c.pressure_level ?? c.pressureLevel;
  if (typeof tv === "number" && Number.isFinite(tv)) {
    return Math.min(10, Math.max(1, Math.round(tv)));
  }
  if (typeof tv === "string" && tv.trim() !== "") {
    const t = parseInt(tv.replace(/[^\d-]/g, ""), 10);
    if (Number.isFinite(t)) {
      return Math.min(10, Math.max(1, t));
    }
  }
  return 5;
}

/**
 * Normalizes model drift before Zod: alternate roots (`outline`, `data`),
 * stringly-typed numbers, empty titles/descriptions, and oversized arrays.
 * Returns a shape for {@link outlineFictionStructuralResponseSchema} or
 * the original `input` if nothing to fix.
 */
export function coerceFictionStructuralPayload(input: unknown): unknown {
  if (Array.isArray(input)) {
    input = { chapters: input };
  }

  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const root = input as Record<string, unknown>;
  let chapters: unknown = root.chapters;
  if (!Array.isArray(chapters) && Array.isArray(root.outline)) {
    chapters = root.outline;
  }
  if (!Array.isArray(chapters) && root.outline && typeof root.outline === "object") {
    chapters = (root.outline as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.data && typeof root.data === "object") {
    chapters = (root.data as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.result && typeof root.result === "object") {
    chapters = (root.result as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.book_outline && typeof root.book_outline === "object") {
    chapters = (root.book_outline as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.bookOutline && typeof root.bookOutline === "object") {
    chapters = (root.bookOutline as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && Array.isArray(root.sections)) {
    chapters = root.sections;
  }
  if (!Array.isArray(chapters)) {
    return input;
  }

  const slice = chapters.slice(0, MAX_FICTION_CHAPTER_STRUCTS);
  const out = slice.map((ch, i) => {
    if (ch == null || typeof ch !== "object" || Array.isArray(ch)) {
      return {
        number: i + 1,
        title: "",
        description: "",
        tension_level: 5,
        opening_psychological_move: "",
        signature_chapter_detail: "",
        ending_opens_what: "",
        chapter_ends_with: "",
        characters_introduced: [] as string[],
      };
    }
    const c = ch as Record<string, unknown>;
    const num = coerceChapterNumber(c, i);
    const title =
      pickString(c, [
        "title",
        "working_title",
        "workingTitle",
        "chapter_title",
        "chapterTitle",
        "chapter_name",
        "chapterName",
        "name",
        "heading",
      ]) || `Chapter ${num}`;
    const description =
      firstNonEmptyString(
        c.description,
        c.chapter_description,
        c.chapterDescription,
        c.chapter_outline,
        c.chapterOutline,
        c.outline,
        c.summary,
        c.chapter_summary,
        c.chapterSummary,
        c.synopsis,
        c.plot,
        c.scene,
        c.what_happens,
        c.whatHappens,
        c.events,
        c.main_events,
        c.mainEvents,
        c.beat_summary,
        c.beatSummary,
        c.scene_summary,
        c.sceneSummary,
        c.narrative,
        c.body,
      ) || fallbackDescriptionFromOutlineFields(c);

    return {
      number: num,
      title,
      description,
      tension_level: coerceTension(c),
      opening_psychological_move: pickString(c, [
        "opening_psychological_move",
        "openingPsychologicalMove",
        "opening_move",
        "openingMove",
        "opening_hook_move",
        "openingHookMove",
      ]),
      signature_chapter_detail: pickString(c, [
        "signature_chapter_detail",
        "signatureChapterDetail",
        "signature_detail",
        "signatureDetail",
        "signature_example",
        "signatureExample",
      ]),
      ending_opens_what: pickString(c, [
        "ending_opens_what",
        "endingOpensWhat",
        "question_the_chapter_opens",
        "questionTheChapterOpens",
        "question_chapter_opens",
        "questionChapterOpens",
        "question_that_pulls_forward",
        "questionThatPullsForward",
        "bridges_to_next",
        "bridgesToNext",
        "next_question",
        "nextQuestion",
      ]),
      chapter_ends_with: pickString(c, [
        "chapter_ends_with",
        "chapterEndsWith",
        "chapter_end",
        "chapterEnd",
        "final_beat",
        "finalBeat",
        "ending",
        "ending_beat",
        "endingBeat",
      ]),
      characters_introduced: pickArrayStrings(c, [
        "characters_introduced",
        "charactersIntroduced",
        "new_characters",
        "newCharacters",
        "characters",
      ]),
    };
  });
  return { chapters: out };
}

/** Phase A (structural) — per Prompt 17; no exhaustive inventories. */
export const fictionChapterStructuralSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  tension_level: z.number().int().min(1).max(10).optional().default(5),
  opening_psychological_move: z.string().optional().default(""),
  signature_chapter_detail: z.string().optional().default(""),
  ending_opens_what: z.string().optional().default(""),
  chapter_ends_with: z.string().optional().default(""),
  characters_introduced: z.array(z.string()).optional().default([]),
});

export const outlineFictionStructuralResponseSchema = z.object({
  chapters: z.array(fictionChapterStructuralSchema).min(1).max(40),
});

export type FictionChapterStructural = z.infer<typeof fictionChapterStructuralSchema>;

/** Phase B — inventory fields only (merged into the structural row). */
export const fictionChapterInventoryEnrichmentSchema = z.object({
  number: z.number().int().positive(),
  book_canon_digest: z.string().trim().min(1),
  story_bible_anchors: z.string().trim().min(1),
  every_character_in_this_chapter: z.string().trim().min(1),
  every_location_and_time: z.string().trim().min(1),
  every_prop_object_and_key_detail: z.string().trim().min(1),
  every_concept_term_and_rule: z.string().trim().min(1),
  mandatory_beats_checklist: z.string().trim().min(1),
  character_state: z.string().trim().min(1),
  continuity_from_prior_chapters: z.string().trim().min(1),
  stakes_and_costs: z.string().trim().min(1),
  motifs_and_restraint: z.string().trim().min(1),
  reader_takeaway: z.string().trim().min(1),
  forced_codex_entry_ids: z.array(z.string().trim().min(1)).optional().default([]),
});

export const outlineFictionInventoryBatchResponseSchema = z.object({
  enrichments: z.array(fictionChapterInventoryEnrichmentSchema).min(1),
});

export type FictionChapterInventoryEnrichment = z.infer<
  typeof fictionChapterInventoryEnrichmentSchema
>;

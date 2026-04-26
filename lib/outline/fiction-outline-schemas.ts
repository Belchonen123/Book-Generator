import { z } from "zod";

const MAX_FICTION_CHAPTER_STRUCTS = 40;

/**
 * Normalizes model drift before Zod: alternate roots (`outline`, `data`),
 * stringly-typed numbers, empty titles/descriptions, and oversized arrays.
 * Returns a shape for {@link outlineFictionStructuralResponseSchema} or
 * the original `input` if nothing to fix.
 */
export function coerceFictionStructuralPayload(input: unknown): unknown {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const root = input as Record<string, unknown>;
  let chapters: unknown = root.chapters;
  if (!Array.isArray(chapters) && root.outline && typeof root.outline === "object") {
    chapters = (root.outline as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.data && typeof root.data === "object") {
    chapters = (root.data as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.result && typeof root.result === "object") {
    chapters = (root.result as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters)) {
    return input;
  }

  const slice = chapters.slice(0, MAX_FICTION_CHAPTER_STRUCTS);
  const out = slice.map((ch, i) => {
    if (ch == null || typeof ch !== "object" || Array.isArray(ch)) {
      return {
        number: i + 1,
        title: `Chapter ${i + 1}`,
        description: "TBD",
        tension_level: 5,
        opening_psychological_move: "",
        signature_chapter_detail: "",
        ending_opens_what: "",
        chapter_ends_with: "",
        characters_introduced: [] as string[],
      };
    }
    const c = ch as Record<string, unknown>;
    const rawNum = c.number;
    let num: number;
    if (typeof rawNum === "number" && Number.isFinite(rawNum)) {
      num = Math.trunc(rawNum);
    } else {
      const p = parseInt(String(rawNum ?? "").replace(/[^\d-]/g, ""), 10);
      num = Number.isFinite(p) && p > 0 ? p : i + 1;
    }
    const title = String(c.title ?? "").trim() || `Chapter ${i + 1}`;
    const description = String(c.description ?? "").trim() || "TBD";
    let tv = c.tension_level;
    let tension = 5;
    if (typeof tv === "number" && Number.isFinite(tv)) {
      tension = Math.min(10, Math.max(1, Math.round(tv)));
    } else if (typeof tv === "string" && tv.trim() !== "") {
      const t = parseInt(tv.replace(/[^\d-]/g, ""), 10);
      if (Number.isFinite(t)) {
        tension = Math.min(10, Math.max(1, t));
      }
    }
    const str = (k: string) => String(c[k] ?? "").trim();
    const arrStr = (k: string): string[] => {
      const v = c[k];
      if (Array.isArray(v)) {
        return v.map((x) => String(x).trim()).filter(Boolean);
      }
      if (typeof v === "string") {
        return v
          .split(/[,;]|\n/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };
    return {
      number: num,
      title,
      description,
      tension_level: tension,
      opening_psychological_move: str("opening_psychological_move"),
      signature_chapter_detail: str("signature_chapter_detail"),
      ending_opens_what: str("ending_opens_what"),
      chapter_ends_with: str("chapter_ends_with"),
      characters_introduced: arrStr("characters_introduced"),
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

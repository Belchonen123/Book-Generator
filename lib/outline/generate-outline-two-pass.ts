import { getOpenAI } from "@/lib/openai/client";
import { getOutlineFictionPhaseBSystemPrompt } from "@/lib/ai/prompt-templates";
import { buildCodexBlock } from "@/lib/ai/codex-context";
import {
  buildSeriesContextBlock,
  buildSeriesContextInputForBook,
} from "@/lib/ai/series-context";
import { buildChapterOutlineSummary } from "@/lib/outline/build-chapter-outline-summary";
import {
  outlineFictionInventoryBatchResponseSchema,
  type FictionChapterInventoryEnrichment,
} from "@/lib/outline/fiction-outline-schemas";
import { normalizeFictionSections } from "@/lib/outline/normalize-fiction-sections";
import type { OutlineSectionPayload } from "@/lib/outline/section-payload";
import { logServerError } from "@/lib/utils/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

const MODEL = "gpt-4o";
const MAX_COMPLETION_TOKENS_PHASE_B = 12_288;
const DEFAULT_OUTER_BATCH = 4;
/** Outer batches run sequentially so each pass sees the latest merged outline. */

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

function patchField(prev: string | undefined, next: string | undefined): string {
  const t = (next ?? "").trim();
  return t.length > 0 ? t : (prev ?? "").trim();
}

function mergeForcedCodexIds(
  prev: string[] | undefined,
  next: string[] | undefined,
): string[] | undefined {
  const merged = Array.from(
    new Set([...(prev ?? []), ...(next ?? [])].map((s) => s.trim()).filter(Boolean)),
  );
  return merged.length > 0 ? merged : undefined;
}

export function mergeInventoryEnrichments(
  base: OutlineSectionPayload[],
  enrichments: FictionChapterInventoryEnrichment[],
): OutlineSectionPayload[] {
  const byNum = new Map(enrichments.map((e) => [e.number, e]));
  return base.map((row) => {
    const e = byNum.get(row.number);
    if (!e) {
      return row;
    }
    return {
      ...row,
      book_canon_digest: patchField(row.book_canon_digest, e.book_canon_digest),
      story_bible_anchors: patchField(row.story_bible_anchors, e.story_bible_anchors),
      every_character_in_this_chapter: patchField(
        row.every_character_in_this_chapter,
        e.every_character_in_this_chapter,
      ),
      every_location_and_time: patchField(row.every_location_and_time, e.every_location_and_time),
      every_prop_object_and_key_detail: patchField(
        row.every_prop_object_and_key_detail,
        e.every_prop_object_and_key_detail,
      ),
      every_concept_term_and_rule: patchField(
        row.every_concept_term_and_rule,
        e.every_concept_term_and_rule,
      ),
      mandatory_beats_checklist: patchField(row.mandatory_beats_checklist, e.mandatory_beats_checklist),
      character_state: patchField(row.character_state, e.character_state),
      continuity_from_prior_chapters: patchField(
        row.continuity_from_prior_chapters,
        e.continuity_from_prior_chapters,
      ),
      stakes_and_costs: patchField(row.stakes_and_costs, e.stakes_and_costs),
      motifs_and_restraint: patchField(row.motifs_and_restraint, e.motifs_and_restraint),
      reader_takeaway: patchField(row.reader_takeaway, e.reader_takeaway),
      forced_codex_entry_ids: mergeForcedCodexIds(
        row.forced_codex_entry_ids,
        e.forced_codex_entry_ids,
      ),
    };
  });
}

function chunkNumbers(nums: number[], size: number): number[][] {
  if (size < 1) {
    return nums.map((n) => [n]);
  }
  const out: number[][] = [];
  for (let i = 0; i < nums.length; i += size) {
    out.push(nums.slice(i, i + size));
  }
  return out;
}

function missingInventoryFields(section: OutlineSectionPayload): string[] {
  const required: Array<keyof OutlineSectionPayload> = [
    "book_canon_digest",
    "story_bible_anchors",
    "every_character_in_this_chapter",
    "every_location_and_time",
    "every_prop_object_and_key_detail",
    "every_concept_term_and_rule",
    "mandatory_beats_checklist",
    "character_state",
    "continuity_from_prior_chapters",
    "stakes_and_costs",
    "motifs_and_restraint",
    "reader_takeaway",
  ];
  return required.filter((k) => {
    const v = section[k];
    return typeof v !== "string" || v.trim().length === 0;
  });
}

type FetchInventoriesParams = {
  briefWithContext: string;
  structuralOutline: OutlineSectionPayload[];
  codexBlock: string;
  seriesContextBlock: string;
  onTokens: (n: number) => void;
};

/**
 * One API call; on truncation or bad parse, split chapter list in half and retry
 * (Prompt 17: 4 → 2 → 1).
 */
async function fetchInventoriesRecursive(
  p: FetchInventoriesParams,
  chapterNumbers: number[],
  options?: { strictMissingFields?: string[] },
): Promise<FictionChapterInventoryEnrichment[]> {
  if (chapterNumbers.length === 0) {
    return [];
  }

  const system = getOutlineFictionPhaseBSystemPrompt();
  const seriesSection = p.seriesContextBlock.trim()
    ? `## Series canon (do not contradict)\n${p.seriesContextBlock}\n\n`
    : "";
  const codexSection = p.codexBlock.trim()
    ? `## Worldbook (characters, locations, lore — canonical)\n${p.codexBlock}\n\n`
    : "";
  const user =
    `${seriesSection}${codexSection}` +
    `## Book brief (ground truth)\n${p.briefWithContext}\n\n` +
    `## Complete structural outline (all chapters; JSON)\n${JSON.stringify(p.structuralOutline)}\n\n` +
    `## Enrich **only** these chapter numbers in this call: ${chapterNumbers.join(", ")}\n\n` +
    (options?.strictMissingFields && options.strictMissingFields.length > 0
      ? `## Missing-field recovery mode (strict)\nFor each requested chapter, these fields were missing or blank and MUST be non-empty now: ${options.strictMissingFields.join(", ")}.\n\n`
      : "") +
    `Return { "enrichments": [ ... ] } with one object per number above, each including "number" and every inventory field.\nEvery required string field must be non-empty. If a field truly has no new items, write a concrete "N/A — ..." explanation instead of leaving it blank.\nFor "forced_codex_entry_ids", include a list of relevant Codex entry IDs from the provided <worldbook> for that chapter (use [] only when nothing is relevant).`;
  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.55,
    max_completion_tokens: MAX_COMPLETION_TOKENS_PHASE_B,
  });
  p.onTokens(
    completion.usage?.total_tokens ?? Math.ceil((system.length + user.length) / 4),
  );

  const choice = completion.choices[0];
  const hitLength = choice?.finish_reason === "length";
  const raw = choice?.message?.content;

  let parsedOk: { enrichments: FictionChapterInventoryEnrichment[] } | null = null;
  if (raw && !hitLength) {
    let obj: unknown;
    try {
      obj = JSON.parse(stripJsonFence(raw)) as unknown;
    } catch {
      obj = null;
    }
    if (obj) {
      const zod = outlineFictionInventoryBatchResponseSchema.safeParse(obj);
      if (zod.success) {
        parsedOk = zod.data;
      }
    }
  }

  if (parsedOk && !hitLength) {
    return parsedOk.enrichments;
  }

  if (chapterNumbers.length === 1) {
    logServerError(
      "outline-two-pass.inventory-truncated-chapter",
      new Error("Phase B: length or parse failure for a single-chapter batch"),
      { details: { chapter: chapterNumbers[0] } },
    );
    return [];
  }

  const mid = Math.ceil(chapterNumbers.length / 2);
  const left = chapterNumbers.slice(0, mid);
  const right = chapterNumbers.slice(mid);
  const [a, b] = await Promise.all([
    fetchInventoriesRecursive(p, left, options),
    fetchInventoriesRecursive(p, right, options),
  ]);
  return [...a, ...b];
}

export type FictionTwoPassResult = {
  sections: OutlineSectionPayload[];
  totalTokens: number;
};

type Client = SupabaseClient<Database>;

/**
 * Splits all chapters into outer batches of `DEFAULT_OUTER_BATCH`, runs up to
 * `INVENTORY_CONCURRENCY` outer batches in parallel, each of which may recurse
 * internally on truncation.
 */
export async function runFictionOutlineInventoryBatches(p: {
  supabase: Client;
  bookId: string;
  userId: string;
  bookBriefForInventory: string;
  initialSections: OutlineSectionPayload[];
  phaseATokens: number;
  onAfterBatch: (sections: OutlineSectionPayload[]) => Promise<void>;
}): Promise<FictionTwoPassResult> {
  const nums = p.initialSections.map((s) => s.number).sort((a, b) => a - b);
  const outerBatches = chunkNumbers(nums, DEFAULT_OUTER_BATCH);
  let working = p.initialSections;
  /** Phase B user prompt must see structural rows only, not prior inventory fills. */
  const structuralSnapshot = p.initialSections.map((s) => ({ ...s }));
  const codexTextContext = `${JSON.stringify(structuralSnapshot)}\n\n${p.bookBriefForInventory}`;
  const codexRes = await buildCodexBlock(p.supabase, p.bookId, codexTextContext, {
    tokenBudget: 5_000,
  });
  const { data: bookRow } = await p.supabase
    .from("books")
    .select("series_id, series_order")
    .eq("id", p.bookId)
    .eq("user_id", p.userId)
    .maybeSingle();
  const seriesContextInput = bookRow
    ? buildSeriesContextInputForBook(bookRow, p.userId)
    : undefined;
  const seriesRes = seriesContextInput
    ? await buildSeriesContextBlock({
        supabase: p.supabase,
        seriesId: seriesContextInput.seriesId,
        currentBookId: p.bookId,
        currentBookPosition: seriesContextInput.currentBookPosition,
        userId: seriesContextInput.userId,
      })
    : { block: "" };
  let totalTokens = p.phaseATokens;

  const onTok = (n: number) => {
    totalTokens += n;
  };

  const runOuterBatch = async (batch: number[]) => {
    const enrich = await fetchInventoriesRecursive(
      {
        briefWithContext: p.bookBriefForInventory,
        structuralOutline: structuralSnapshot,
        codexBlock: codexRes.block,
        seriesContextBlock: seriesRes.block,
        onTokens: onTok,
      },
      batch,
    );
    if (enrich.length > 0) {
      working = mergeInventoryEnrichments(working, enrich);
      working = normalizeFictionSections(working);
      await p.onAfterBatch(working);
    }
  };

  for (const b of outerBatches) {
    await runOuterBatch(b);
  }

  const chaptersNeedingRecovery = working
    .filter((section) => missingInventoryFields(section).length > 0)
    .map((section) => section.number);
  for (const chapterNumber of chaptersNeedingRecovery) {
    const current = working.find((s) => s.number === chapterNumber);
    if (!current) continue;
    const missing = missingInventoryFields(current);
    if (missing.length === 0) continue;
    const enrich = await fetchInventoriesRecursive(
      {
        briefWithContext: p.bookBriefForInventory,
        structuralOutline: structuralSnapshot,
        codexBlock: codexRes.block,
        seriesContextBlock: seriesRes.block,
        onTokens: onTok,
      },
      [chapterNumber],
      { strictMissingFields: missing },
    );
    if (enrich.length > 0) {
      working = mergeInventoryEnrichments(working, enrich);
      working = normalizeFictionSections(working);
      await p.onAfterBatch(working);
    }
  }

  return { sections: working, totalTokens };
}

/**
 * Update `chapters.outline_summary` for every section row.
 */
export async function syncChapterOutlineSummaries(
  supabase: Client,
  bookId: string,
  sections: OutlineSectionPayload[],
): Promise<void> {
  for (const s of sections) {
    const summary = buildChapterOutlineSummary(s);
    const { error } = await supabase
      .from("chapters")
      .update({ outline_summary: summary })
      .eq("book_id", bookId)
      .eq("chapter_number", s.number);
    if (error) {
      logServerError("outline-two-pass.sync-summary", error, { details: { bookId, n: s.number } });
    }
  }
}

export async function upsertOutlineSections(
  supabase: Client,
  bookId: string,
  sections: OutlineSectionPayload[],
  approved: boolean,
): Promise<void> {
  const sectionsJson = sections as unknown as Json;
  const { error } = await supabase.from("outlines").upsert(
    {
      book_id: bookId,
      sections: sectionsJson,
      approved,
    },
    { onConflict: "book_id" },
  );
  if (error) {
    logServerError("outline-two-pass.upsert", error, { details: { bookId } });
    throw new Error("Could not save outline.");
  }
}

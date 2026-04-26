import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/utils/errors";
import type { Database, Json } from "@/types/database.types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * Every operation we log has to map to a stable string so dashboards /
 * rollups don't splinter on typos.
 */
export type SeriesAiOperation =
  | "chapter_generation"
  | "outline_generation"
  | "continuity_check"
  | "series_summarize";

/**
 * Named continuity fragments the series context builder can emit. Keep this
 * in sync with the blocks produced by `lib/series/continuity.ts` and the
 * outline route's `seriesBlock` assembly.
 *
 * New blocks can be added without a migration — `blocks_used` is a JSONB
 * object keyed on these strings with boolean values.
 */
export type SeriesContextBlockKey =
  | "head"
  | "series_world"
  | "prior_books_list"
  | "previously_text"
  | "series_codex"
  | "progressions"
  | "arcs_in_motion";

export type SeriesContextBlocksUsed = Partial<Record<SeriesContextBlockKey, boolean>>;

/**
 * Structured view of the context fragments at generation time. Callers
 * thread this into `logSeriesAiGeneration` so the observability table
 * captures exactly what the model was shown.
 */
export type SeriesContextMeta = {
  blocksUsed: SeriesContextBlocksUsed;
  priorBooksCount: number;
  progressionsCount: number;
  codexEntriesCount: number;
  arcIds: string[];
  codexEntryIds: string[];
  priorBookIds: string[];
};

export type SeriesAiLogInput = {
  userId: string;
  seriesId: string;
  bookId?: string | null;
  chapterId?: string | null;
  operation: SeriesAiOperation;
  model?: string | null;
  context: SeriesContextMeta;
  /** Free-form diagnostic bag — token counts, status, override flags, etc. */
  metadata?: Record<string, unknown>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function emptySeriesContextMeta(): SeriesContextMeta {
  return {
    blocksUsed: {},
    priorBooksCount: 0,
    progressionsCount: 0,
    codexEntriesCount: 0,
    arcIds: [],
    codexEntryIds: [],
    priorBookIds: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Writer                                                             */
/* ------------------------------------------------------------------ */

/**
 * Append a row to `series_ai_generation_logs`. Fire-and-forget safe:
 * the returned Promise never rejects — errors are console-logged so
 * observability failures can't cascade into a failed user-facing
 * generation.
 *
 * Caller passes a Supabase client (request-bound or service role); we use
 * whichever is appropriate for the call site. RLS permits authenticated
 * inserts where `user_id = auth.uid()`, and detached background jobs use
 * the service-role client to bypass RLS.
 */
export async function logSeriesAiGeneration(
  supabase: SupabaseClient<Database>,
  input: SeriesAiLogInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("series_ai_generation_logs").insert({
      user_id: input.userId,
      series_id: input.seriesId,
      book_id: input.bookId ?? null,
      chapter_id: input.chapterId ?? null,
      operation: input.operation,
      model: input.model ?? null,
      blocks_used: input.context.blocksUsed as unknown as Json,
      prior_books_count: input.context.priorBooksCount,
      progressions_count: input.context.progressionsCount,
      codex_entries_count: input.context.codexEntriesCount,
      arc_ids: input.context.arcIds,
      codex_entry_ids: input.context.codexEntryIds,
      prior_book_ids: input.context.priorBookIds,
      metadata: (input.metadata ?? {}) as unknown as Json,
    });
    if (error) {
      logServerError("series-observability.insert", error);
    }
  } catch (e) {
    /* Observability is never allowed to throw into generation paths. */
    logServerError("series-observability.unexpected", e);
  }
}

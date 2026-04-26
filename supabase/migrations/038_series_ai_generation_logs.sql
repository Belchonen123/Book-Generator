-- Prompt 16 (OBSERVABILITY): log every series-scoped AI generation.
--
-- Spec (Prompt 16, § 362-371):
--   "Log every series-scoped AI generation with:
--      - series_id
--      - which series context block was used
--      - how many progressions were pulled
--      - which arcs influenced the prompt
--    Helps debug when users report continuity issues."
--
-- Design:
--   * A single generic log table keyed on series_id + operation. Rows are
--     append-only (no update trigger); we only insert.
--   * `blocks_used` is a JSONB object whose keys are the named continuity
--     fragments the builder emitted (head, world, prior_books, series_codex,
--     progressions, arcs, previously_text, etc.) with boolean/count values.
--     Keeping it JSONB — rather than a fixed column per block — lets us add
--     new block types without a migration.
--   * `arc_ids` / `codex_entry_ids` / `prior_book_ids` are stored as UUID[]
--     so we can answer "which arcs influenced book X's generation?" with a
--     single GIN-indexed query.
--   * `model` + token counts + a free-form `metadata` blob are captured for
--     debugging continuity regressions — these are what you'll want when a
--     user reports "the AI forgot this character arc".
--   * book_id / chapter_id are nullable because some operations (e.g. a
--     future series-level brainstorm) may not be tied to a specific chapter.
--     series_id is the only required foreign key after user_id.

CREATE TABLE IF NOT EXISTS public.series_ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,

  /* One of: 'chapter_generation', 'outline_generation', 'continuity_check',
   * 'series_summarize', plus any future series-scoped AI call. Free-form
   * TEXT so new operations land without a schema change. */
  operation TEXT NOT NULL,

  /* The model that served the call (e.g. 'claude-sonnet-4',
   * 'gpt-4o', 'gpt-4o-mini'). NULL only if the call errored before the
   * model was chosen. */
  model TEXT,

  /* Which series context blocks were injected into the prompt.
   * Shape example:
   *   {
   *     "head": true,
   *     "series_world": true,
   *     "prior_books_list": true,
   *     "series_codex": true,
   *     "progressions": true,
   *     "arcs_in_motion": false,
   *     "previously_text": true
   *   }
   * The builder writes whichever keys it produced; consumers treat missing
   * keys as "not emitted". */
  blocks_used JSONB NOT NULL DEFAULT '{}'::jsonb,

  /* Counts captured from the context builder itself, so we can answer
   * "how rich was the series context at the time?" without parsing
   * `blocks_used`. */
  prior_books_count INTEGER NOT NULL DEFAULT 0,
  progressions_count INTEGER NOT NULL DEFAULT 0,
  codex_entries_count INTEGER NOT NULL DEFAULT 0,

  /* IDs of arcs that influenced the prompt (i.e. were rendered into the
   * "Arcs in motion touching this book" block). NULL-safe via default. */
  arc_ids UUID[] NOT NULL DEFAULT '{}',

  /* IDs of series-scoped codex entries injected. Lets us debug cases
   * where an entry was edited mid-series and a chapter generation
   * predates the edit. */
  codex_entry_ids UUID[] NOT NULL DEFAULT '{}',

  /* IDs of prior books whose carryover / progressions were pulled. */
  prior_book_ids UUID[] NOT NULL DEFAULT '{}',

  /* Free-form bag: token counts, response status, override flags,
   * anything the individual call-site wants to preserve. */
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Primary read pattern: "recent AI calls for this series" in the debug UI. */
CREATE INDEX IF NOT EXISTS series_ai_generation_logs_series_created_idx
  ON public.series_ai_generation_logs(series_id, created_at DESC);
/* Cross-cut by operation for rollups. */
CREATE INDEX IF NOT EXISTS series_ai_generation_logs_series_operation_idx
  ON public.series_ai_generation_logs(series_id, operation);
/* Occasionally "show me all generations in which arc X was present". */
CREATE INDEX IF NOT EXISTS series_ai_generation_logs_arc_ids_gin
  ON public.series_ai_generation_logs USING GIN (arc_ids);

ALTER TABLE public.series_ai_generation_logs ENABLE ROW LEVEL SECURITY;

/* Ownership inherits from the series; same pattern as series_arcs. */
CREATE POLICY "Users read their own series ai logs"
  ON public.series_ai_generation_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert their own series ai logs"
  ON public.series_ai_generation_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

/* Deliberately no UPDATE / DELETE policies: logs are append-only for
 * authenticated users. Admin / service-role inserts bypass RLS and are
 * used for detached background tasks. */

COMMENT ON TABLE public.series_ai_generation_logs IS
  'Prompt 16 § 362-371: per-call observability for every series-scoped AI generation. Append-only.';

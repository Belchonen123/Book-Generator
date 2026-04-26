-- =============================================================================
-- Prompt 16.5: explicit foreshadow ↔ payoff pairs
-- =============================================================================
-- Most foreshadowing is implicit — the author drops a hint in Book 1 Ch 3
-- and later writes its payoff in Book 3 Ch 7. The existing beat table
-- already captures both as rows with `beat_type IN ('foreshadow','payoff')`.
-- What's missing is an *explicit* link between the two so the
-- foreshadowing audit report can:
--
--   1. Show a precise pairing (rather than the heuristic "nearest later
--      payoff in the same arc" that 16.4 shipped), and
--   2. Surface genuinely unmatched foreshadows (Chekhov's-gun misses) and
--      unmatched payoffs (twists that feel unearned) as distinct
--      actionable categories.
--
-- Table is intentionally narrow: one foreshadow → zero-or-one payoff,
-- plus an optional author note. Cascade-delete when either beat goes
-- away (foreshadow) or null-out (payoff) so the UI can flag the pair
-- as "payoff deleted" without losing the original author intent.
--
-- The unique constraint on `foreshadow_beat_id` enforces that every
-- foreshadow has at most one explicit pair. A single payoff, however,
-- *can* be the target of multiple foreshadows (a long-gestating reveal
-- might be seeded in several places).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.series_foreshadowing_pairs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foreshadow_beat_id UUID NOT NULL REFERENCES public.series_arc_beats(id) ON DELETE CASCADE,
  payoff_beat_id     UUID REFERENCES public.series_arc_beats(id) ON DELETE SET NULL,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (foreshadow_beat_id)
);

COMMENT ON TABLE public.series_foreshadowing_pairs IS
  'Explicit foreshadow→payoff links. ON DELETE CASCADE for foreshadow (the pair becomes meaningless), SET NULL for payoff (the link survives so the author can flag the orphaned foreshadow in the audit report).';

CREATE INDEX IF NOT EXISTS series_foreshadowing_pairs_payoff_idx
  ON public.series_foreshadowing_pairs (payoff_beat_id)
  WHERE payoff_beat_id IS NOT NULL;

-- =============================================================================
-- RLS: authorship flows through the parent arc → series.
-- =============================================================================
ALTER TABLE public.series_foreshadowing_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foreshadowing_pairs_rw
  ON public.series_foreshadowing_pairs;

CREATE POLICY foreshadowing_pairs_rw
  ON public.series_foreshadowing_pairs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM public.series_arc_beats b
        JOIN public.series_arcs a ON a.id = b.arc_id
        JOIN public.series       s ON s.id = a.series_id
       WHERE b.id = foreshadow_beat_id
         AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.series_arc_beats b
        JOIN public.series_arcs a ON a.id = b.arc_id
        JOIN public.series       s ON s.id = a.series_id
       WHERE b.id = foreshadow_beat_id
         AND s.user_id = auth.uid()
    )
    AND (
      payoff_beat_id IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.series_arc_beats b
          JOIN public.series_arcs a ON a.id = b.arc_id
          JOIN public.series       s ON s.id = a.series_id
         WHERE b.id = payoff_beat_id
           AND s.user_id = auth.uid()
      )
    )
  );

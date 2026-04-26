-- Prompt 16 (PLOT-HOLE / CONTRADICTION DETECTION): background continuity pass.
--
-- When a chapter is (re)generated we spawn a cheap background task that:
--   1. Finds which codex characters the new text mentions
--   2. Pulls their progression history (prior books + earlier chapters of
--      this book)
--   3. Asks a cheap model "is this consistent? OK or JSON contradiction"
--   4. Persists flagged items as non-blocking warnings
--
-- Spec (Prompt 16, § 294-305):
--   - "Implement as an optional background pass, togglable per project.
--      Default on for series books."
--
-- Design:
--   * Toggle lives on `books.continuity_checks_enabled`. Default TRUE; the
--     runtime gate additionally skips standalone (non-series) books, which
--     gives us "default on for series, noop elsewhere" without a
--     conditional DEFAULT expression.
--   * Warnings sit in their own table — chapters aren't blocked on the
--     content, and the author can dismiss false positives without losing
--     the passage.
--   * `status` transitions: active → dismissed (user ignored) OR
--                             active → resolved (user edited the passage).
--     `resolved_at`/`dismissed_at` captured for analytics.
--   * `codex_entry_ids` UUID[] preserved as metadata so the editor can
--     colour-code or filter warnings by character.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS continuity_checks_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.books.continuity_checks_enabled IS
  'Prompt 16: toggles the background continuity (plot-hole) pass. Effective only when the book is in a series; standalone books always skip the pass regardless of this flag.';

CREATE TABLE IF NOT EXISTS public.continuity_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  /* The passage in the new chapter that triggered the flag. Short (≤200
   * chars) so it renders in the warnings panel and can be located via
   * findExcerptRange() in the TipTap editor. */
  excerpt TEXT NOT NULL,
  /* Human-readable description of the contradiction. */
  issue TEXT NOT NULL,
  /* Optional suggestion / fix copy — often the model offers one. */
  suggestion TEXT,
  /* Which codex entries the flag touches (characters, factions, objects). */
  codex_entry_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dismissed', 'resolved')),
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  /* Raw model output for audit / debugging. */
  model_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS continuity_warnings_chapter_idx
  ON public.continuity_warnings(chapter_id);
CREATE INDEX IF NOT EXISTS continuity_warnings_book_status_idx
  ON public.continuity_warnings(book_id, status);

ALTER TABLE public.continuity_warnings ENABLE ROW LEVEL SECURITY;

/* Ownership inherits from the book; same pattern as codex_progressions. */
CREATE POLICY "Users manage continuity warnings for their own books"
  ON public.continuity_warnings
  FOR ALL
  USING (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  )
  WITH CHECK (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS continuity_warnings_touch ON public.continuity_warnings;
CREATE TRIGGER continuity_warnings_touch BEFORE UPDATE ON public.continuity_warnings
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

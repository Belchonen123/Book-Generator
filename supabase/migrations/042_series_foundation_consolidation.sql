-- 042 — Series foundation consolidation.
--
-- Prompt 16.1 ("series foundation") was largely delivered across migrations
-- 027, 030, 033, and 035. This migration closes the remaining gaps the 16.1
-- spec calls out that were never shipped, **without** reshaping anything
-- already in production:
--
--   1. series_arcs.display_color            — spec-required column, missing.
--   2. codex_progressions composite index   — (codex_entry_id, book_id)
--                                             lookup path used by the
--                                             per-book progression panel.
--   3. series updated_at trigger            — the table has an updated_at
--                                             column but no BEFORE-UPDATE
--                                             trigger, so drift was possible
--                                             when callers forgot to set it.
--   4. series_metadata.kdp_series_number_format CHECK
--                                           — unconstrained today; add a
--                                             CHECK that is the UNION of the
--                                             16.1 spec values
--                                             {standard,bracketed,no_prefix}
--                                             and the shipped UI values
--                                             {standard,roman,volume,part,none}
--                                             so both layers keep working.
--
-- Decisions intentionally NOT made here (documented so later prompts don't
-- re-open them):
--
--   * No `series_books` join table. Membership continues to live on
--     `books.series_id` + `books.series_order` (migration 027). Every action,
--     loader, realtime subscription, and tab queries that shape today.
--   * `series.description` keeps its existing name (spec calls it
--     `description_md`). Renaming would churn every query + type for no
--     behavioral win; the column is markdown-compatible as-is.
--   * No partial UNIQUE on `(books.series_id, books.series_order)` yet.
--     The current `reorderSeriesBooksAction` updates one row at a time,
--     which would violate an IMMEDIATE unique constraint mid-loop. Adding
--     the constraint requires first refactoring that action to a single
--     atomic UPDATE (or RPC). Tracked for a follow-up.
--
-- Idempotent: every statement guards with IF (NOT) EXISTS / DROP IF EXISTS,
-- so re-applying is safe.

-- =============================================================================
-- 1. series_arcs.display_color
-- =============================================================================

ALTER TABLE public.series_arcs
  ADD COLUMN IF NOT EXISTS display_color TEXT;

COMMENT ON COLUMN public.series_arcs.display_color IS
  'Optional hex color (#RRGGBB) used to tint the arc on the timeline/beat board. NULL = neutral.';

-- Keep colors well-formed so the UI can render them verbatim.
ALTER TABLE public.series_arcs
  DROP CONSTRAINT IF EXISTS series_arcs_display_color_fmt;
ALTER TABLE public.series_arcs
  ADD CONSTRAINT series_arcs_display_color_fmt CHECK (
    display_color IS NULL
    OR display_color ~ '^#[0-9A-Fa-f]{6}$'
  );

-- =============================================================================
-- 2. codex_progressions composite lookup index
-- =============================================================================

CREATE INDEX IF NOT EXISTS codex_progressions_entry_book_idx
  ON public.codex_progressions (codex_entry_id, book_id);

-- =============================================================================
-- 3. series updated_at trigger
-- =============================================================================
-- Reuses the existing helper installed by migration 030. Safe if 030 hasn't
-- yet been re-run; we redefine it here with the same body.

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS series_touch ON public.series;
CREATE TRIGGER series_touch BEFORE UPDATE ON public.series
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =============================================================================
-- 4. series_metadata.kdp_series_number_format CHECK
-- =============================================================================
-- Union of the 16.1 spec's 3 values and the app's shipped 5 values. Existing
-- rows are guaranteed to satisfy this set (they were inserted by the shipped
-- UI, which is already limited to the 5 values).

ALTER TABLE public.series_metadata
  DROP CONSTRAINT IF EXISTS series_metadata_kdp_series_number_format_chk;
ALTER TABLE public.series_metadata
  ADD CONSTRAINT series_metadata_kdp_series_number_format_chk CHECK (
    kdp_series_number_format IN (
      'standard',
      'bracketed',
      'no_prefix',
      'roman',
      'volume',
      'part',
      'none'
    )
  );

COMMENT ON COLUMN public.series_metadata.kdp_series_number_format IS
  'How book numbers are rendered on KDP / in compiled series front-matter. Valid: standard, bracketed, no_prefix (16.1 spec) or roman, volume, part, none (shipped UI).';

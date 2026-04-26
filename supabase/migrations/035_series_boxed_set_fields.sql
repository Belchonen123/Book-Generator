-- Prompt 16 — Boxed-set compilation UI (lines 308-326).
--
-- Extends the existing `series_metadata` row so the boxed-set front- and
-- back-matter editor can persist user edits between visits. All columns are
-- optional: the compiler falls back to sensible defaults (series name,
-- auto-composed reading order, profile bio) when a field is null / empty.
--
-- Idempotent: safe to re-run after a partial failure.

ALTER TABLE public.series_metadata
  ADD COLUMN IF NOT EXISTS boxed_set_dedication_md TEXT,
  ADD COLUMN IF NOT EXISTS boxed_set_author_note_md TEXT,
  ADD COLUMN IF NOT EXISTS newsletter_signup_copy_md TEXT,
  ADD COLUMN IF NOT EXISTS boxed_set_included_book_ids UUID[];

-- Length guards mirror the textarea caps enforced in the UI so corrupt
-- direct-inserts don't brick the compile pipeline.
ALTER TABLE public.series_metadata
  DROP CONSTRAINT IF EXISTS series_metadata_boxed_set_dedication_len;
ALTER TABLE public.series_metadata
  DROP CONSTRAINT IF EXISTS series_metadata_boxed_set_author_note_len;
ALTER TABLE public.series_metadata
  DROP CONSTRAINT IF EXISTS series_metadata_newsletter_signup_len;

ALTER TABLE public.series_metadata
  ADD CONSTRAINT series_metadata_boxed_set_dedication_len CHECK (
    boxed_set_dedication_md IS NULL OR char_length(boxed_set_dedication_md) <= 4000
  ),
  ADD CONSTRAINT series_metadata_boxed_set_author_note_len CHECK (
    boxed_set_author_note_md IS NULL OR char_length(boxed_set_author_note_md) <= 8000
  ),
  ADD CONSTRAINT series_metadata_newsletter_signup_len CHECK (
    newsletter_signup_copy_md IS NULL OR char_length(newsletter_signup_copy_md) <= 4000
  );

COMMENT ON COLUMN public.series_metadata.boxed_set_dedication_md IS
  'Series-level dedication page (markdown). Rendered between copyright and reading-order pages in the boxed-set DOCX.';
COMMENT ON COLUMN public.series_metadata.boxed_set_author_note_md IS
  'Series-level author note / preface (markdown). Rendered after the reading-order page.';
COMMENT ON COLUMN public.series_metadata.newsletter_signup_copy_md IS
  'Editable newsletter signup pitch rendered in the back matter of the boxed set.';
COMMENT ON COLUMN public.series_metadata.boxed_set_included_book_ids IS
  'Explicit book-id selection for the boxed set. NULL means "default to all complete books in the series".';

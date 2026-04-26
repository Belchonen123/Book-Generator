-- 032_chapter_ai_summary.sql
-- Auto-summarization columns for the context-assembler feature.
--
-- When a chapter grows past ~200 words, a background job calls a cheap
-- model to produce a single-paragraph summary. That summary is what later
-- chapter-generation calls inject as prior-chapter context (instead of
-- feeding raw prose, which blows the budget apart after 2–3 chapters).
--
-- `ai_summary_hash` stores a hash of the CONTENT that was summarized, so
-- the enqueue path can detect staleness without calling the model
-- speculatively (word-count-delta > 10% or hash mismatch triggers a
-- regeneration).
--
-- The composite index (book_id, chapter_number) is shaped for the
-- assembler's typical lookup: "give me the prior N chapters of this book
-- in order" — the existing FK index on book_id alone still works for
-- point lookups.

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_hash TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ;

-- Ordered lookup by (book, chapter_number) — the assembler walks chapters
-- in order when building the prior-summary bundle.
CREATE INDEX IF NOT EXISTS chapters_book_chapter_number_idx
  ON public.chapters (book_id, chapter_number);

COMMENT ON COLUMN public.chapters.ai_summary IS
  'AI-generated 1-paragraph (max 120 words) summary of this chapter, used as prior-chapter context for later AI generations. Refreshed when content word-count changes by >10% from the hash source.';

COMMENT ON COLUMN public.chapters.ai_summary_hash IS
  'SHA-256 hex of the content slice that produced ai_summary. Used to detect staleness without re-running the summarizer speculatively.';

COMMENT ON COLUMN public.chapters.ai_summary_updated_at IS
  'Timestamp of the last successful ai_summary refresh. Null when the chapter has never been summarized (e.g. too short).';

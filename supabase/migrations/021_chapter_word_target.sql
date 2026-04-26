-- Optional per-chapter writing target. When set, the editor renders a progress
-- bar under the title and the chapter-generation prompt uses this value instead
-- of the genre-derived default.
--
-- Bounds match the UI input: 100–20,000 words. NULL means "fall back to the
-- genre default at generation time."

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS target_word_count INT;

ALTER TABLE public.chapters
  ADD CONSTRAINT chapters_target_word_count_range
  CHECK (target_word_count IS NULL OR (target_word_count BETWEEN 100 AND 20000));

COMMENT ON COLUMN public.chapters.target_word_count IS
  'Optional author-specified word target for this chapter (100–20000). NULL means use the genre-derived default.';

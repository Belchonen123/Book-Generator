-- Per-chapter steering notes the author can write to influence AI
-- regeneration without rewriting the outline itself. Persisted so notes
-- survive reloads and are applied on every regeneration automatically.

ALTER TABLE public.chapters
ADD COLUMN IF NOT EXISTS author_notes TEXT;

COMMENT ON COLUMN public.chapters.author_notes IS
  'Optional freeform steering instructions passed into the chapter-generation prompt.';

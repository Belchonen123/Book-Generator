-- Canonical character / continuity facts for long-form chapter generation

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS character_bible JSONB;

COMMENT ON COLUMN public.books.character_bible IS
  'Structured character bible and continuity anchors; populated when the outline is approved.';

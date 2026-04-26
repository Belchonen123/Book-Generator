-- Chapter revision history.
--
-- Every AI generation, significant manual save, and certain assist actions
-- write a snapshot of the chapter *before* the mutation so authors can
-- compare and restore earlier versions. `restoreRevision` also writes a
-- new revision (source='restore') so restoring is itself reversible.
--
-- A soft cap of 50 rows per chapter is enforced at write time in
-- lib/book/revisions.ts (deleting the oldest rows after each insert).
-- The CHECK constraint on `source` is the canonical list of allowed
-- snapshot origins; extending this list requires another migration.

CREATE TABLE public.chapter_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (
    source IN (
      'generation',
      'manual_save',
      'assist_expand',
      'assist_tone',
      'regenerate',
      'restore'
    )
  ),
  title_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chapter_revisions_chapter_id_created_at_idx
  ON public.chapter_revisions (chapter_id, created_at DESC);

ALTER TABLE public.chapter_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their chapter revisions"
  ON public.chapter_revisions
  FOR ALL
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.chapter_revisions IS
  'Immutable snapshots of chapter content taken before AI generation, assist actions, and debounced manual saves. Used by the Version history UI and restore flow.';

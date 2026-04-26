-- Book-wide find/replace before mutation snapshots.
ALTER TABLE public.chapter_revisions
  DROP CONSTRAINT IF EXISTS chapter_revisions_source_check;

ALTER TABLE public.chapter_revisions
  ADD CONSTRAINT chapter_revisions_source_check
  CHECK (
    source IN (
      'generation',
      'manual_save',
      'assist_expand',
      'assist_tone',
      'regenerate',
      'restore',
      'rewrite_transition',
      'regenerate_for_outline',
      'find_replace'
    )
  );

-- Allow transition-rewrite snapshots (chapter drag reorder + AI handoff).
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
      'rewrite_transition'
    )
  );

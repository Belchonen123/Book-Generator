-- Per-user JSON preferences (editor nudges, feature toggles, etc.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.preferences IS
  'Arbitrary key/value preferences (booleans, small strings). Example: { "askRewriteOnOutlineEdit": true }.';

-- Snapshot source when the author regenerates after editing outline_summary.
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
      'regenerate_for_outline'
    )
  );

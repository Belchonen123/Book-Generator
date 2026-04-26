-- ElevenLabs audiobook exports: one row per full-book generation job.

CREATE TABLE public.audio_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'ready', 'failed')) DEFAULT 'queued',
  progress INT NOT NULL DEFAULT 0,
  zip_storage_path TEXT,
  total_duration_seconds INT,
  error TEXT,
  chapter_states JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audio_exports_book_id_created_at_idx
  ON public.audio_exports (book_id, created_at DESC);

CREATE INDEX audio_exports_user_id_idx ON public.audio_exports (user_id);

ALTER TABLE public.audio_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audio exports"
  ON public.audio_exports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own audio exports"
  ON public.audio_exports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own audio exports"
  ON public.audio_exports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own audio exports"
  ON public.audio_exports FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.audio_exports IS
  'Audiobook ZIP generation via ElevenLabs; chapter_states = JSON array of { chapterNumber, state }.';

-- Private bucket: paths {user_id}/{book_id}/...
INSERT INTO storage.buckets (id, name, public)
VALUES ('audiobooks', 'audiobooks', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE POLICY "Users read own audiobook files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audiobooks'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users upload audiobook files under own prefix"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audiobooks'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users update own audiobook files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audiobooks'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'audiobooks'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users delete own audiobook files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audiobooks'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

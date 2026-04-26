-- Cached AI scene-beat / pacing analysis per chapter (fiction, Pro). Invalidated by content hash.

CREATE TABLE public.chapter_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  beats JSONB NOT NULL,
  model TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content_hash TEXT NOT NULL,
  UNIQUE (chapter_id, content_hash)
);

CREATE INDEX chapter_beats_book_id_idx ON public.chapter_beats (book_id);
CREATE INDEX chapter_beats_chapter_id_idx ON public.chapter_beats (chapter_id);

ALTER TABLE public.chapter_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their chapter beats"
  ON public.chapter_beats
  FOR ALL
  USING (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  )
  WITH CHECK (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.chapter_beats IS
  'Fiction scene-beat / tension pacing map per chapter, keyed by sha256 of chapter text for cache hits.';

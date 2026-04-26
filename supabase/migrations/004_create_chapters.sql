-- chapters: one row per chapter; unique (book_id, chapter_number)

CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books (id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  outline_summary TEXT,
  content TEXT,
  word_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'generating', 'draft', 'edited', 'approved')
  ),
  generation_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, chapter_number)
);

CREATE INDEX chapters_book_id_idx ON public.chapters (book_id);
CREATE INDEX chapters_status_idx ON public.chapters (status);

COMMENT ON TABLE public.chapters IS 'Generated/edited chapter bodies and workflow status.';

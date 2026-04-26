-- outlines: one outline per book (sections JSON matches app types)

CREATE TABLE public.outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL UNIQUE REFERENCES public.books (id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]',
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outlines_book_id_idx ON public.outlines (book_id);

COMMENT ON TABLE public.outlines IS 'Structured outline; sections is JSON array of outline segments / chapters.';

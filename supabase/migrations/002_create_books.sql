-- books: one row per manuscript / project

CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Book',
  genre TEXT,
  target_audience TEXT,
  tone TEXT,
  raw_idea TEXT,
  refined_idea TEXT,
  idea_conversation JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'idea' CHECK (
    status IN (
      'idea',
      'refining',
      'outlining',
      'writing',
      'editing',
      'cover',
      'complete'
    )
  ),
  cover_prompt TEXT,
  cover_url TEXT,
  kdp_instructions TEXT,
  word_count INT NOT NULL DEFAULT 0,
  chapter_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX books_user_id_idx ON public.books (user_id);
CREATE INDEX books_status_idx ON public.books (status);

COMMENT ON TABLE public.books IS 'Book projects: idea, outline, chapters, cover, export metadata.';

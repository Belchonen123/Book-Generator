-- Linked books (series): shared world + character reference across manuscripts.

CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  shared_character_bible JSONB NOT NULL DEFAULT '{}',
  shared_world_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX series_user_id_idx ON public.series (user_id);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their series"
  ON public.series
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.series IS
  'Author-defined series: shared character bible and world; books reference series_id.';

-- nullable FK: NULL = standalone book
ALTER TABLE public.books
  ADD COLUMN series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  ADD COLUMN series_order INT,
  ADD COLUMN previously_in_series TEXT;

CREATE INDEX books_series_id_order_idx ON public.books (series_id, series_order);

COMMENT ON COLUMN public.books.previously_in_series IS
  'Pre-filled recap of prior books in the same series; outline generation also refreshes this from current sibling data.';

-- Row Level Security: profiles, books, outlines, chapters, api_usage

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users own their profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

-- books
CREATE POLICY "Users own their books"
  ON public.books
  FOR ALL
  USING (auth.uid() = user_id);

-- outlines (via owning book)
CREATE POLICY "Users own their outlines"
  ON public.outlines
  FOR ALL
  USING (
    book_id IN (SELECT b.id FROM public.books b WHERE b.user_id = auth.uid())
  );

-- chapters (via owning book)
CREATE POLICY "Users own their chapters"
  ON public.chapters
  FOR ALL
  USING (
    book_id IN (SELECT b.id FROM public.books b WHERE b.user_id = auth.uid())
  );

-- api_usage: read and append own rows only (typical server insert with user JWT)
CREATE POLICY "Users read own api_usage"
  ON public.api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own api_usage"
  ON public.api_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

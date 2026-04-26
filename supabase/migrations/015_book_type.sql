-- Fiction vs non-fiction: drives idea, outline, and chapter prompts

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS book_type TEXT NOT NULL DEFAULT 'fiction'
  CHECK (book_type IN ('fiction', 'non_fiction'));

COMMENT ON COLUMN public.books.book_type IS
  'fiction: novel-style prompts; non_fiction: memoir, how-to, business, etc.';

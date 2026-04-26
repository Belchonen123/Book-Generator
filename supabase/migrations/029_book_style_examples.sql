-- Per-project style anchor for AI prose generation. Authors paste 500–2,000
-- words of sample prose (their own, a favorite author, a chapter they love)
-- into style_examples; every prose-generating AI route injects it into the
-- system prompt so output matches the target voice. style_instructions is a
-- short free-form note ("match this voice but keep dialogue tighter") that
-- rides alongside the sample as soft steering.
--
-- Both columns are optional (NULL means "no style anchor"); RLS is inherited
-- from the existing `books` row policies — no new policies needed because
-- column-level access falls back to the row grant in Supabase.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS style_examples TEXT,
  ADD COLUMN IF NOT EXISTS style_instructions TEXT;

-- Cap column length to keep one style block from blowing prompt budgets.
-- ~20k chars ≈ 3,500 words, which is a hard ceiling above the 2,000-word
-- target. Below the ceiling we only _warn_ the author client-side.
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_style_examples_length;
ALTER TABLE public.books
  ADD CONSTRAINT books_style_examples_length CHECK (
    style_examples IS NULL OR char_length(style_examples) <= 20000
  );

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_style_instructions_length;
ALTER TABLE public.books
  ADD CONSTRAINT books_style_instructions_length CHECK (
    style_instructions IS NULL OR char_length(style_instructions) <= 1000
  );

COMMENT ON COLUMN public.books.style_examples IS
  'Optional 500–2,000 word prose sample the author wants the AI to emulate (rhythm, vocabulary, register). Injected into every prose-generating AI system prompt.';
COMMENT ON COLUMN public.books.style_instructions IS
  'Optional short note from the author steering how style_examples should be used (e.g. "match this voice but keep dialogue tighter").';

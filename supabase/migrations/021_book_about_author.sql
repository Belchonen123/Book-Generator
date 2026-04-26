-- Per-book "About the Author" blurb rendered on the cover-prep screen and
-- the paperback back cover. Optional; can be pre-filled from profiles.bio
-- by the UI, but stored per-book so each title can have its own bio.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS about_author TEXT;

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_about_author_length;

ALTER TABLE public.books
  ADD CONSTRAINT books_about_author_length CHECK (
    about_author IS NULL OR char_length(about_author) <= 1500
  );

COMMENT ON COLUMN public.books.about_author IS
  'Optional per-book "About the Author" blurb shown on the paperback back cover / KDP listing. Defaults to profiles.bio in the UI when unset.';

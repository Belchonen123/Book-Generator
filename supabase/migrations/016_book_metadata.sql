-- Adds editable publishing metadata displayed on the cover + export screens.
-- All fields are optional; existing rows stay valid.

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS author_display_name TEXT,
ADD COLUMN IF NOT EXISTS back_cover_copy TEXT;

COMMENT ON COLUMN public.books.subtitle IS
  'Optional subtitle shown under the title on the cover / export.';
COMMENT ON COLUMN public.books.author_display_name IS
  'Pen-name / by-line as the author wants it printed on the cover.';
COMMENT ON COLUMN public.books.back_cover_copy IS
  'AI-assisted, user-editable back cover blurb (150–200 words).';

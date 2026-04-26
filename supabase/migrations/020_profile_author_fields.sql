-- Extended profile / author fields rendered on /profile.
-- All optional; users can fill them in from the editable Profile page.
--
-- Idempotent: constraints are dropped (if present) before being re-added so this
-- migration can be safely re-applied after partial failures.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS pen_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

-- Length guards matched to what the UI enforces (keeps DB defensible even if
-- the client is bypassed). NULL is always allowed.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pen_name_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_website_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_location_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_twitter_handle_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 600),
  ADD CONSTRAINT profiles_pen_name_length CHECK (pen_name IS NULL OR char_length(pen_name) <= 120),
  ADD CONSTRAINT profiles_website_length CHECK (website IS NULL OR char_length(website) <= 200),
  ADD CONSTRAINT profiles_location_length CHECK (location IS NULL OR char_length(location) <= 120),
  ADD CONSTRAINT profiles_twitter_handle_length CHECK (
    twitter_handle IS NULL OR char_length(twitter_handle) <= 32
  );

COMMENT ON COLUMN public.profiles.bio IS 'Short author biography shown on the profile page.';
COMMENT ON COLUMN public.profiles.pen_name IS 'Author / pen name used on generated books (overrides full_name when set).';
COMMENT ON COLUMN public.profiles.website IS 'Optional personal / author website URL.';
COMMENT ON COLUMN public.profiles.location IS 'Optional location string (e.g. "Brooklyn, NY").';
COMMENT ON COLUMN public.profiles.twitter_handle IS 'Optional X / Twitter handle without the leading @.';

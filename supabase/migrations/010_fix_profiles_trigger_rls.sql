-- Fix profile rows not appearing after signup:
-- 1) Harden handle_new_user so INSERT is not blocked by RLS on profiles.
-- 2) Backfill profiles for any auth.users missing a row (e.g. trigger was absent).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- RLS can still apply to SECURITY DEFINER in some configurations; disable for this insert.
  SET LOCAL row_security = off;
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Syncs auth.users signups into public.profiles (RLS-safe insert).';

-- Backfill: users who signed up while trigger was missing or failing
INSERT INTO public.profiles (id, email)
SELECT u.id, COALESCE(u.email::text, '')
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL;

-- Replace blanket FOR ALL policy with explicit SELECT / INSERT / UPDATE / DELETE policies.
-- Some Postgres versions treat ALL + USING alone ambiguously for INSERT; upsert needs a clear WITH CHECK.
--
-- Idempotent: safe to re-run. Each policy is dropped (if present) before being recreated, so
-- repeated applications (or partial previous runs) don't fail with `42710 policy ... already exists`.

DROP POLICY IF EXISTS "Users own their profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

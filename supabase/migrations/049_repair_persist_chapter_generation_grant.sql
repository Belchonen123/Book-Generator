-- Idempotent repair: some projects lost EXECUTE on `authenticated` after role changes.
-- Safe no-op if migration 040 already applied successfully.

grant execute on function public.persist_chapter_generation(uuid, uuid, text, int, text) to authenticated;

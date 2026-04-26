-- 043 — Transactional reorder RPC for series books.
--
-- Prompt 16.2 ("series dashboard") calls out that `reorderBooks()` must run
-- as a single transaction, because the pre-existing action did N separate
-- UPDATEs and a mid-loop failure would leave `books.series_order` in a
-- torn state.
--
-- This migration installs a SECURITY DEFINER Postgres function that:
--   1. Verifies the caller owns the series (belt-and-suspenders; RLS already
--      enforces it on direct UPDATEs, but we re-check here so the error
--      path is a single clear `raise exception` instead of zero rows
--      updated).
--   2. Flips every existing `series_order` in the series to its negative so
--      the new positions can't collide with the old ones — this is
--      defensive: the schema currently has no unique constraint on
--      (series_id, series_order), but a future migration may add one and
--      this function should keep working unchanged.
--   3. Walks the provided `p_book_ids[]` array and assigns positions 1..N.
--      Any book id that is not actually in this series is silently
--      skipped — the enclosing `WHERE series_id = p_series_id` filter
--      guarantees we never touch a book in a different series even if
--      the caller passes garbage ids.
--
-- Design notes:
--   * The function runs as `security definer` and pins `search_path = public`
--     so a compromised search_path can't redirect the UPDATEs to a shadow
--     schema. This is the standard Supabase pattern.
--   * `auth.uid()` still reads the *caller's* JWT claim, not the definer's,
--     so RLS-style ownership checks remain intact.
--   * We also bump `updated_at` on each updated row so downstream
--     `revalidatePath` / cache keys see a fresh mtime for each book.
--
-- Idempotent via CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.reorder_series_books(
  p_series_id uuid,
  p_book_ids  uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
BEGIN
  IF p_series_id IS NULL THEN
    RAISE EXCEPTION 'series id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.series
    WHERE id = p_series_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Flip existing positions to negative so a future UNIQUE(series_id,
  -- series_order) can't fire mid-loop. Only touches rows actually in this
  -- series and owned by the caller.
  UPDATE public.books
     SET series_order = -series_order,
         updated_at   = NOW()
   WHERE series_id    = p_series_id
     AND user_id      = auth.uid()
     AND series_order IS NOT NULL;

  -- Apply the new order. `coalesce` guards against a NULL array, which
  -- PostgreSQL treats as having no length (and would otherwise throw
  -- `array_length(null, 1)` → NULL, and `1..NULL` would raise).
  FOR i IN 1..COALESCE(array_length(p_book_ids, 1), 0) LOOP
    UPDATE public.books
       SET series_order = i,
           updated_at   = NOW()
     WHERE id           = p_book_ids[i]
       AND series_id    = p_series_id
       AND user_id      = auth.uid();
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reorder_series_books(uuid, uuid[]) IS
  'Atomically reassign books.series_order for every book in a series. Caller must own the series; silently ignores book ids not in the series.';

GRANT EXECUTE ON FUNCTION public.reorder_series_books(uuid, uuid[]) TO authenticated;

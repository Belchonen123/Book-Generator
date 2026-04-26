-- 047 — Atomic recompute for books.word_count.
--
-- Chapter saves previously did a client-side read-modify-write:
--   1) SELECT all chapter word_count rows
--   2) SUM in JS
--   3) UPDATE books.word_count
-- Under concurrent saves this can race and write a stale aggregate.
--
-- This function moves the aggregate update into a single SQL statement so each
-- call computes from committed chapter rows at execution time.

CREATE OR REPLACE FUNCTION public.recompute_book_word_count(p_book_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.books
  SET word_count = COALESCE((
    SELECT SUM(word_count)::int
    FROM public.chapters
    WHERE book_id = p_book_id
  ), 0)
  WHERE id = p_book_id;
$$;

COMMENT ON FUNCTION public.recompute_book_word_count(uuid) IS
  'Recomputes books.word_count from chapters.word_count for one book id.';

GRANT EXECUTE ON FUNCTION public.recompute_book_word_count(uuid) TO authenticated;

-- 048 — Transactional chapter reorder RPC.
--
-- Chapter reordering previously used two client-side update passes:
--   1) move each chapter_number to 1_000_000 + i
--   2) move each chapter_number to i + 1
-- If the process crashed between passes, chapters were stranded at temp
-- numbers. This function keeps both phases inside one transaction.

CREATE OR REPLACE FUNCTION public.reorder_chapters(
  p_book_id uuid,
  p_ordered_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_i int;
  v_temp_base int := 1000000;
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.books
  WHERE id = p_book_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  FOR v_i IN 1..COALESCE(array_length(p_ordered_ids, 1), 0) LOOP
    UPDATE public.chapters
    SET chapter_number = v_temp_base + v_i
    WHERE id = p_ordered_ids[v_i]
      AND book_id = p_book_id;
  END LOOP;

  FOR v_i IN 1..COALESCE(array_length(p_ordered_ids, 1), 0) LOOP
    UPDATE public.chapters
    SET chapter_number = v_i
    WHERE id = p_ordered_ids[v_i]
      AND book_id = p_book_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reorder_chapters(uuid, uuid[]) IS
  'Atomically reorders chapters for a book by id array. Caller must own the book.';

GRANT EXECUTE ON FUNCTION public.reorder_chapters(uuid, uuid[]) TO authenticated;

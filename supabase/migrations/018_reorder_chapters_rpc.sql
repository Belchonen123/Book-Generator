CREATE OR REPLACE FUNCTION public.reorder_chapters(
  p_book_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_count integer;
  v_input_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM books
    WHERE id = p_book_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not own this book.';
  END IF;

  SELECT COUNT(*)
  INTO v_chapter_count
  FROM chapters
  WHERE book_id = p_book_id;

  v_input_count := COALESCE(array_length(p_ordered_ids, 1), 0);
  IF v_input_count <> v_chapter_count THEN
    RAISE EXCEPTION 'Chapter count mismatch for reorder.';
  END IF;

  UPDATE chapters
  SET chapter_number = -(array_position(p_ordered_ids, id))
  WHERE book_id = p_book_id;

  UPDATE chapters
  SET chapter_number = array_position(p_ordered_ids, id)
  WHERE book_id = p_book_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_chapters(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_chapters(uuid, uuid[]) TO authenticated;

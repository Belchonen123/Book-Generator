-- Atomic chapter content + generation_count + book word total in one transaction.
-- See app/api/ai/generate-chapter route onFinal.

create or replace function public.persist_chapter_generation(
  p_chapter_id uuid,
  p_book_id uuid,
  p_content text,
  p_word_count int,
  p_source text
) returns table (
  generation_count int,
  book_total_words int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_gen int;
  v_total int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.books b
    where b.id = p_book_id
      and b.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  -- p_source: reserved for future audit columns; revision source is tracked in chapter_revisions.

  update public.chapters
  set
    generation_count = coalesce(generation_count, 0) + 1,
    content = p_content,
    status = 'draft',
    word_count = p_word_count,
    updated_at = now()
  where id = p_chapter_id
    and book_id = p_book_id
  returning chapters.generation_count into v_next_gen;

  if v_next_gen is null then
    raise exception 'Chapter not found or not owned';
  end if;

  select coalesce(sum(c.word_count), 0)::int into v_total
  from public.chapters c
  where c.book_id = p_book_id;

  update public.books
  set
    word_count = v_total,
    updated_at = now()
  where id = p_book_id
    and user_id = auth.uid();

  return query select v_next_gen, v_total;
end;
$$;

revoke all on function public.persist_chapter_generation(uuid, uuid, text, int, text) from public;
grant execute on function public.persist_chapter_generation(uuid, uuid, text, int, text) to authenticated;

comment on function public.persist_chapter_generation(uuid, uuid, text, int, text) is
  'Atomically applies generated chapter body, increments generation_count, and recomputes book word_count. Caller must be the book owner.';

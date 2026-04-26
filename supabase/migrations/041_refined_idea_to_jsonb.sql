-- Prompt 14: store books.refined_idea as jsonb (was text JSON).

-- Step 1: new column
alter table public.books add column if not exists refined_idea_json jsonb;

-- Step 2: backfill (invalid JSON: notice only, row unchanged for new column)
do $$
declare
  r record;
  parsed jsonb;
begin
  for r in
    select id, refined_idea
    from public.books
    where refined_idea is not null
  loop
    begin
      parsed := r.refined_idea::jsonb;
      update public.books
      set refined_idea_json = parsed
      where id = r.id;
    exception when others then
      raise notice 'book %: invalid refined_idea json, leaving refined_idea_json null', r.id;
    end;
  end loop;
end $$;

-- Step 3: drop text column, rename
alter table public.books drop column refined_idea;
alter table public.books rename column refined_idea_json to refined_idea;

-- Step 4: GIN for JSON containment queries
create index if not exists books_refined_idea_gin on public.books using gin (refined_idea);

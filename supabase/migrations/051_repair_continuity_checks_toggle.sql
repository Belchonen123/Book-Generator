-- Idempotent repair for projects where migration 034 was partially applied
-- or skipped before the background continuity checker shipped.

alter table public.books
  add column if not exists continuity_checks_enabled boolean not null default true;

comment on column public.books.continuity_checks_enabled is
  'Prompt 16: toggles the background continuity (plot-hole) pass. Effective only when the book is in a series; standalone books always skip the pass regardless of this flag.';

-- Stores an AI-extracted continuity summary of each chapter's generated content.
-- Used to give subsequent chapter generations awareness of what actually happened
-- in prior chapters, not just what the outline planned.
alter table public.chapters
  add column if not exists chapter_summary text null;

comment on column public.chapters.chapter_summary is
  'AI-extracted continuity summary written after chapter generation. Passed as prior context to all subsequent chapter generation calls.';

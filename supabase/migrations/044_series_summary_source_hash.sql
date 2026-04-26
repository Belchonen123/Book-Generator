-- Prompt 16.4 (PRIOR-BOOK SUMMARIZATION — staleness detection).
--
-- Migration 033 added the cached summary columns (series_plot_summary,
-- series_end_state_dossier, series_summary_data, series_summary_generated_at)
-- but didn't give us a cheap way to tell whether the cached summary still
-- matches the underlying manuscript. `series_summary_generated_at` answers
-- "when did we last generate?" but not "does this summary still describe the
-- current chapter set?" — an author can edit Chapter 11 a week after
-- finishing Book 1 and the cached summary silently goes stale.
--
-- `series_summary_source_hash` stores a stable hash of the chapters that
-- fed the summarizer (chapter ids + their ai_summary_hash / content-version
-- markers). `refreshSummaryIfStale(bookId)` compares the hash recomputed
-- from the current chapters against the stored value; mismatch → regen.
--
-- Nullable to match the other series_summary_* columns; a null hash on a
-- book that has a summary means "the summary pre-dates this migration —
-- treat as stale the first time refreshSummaryIfStale is called so we
-- backfill the hash".

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS series_summary_source_hash TEXT;

COMMENT ON COLUMN public.books.series_summary_source_hash IS
  'Prompt 16.4: hash of the chapter corpus that produced the cached series summary. Used by refreshSummaryIfStale to decide whether to regenerate when the author edits a prior book after summarizing it.';

-- Fast lookup by (series_id, source hash) when bulk-checking staleness
-- across a whole series (e.g. "which books in this series need a refresh?").
CREATE INDEX IF NOT EXISTS books_series_summary_stale_idx
  ON public.books (series_id, series_summary_source_hash)
  WHERE series_id IS NOT NULL;

-- =============================================================================
-- 2. Chapter-gen default template: add {series_context} slot
-- =============================================================================
-- Prompt 16.4 introduces a dedicated series-context tier in the generation
-- context assembler. The default chapter-gen template needs to reference
-- `{series_context}` for it to actually land in the system prompt for books
-- that are part of a series. Standalone books receive an empty string and
-- the block renders as harmless whitespace.
--
-- We only UPDATE the platform default (user_id IS NULL, is_default = true);
-- user / project overrides are left untouched — users who forked the
-- template keep their version exactly as-is. The settings UI exposes a
-- "reset to default" button for authors who want to opt in to the new slot.

UPDATE public.prompt_templates
SET template_text =
$DEFAULT$You are a novelist whose chapters get read to the last page because the reader physically cannot stop. Write Chapter {chapter.number}: "{chapter.title}" as finished published prose — not a draft.

## Beat for this chapter
{chapter.beat}

## Voice anchor & style
{style_examples}

{style_instructions}

## Series context (canon across books — do not contradict)
{series_context}

## Worldbook (hard continuity — do not contradict)
{codex}

## Prior chapters (what has happened)
{prior_summaries}

## Current chapter so far (pick up mid-voice, do not repeat)
{recent_prose}

## Series continuity (if present)
When the <series> block is present above, this book is part of a series. You MUST:
- Treat all events in <previously_in_series> as established canon. Characters remember them. Do not contradict them.
- Advance the <active_arcs> according to their status. Arcs with status="climax" are near resolution and should show measurable movement in this chapter if relevant. Arcs with status="developing" should NOT resolve in this chapter unless the outline explicitly says so.
- Never reveal or reference events from books AFTER this one. Even if you "know" them from the broader series context, the reader doesn't know them yet.

## Four failure modes to avoid
1. Explaining instead of showing (no "she felt a growing sense of unease").
2. Characters who are concepts, not people — give them one specific irrational detail.
3. Tension-free forward motion — every scene needs an open question.
4. Prose that sounds like writing — specific, concrete, sensory, lived.

## Absolute bans
- Stock body-cue emotion tells ("her eyes widened", "jaw tightened", "breath she didn't know she was holding").
- Pinterest-quote chapter endings ("Sometimes the hardest thing…", "…and that was just the beginning").
- Real living public figures speaking dialogue.
- Bullet-point narrative structure inside fiction prose.
- "World is watching" uplift resolutions.
- Authorial-wisdom sentences about human nature.

End on a specific image, a line of dialogue, or an unanswered question — never on wisdom.

Genre: {project.genre}. POV: {project.pov}. Tense: {project.tense}. Book: "{project.title}".$DEFAULT$
WHERE task_id = 'chapter-gen'
  AND is_default = true
  AND user_id IS NULL
  AND project_id IS NULL;

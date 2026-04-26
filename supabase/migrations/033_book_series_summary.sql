-- Prompt 16 (PRIOR-BOOK SUMMARIZATION): structured "this is what this book
-- left behind" payload, persisted on the book so later books in the series
-- have a cheap, authoritative recap to pull from.
--
-- Fields:
--   series_plot_summary        — ~400-word prose recap of the plot. Rendered
--                                in "Previously in the series" preambles.
--   series_end_state_dossier   — Markdown "what the reader knows by end of
--                                this book" — rules established, canon events,
--                                character whereabouts. Shown to the author.
--   series_summary_data        — Structured JSON blob the generator produces.
--                                Shape:
--                                  { open_arcs: string[],
--                                    world_state_changes: string[],
--                                    character_states: [{entry_id, name, state}]
--                                  }
--                                Stored raw for audit; character_states are
--                                also persisted as codex_progressions rows
--                                with event_type='book_end_state'.
--   series_summary_generated_at— When the summary was last generated; used by
--                                the UI to show "regenerate" vs "summarize".
--
-- All fields nullable: existing books don't have a summary yet, and the
-- feature is opt-in (user-triggered or auto on status→complete).

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS series_plot_summary        TEXT,
  ADD COLUMN IF NOT EXISTS series_end_state_dossier   TEXT,
  ADD COLUMN IF NOT EXISTS series_summary_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS series_summary_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.books.series_plot_summary IS
  'Prompt 16: ~400-word auto-generated plot recap used in "previously in series" context for later books.';
COMMENT ON COLUMN public.books.series_end_state_dossier IS
  'Prompt 16: markdown "what the reader knows by end of this book" dossier.';
COMMENT ON COLUMN public.books.series_summary_data IS
  'Prompt 16: raw structured output from summarizeBookForSeries (open_arcs, world_state_changes, character_states).';
COMMENT ON COLUMN public.books.series_summary_generated_at IS
  'Prompt 16: timestamp of last series-summary generation. NULL = never generated.';

-- Prompt 3 (Codex): add AI-injection + UI metadata to the existing `codex_entries`
-- table introduced in migration 030_prompt16_series_expansion.sql.
--
-- Design notes:
--  * Spec (Prompt 3) calls the parent table `projects(id)`; this codebase stores
--    projects in `books`. Migration 030 already models that with the existing
--    `book_id` / `series_id` / `scope` triple, so we do NOT introduce a parallel
--    table — we extend the canonical one.
--  * `ai_scope` (always | on_match | never) is independent from the pre-existing
--    `scope` (project | series | shared). The former governs whether codex
--    context is auto-injected into AI prompts; the latter governs storage
--    scope (which book or series the entry belongs to).
--  * `relations` stores `[{ targetId, label }]` edges between entries. We use
--    JSONB (not a join table) because relations are always denormalized with
--    the entry in practice and the cardinality is small (single-digit to low
--    double-digit per entry).
--  * `image_url` is a URL field for v1 — when Supabase Storage bucket setup
--    lands we can swap in a signed-URL helper without a schema change.
--  * `description_md` is promoted from NULL-able TEXT to NOT NULL DEFAULT ''
--    so the UI + matcher never has to defend against `null`. Existing NULL
--    rows (from migration 030) are backfilled before the constraint is added.

-- =============================================================================
-- 1. Backfill + promote description_md
-- =============================================================================

UPDATE public.codex_entries
SET description_md = ''
WHERE description_md IS NULL;

ALTER TABLE public.codex_entries
  ALTER COLUMN description_md SET DEFAULT '',
  ALTER COLUMN description_md SET NOT NULL;

-- =============================================================================
-- 2. New columns for Prompt 3 (Codex UI + auto-injection)
-- =============================================================================

ALTER TABLE public.codex_entries
  ADD COLUMN IF NOT EXISTS ai_scope TEXT NOT NULL DEFAULT 'on_match',
  ADD COLUMN IF NOT EXISTS relations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.codex_entries
  DROP CONSTRAINT IF EXISTS codex_entries_ai_scope_chk;
ALTER TABLE public.codex_entries
  ADD CONSTRAINT codex_entries_ai_scope_chk
  CHECK (ai_scope IN ('always', 'on_match', 'never'));

-- `relations` payload is always a JSON array — reject object/string/number
-- writes from a misbehaving client.
ALTER TABLE public.codex_entries
  DROP CONSTRAINT IF EXISTS codex_entries_relations_is_array_chk;
ALTER TABLE public.codex_entries
  ADD CONSTRAINT codex_entries_relations_is_array_chk
  CHECK (jsonb_typeof(relations) = 'array');

-- Partial indexes to speed the two common reads from the codex page + AI
-- injection: "always-inject entries for this book" and "all entries for this
-- book, ordered alphabetically". Both are tiny lists in practice but the
-- indexes prevent a seq scan as codexes grow into the hundreds.
CREATE INDEX IF NOT EXISTS codex_entries_book_ai_scope_idx
  ON public.codex_entries(book_id, ai_scope)
  WHERE book_id IS NOT NULL;

COMMENT ON COLUMN public.codex_entries.ai_scope IS
  'always = inject into every AI prose call; on_match = inject only when the entry''s name or aliases appear in the text context; never = exclude from auto-injection (user still sees it in the codex page).';

COMMENT ON COLUMN public.codex_entries.relations IS
  'Array of { targetId: uuid, label: text } edges between codex entries. Client-maintained; not FK-enforced so a relation can survive the target being renamed.';

COMMENT ON COLUMN public.codex_entries.image_url IS
  'Optional portrait / reference image for this entry. URL for v1; swap for storage key when the bucket ships.';

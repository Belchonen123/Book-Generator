-- Prompt 16 (Series expansion): codex system + per-book overlays + progressions + arcs + metadata.
--
-- Design notes (autopilot decisions):
-- * Spec uses `projects`; this codebase uses `books`. All foreign keys here reference `public.books`.
-- * Spec defines a `series_books` join table. This codebase already models membership via
--   `books.series_id` + `books.series_order` (migration 027). We keep that and add a
--   `reading_order_note` column on `books` for spec parity rather than a new join table.
-- * Spec uses a first-class `codex_entries` table (assumed from Prompt 3 which is not yet shipped).
--   We introduce it here as the canonical structured codex; the legacy `books.character_bible`
--   JSONB blob continues to coexist for back-compat (unchanged).
-- * Series-wide `'shared'` scope (cross-series characters) is deferred to a later pass; we only
--   support 'project' (book-scoped) and 'series' (series-scoped) for now, but the CHECK allows
--   'shared' so no migration churn is needed to enable it.

-- =============================================================================
-- 1. Extend `series` with planning/commercial fields
-- =============================================================================

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS planned_book_count INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planning', 'active', 'complete', 'abandoned'));

-- =============================================================================
-- 2. Extend `books` with reading-order note
-- =============================================================================

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS reading_order_note TEXT;

COMMENT ON COLUMN public.books.reading_order_note IS
  'Optional per-book note shown on the series reading-order page (e.g. "Prequel — read after Book 3").';

-- =============================================================================
-- 3. Codex entries (structured world/character/location/lore entities)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.codex_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Exactly one of book_id / series_id is set depending on scope.
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'project'
    CHECK (scope IN ('project', 'series', 'shared')),
  entry_type TEXT NOT NULL DEFAULT 'character'
    CHECK (entry_type IN ('character', 'location', 'faction', 'object', 'lore', 'subplot', 'custom')),
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  description_md TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Integrity: scope determines which parent is mandatory.
  CONSTRAINT codex_entries_scope_parent_chk CHECK (
    (scope = 'project' AND book_id IS NOT NULL) OR
    (scope = 'series'  AND series_id IS NOT NULL) OR
    (scope = 'shared'  AND series_id IS NULL AND book_id IS NULL)
  )
);

-- Required for `gin_trgm_ops` on the name index below (not installed until enabled).
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS codex_entries_user_id_idx       ON public.codex_entries(user_id);
CREATE INDEX IF NOT EXISTS codex_entries_book_id_idx       ON public.codex_entries(book_id) WHERE book_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS codex_entries_series_id_idx     ON public.codex_entries(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS codex_entries_type_idx          ON public.codex_entries(entry_type);
CREATE INDEX IF NOT EXISTS codex_entries_name_trgm_idx     ON public.codex_entries USING gin (name extensions.gin_trgm_ops);

ALTER TABLE public.codex_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their codex entries"
  ON public.codex_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.codex_entries IS
  'Prompt 16: structured codex entries. Scope="project" (book-only), "series" (series-wide), or "shared" (cross-series; reserved).';

-- =============================================================================
-- 4. Per-book overlays of series-scoped codex entries
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.codex_entry_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codex_entry_id UUID NOT NULL REFERENCES public.codex_entries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  field_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  description_override TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (codex_entry_id, book_id)
);

CREATE INDEX IF NOT EXISTS codex_entry_overlays_book_idx  ON public.codex_entry_overlays(book_id);
CREATE INDEX IF NOT EXISTS codex_entry_overlays_entry_idx ON public.codex_entry_overlays(codex_entry_id);

ALTER TABLE public.codex_entry_overlays ENABLE ROW LEVEL SECURITY;

-- Ownership inherits from the parent book; we don't duplicate user_id to avoid drift.
CREATE POLICY "Users manage overlays for their own books"
  ON public.codex_entry_overlays
  FOR ALL
  USING (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  )
  WITH CHECK (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 5. Character / entity progressions across books
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.codex_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codex_entry_id UUID NOT NULL REFERENCES public.codex_entries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  position_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS codex_progressions_entry_idx  ON public.codex_progressions(codex_entry_id);
CREATE INDEX IF NOT EXISTS codex_progressions_book_idx   ON public.codex_progressions(book_id);

ALTER TABLE public.codex_progressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage progressions for their own books"
  ON public.codex_progressions
  FOR ALL
  USING (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  )
  WITH CHECK (
    book_id IN (SELECT id FROM public.books WHERE user_id = auth.uid())
  );

COMMENT ON COLUMN public.codex_progressions.event_type IS
  'Free-form but conventional values: learns_X, meets_Y, acquires_Z, loses_W, status_change, relationship_change, location_move, death, book_end_state, custom.';

-- =============================================================================
-- 6. Series-level arcs and beats
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.series_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description_md TEXT,
  arc_type TEXT CHECK (arc_type IN ('character', 'plot', 'thematic', 'romance', 'mystery', 'world', 'custom')),
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'developing', 'climax', 'resolved', 'abandoned')),
  starts_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  ends_book_id   UUID REFERENCES public.books(id) ON DELETE SET NULL,
  linked_codex_entry_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS series_arcs_series_idx ON public.series_arcs(series_id);

ALTER TABLE public.series_arcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage arcs for their own series"
  ON public.series_arcs
  FOR ALL
  USING (
    series_id IN (SELECT id FROM public.series WHERE user_id = auth.uid())
  )
  WITH CHECK (
    series_id IN (SELECT id FROM public.series WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.series_arc_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id UUID NOT NULL REFERENCES public.series_arcs(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  beat_type TEXT CHECK (beat_type IN ('setup', 'foreshadow', 'development', 'complication', 'payoff', 'resolution')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'drafted', 'complete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS series_arc_beats_arc_idx  ON public.series_arc_beats(arc_id, position);
CREATE INDEX IF NOT EXISTS series_arc_beats_book_idx ON public.series_arc_beats(book_id);

ALTER TABLE public.series_arc_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage beats for their own series"
  ON public.series_arc_beats
  FOR ALL
  USING (
    arc_id IN (
      SELECT sa.id FROM public.series_arcs sa
      JOIN public.series s ON s.id = sa.series_id
      WHERE s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    arc_id IN (
      SELECT sa.id FROM public.series_arcs sa
      JOIN public.series s ON s.id = sa.series_id
      WHERE s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 7. Series commercial metadata (1:1 with series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.series_metadata (
  series_id UUID PRIMARY KEY REFERENCES public.series(id) ON DELETE CASCADE,
  kdp_series_name TEXT,
  kdp_series_number_format TEXT NOT NULL DEFAULT 'standard',
  amazon_series_asin TEXT,
  boxed_set_title TEXT,
  boxed_set_description TEXT,
  cross_promo_copy_md TEXT,
  also_by_author_list_md TEXT,
  reading_order_copy_md TEXT,
  audiobook_bundle_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.series_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage metadata for their own series"
  ON public.series_metadata
  FOR ALL
  USING (
    series_id IN (SELECT id FROM public.series WHERE user_id = auth.uid())
  )
  WITH CHECK (
    series_id IN (SELECT id FROM public.series WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 8. Updated-at triggers (lightweight; skip if helper not present)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS codex_entries_touch ON public.codex_entries;
CREATE TRIGGER codex_entries_touch BEFORE UPDATE ON public.codex_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS codex_entry_overlays_touch ON public.codex_entry_overlays;
CREATE TRIGGER codex_entry_overlays_touch BEFORE UPDATE ON public.codex_entry_overlays
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS series_arcs_touch ON public.series_arcs;
CREATE TRIGGER series_arcs_touch BEFORE UPDATE ON public.series_arcs
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS series_arc_beats_touch ON public.series_arc_beats;
CREATE TRIGGER series_arc_beats_touch BEFORE UPDATE ON public.series_arc_beats
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS series_metadata_touch ON public.series_metadata;
CREATE TRIGGER series_metadata_touch BEFORE UPDATE ON public.series_metadata
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

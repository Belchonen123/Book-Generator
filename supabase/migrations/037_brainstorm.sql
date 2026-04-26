-- Prompt 8 — Brainstorm anything
--
-- Lets authors ask for N options (character names, chapter titles,
-- opening lines, plot twists, anything), thumbs-up keepers, and re-
-- brainstorm "more like the keepers". Two tables:
--
--   brainstorm_sessions — one row per "Generate N" invocation. Captures
--                         the topic preset + the final prompt sent to
--                         the model so users can see what they asked
--                         for days later.
--   brainstorm_items    — each streamed option. Ordered by `position`,
--                         flagged `is_keeper`. `is_hidden` keeps
--                         thumbs-downed items out of the default view
--                         without losing them (handy when the user
--                         later wants to revisit the full pool).
--
-- RLS cascades from `books.user_id` via the session. We deliberately
-- do NOT store `user_id` on either table — the book already owns the
-- user, and sharing a session out of that owner is explicitly out of
-- scope for v1. When it becomes necessary, add `user_id` + a second
-- policy rather than overloading the book-owner rule.

CREATE TABLE IF NOT EXISTS public.brainstorm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  /* Topic preset id OR 'custom'. Kept as TEXT (not an enum) so we can
   * add new presets in app code without a schema migration. */
  topic TEXT NOT NULL,
  /* The actual user-facing prompt the author submitted (post-edits).
   * Stored verbatim so the session list can show a human summary and
   * "generate more like these" can replay the same topic framing. */
  prompt TEXT NOT NULL,
  /* "Character names for …" label shown in the sidebar session list. */
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT brainstorm_sessions_topic_length
    CHECK (char_length(topic) BETWEEN 1 AND 64),
  CONSTRAINT brainstorm_sessions_prompt_length
    CHECK (char_length(prompt) BETWEEN 1 AND 4000),
  CONSTRAINT brainstorm_sessions_title_length
    CHECK (title IS NULL OR char_length(title) <= 200)
);

CREATE INDEX IF NOT EXISTS brainstorm_sessions_project_id_idx
  ON public.brainstorm_sessions (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.brainstorm_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.brainstorm_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_keeper BOOLEAN NOT NULL DEFAULT false,
  /* Soft-hide for thumbs-downed items. Lets the UI default-filter
   * them out while still keeping the full model output on record. */
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT brainstorm_items_content_length
    CHECK (char_length(content) BETWEEN 1 AND 4000),
  CONSTRAINT brainstorm_items_position_valid
    CHECK (position >= 0)
);

CREATE INDEX IF NOT EXISTS brainstorm_items_session_id_idx
  ON public.brainstorm_items (session_id, position ASC);

CREATE INDEX IF NOT EXISTS brainstorm_items_keepers_idx
  ON public.brainstorm_items (session_id)
  WHERE is_keeper;

/* ==========================================================================
 * RLS — everything cascades from `books.user_id`.
 * ==========================================================================
 */
ALTER TABLE public.brainstorm_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brainstorm_sessions_select_policy
  ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_select_policy
  ON public.brainstorm_sessions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = brainstorm_sessions.project_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_sessions_insert_policy
  ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_insert_policy
  ON public.brainstorm_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = brainstorm_sessions.project_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_sessions_update_policy
  ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_update_policy
  ON public.brainstorm_sessions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = brainstorm_sessions.project_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = brainstorm_sessions.project_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_sessions_delete_policy
  ON public.brainstorm_sessions;
CREATE POLICY brainstorm_sessions_delete_policy
  ON public.brainstorm_sessions
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = brainstorm_sessions.project_id
        AND b.user_id = auth.uid()
    )
  );

ALTER TABLE public.brainstorm_items ENABLE ROW LEVEL SECURITY;

/* Item access follows session access: owner of the book = owner of
 * every item in every session under that book. Two-hop join keeps the
 * policy readable at the cost of one extra index lookup (both hops are
 * indexed). */
DROP POLICY IF EXISTS brainstorm_items_select_policy
  ON public.brainstorm_items;
CREATE POLICY brainstorm_items_select_policy
  ON public.brainstorm_items
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.books b ON b.id = s.project_id
      WHERE s.id = brainstorm_items.session_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_items_insert_policy
  ON public.brainstorm_items;
CREATE POLICY brainstorm_items_insert_policy
  ON public.brainstorm_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.books b ON b.id = s.project_id
      WHERE s.id = brainstorm_items.session_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_items_update_policy
  ON public.brainstorm_items;
CREATE POLICY brainstorm_items_update_policy
  ON public.brainstorm_items
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.books b ON b.id = s.project_id
      WHERE s.id = brainstorm_items.session_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.books b ON b.id = s.project_id
      WHERE s.id = brainstorm_items.session_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS brainstorm_items_delete_policy
  ON public.brainstorm_items;
CREATE POLICY brainstorm_items_delete_policy
  ON public.brainstorm_items
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brainstorm_sessions s
      JOIN public.books b ON b.id = s.project_id
      WHERE s.id = brainstorm_items.session_id
        AND b.user_id = auth.uid()
    )
  );

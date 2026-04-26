-- Prompt 7 — Chapter-grounded chat panel
--
-- Author-facing sidebar chat that lets writers ask questions grounded in
-- the current book / chapter / codex / outline. Two tables:
--
--   chat_threads   — one per conversation. Scoped to a book; optionally
--                    pinned to a specific chapter so the API can bias
--                    context-assembly toward that chapter by default.
--   chat_messages  — individual turns (role: user|assistant|system) with
--                    an optional `mentions` JSONB array recording any
--                    @-references the author inserted (codex / chapter).
--
-- RLS cascades from `books.user_id`. We do NOT store user_id directly on
-- the thread because the book already owns the user; forking ownership
-- (e.g. sharing a thread with a collaborator) is deliberately out of
-- scope for v1. When it becomes necessary, add `user_id` + a second
-- policy rather than overloading the book-owner rule.
--
-- `mentions` shape is loose on purpose — the UI pushes objects shaped
-- like `{ type: 'codex' | 'chapter', id: UUID, label?: string }`. The
-- resolver validates per-row when it renders the chat context; storing
-- them as JSONB keeps the table simple.

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chat_threads_title_length
    CHECK (title IS NULL OR char_length(title) <= 200)
);

CREATE INDEX IF NOT EXISTS chat_threads_project_id_idx
  ON public.chat_threads (project_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS chat_threads_chapter_id_idx
  ON public.chat_threads (chapter_id)
  WHERE chapter_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  /* Protect against runaway inserts. 32k chars per turn is enough for
   * an essay-length prompt; the model response is bounded server-side. */
  CONSTRAINT chat_messages_content_length
    CHECK (char_length(content) <= 32000),

  /* Mentions must be a JSON array at the top level — we don't allow
   * bare scalar values. App code pushes objects; the constraint is a
   * cheap shape guard. */
  CONSTRAINT chat_messages_mentions_array
    CHECK (jsonb_typeof(mentions) = 'array')
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx
  ON public.chat_messages (thread_id, created_at ASC);

/* Keep `chat_threads.updated_at` in sync when a new message lands —
 * gives the UI a cheap "sort threads by recent activity" without
 * chaining an UPDATE from app code every turn. */
CREATE OR REPLACE FUNCTION public.chat_threads_bump_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.chat_threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_bump_thread_updated
  ON public.chat_messages;

CREATE TRIGGER chat_messages_bump_thread_updated
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_threads_bump_updated_at();

/* ==========================================================================
 * RLS — everything cascades from `books.user_id`.
 * ==========================================================================
 */
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_threads_select_policy
  ON public.chat_threads;
CREATE POLICY chat_threads_select_policy
  ON public.chat_threads
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = chat_threads.project_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_threads_insert_policy
  ON public.chat_threads;
CREATE POLICY chat_threads_insert_policy
  ON public.chat_threads
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = chat_threads.project_id
        AND b.user_id = auth.uid()
    )
    /* If a chapter is pinned, it must belong to the same book. */
    AND (
      chat_threads.chapter_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.chapters c
        WHERE c.id = chat_threads.chapter_id
          AND c.book_id = chat_threads.project_id
      )
    )
  );

DROP POLICY IF EXISTS chat_threads_update_policy
  ON public.chat_threads;
CREATE POLICY chat_threads_update_policy
  ON public.chat_threads
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = chat_threads.project_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = chat_threads.project_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_threads_delete_policy
  ON public.chat_threads;
CREATE POLICY chat_threads_delete_policy
  ON public.chat_threads
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = chat_threads.project_id
        AND b.user_id = auth.uid()
    )
  );

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

/* Message access follows thread access: owner of the book = owner of
 * every message in every thread under that book. Two-hop join keeps the
 * policy readable at the cost of one extra index lookup (both hops are
 * indexed). */
DROP POLICY IF EXISTS chat_messages_select_policy
  ON public.chat_messages;
CREATE POLICY chat_messages_select_policy
  ON public.chat_messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      JOIN public.books b ON b.id = t.project_id
      WHERE t.id = chat_messages.thread_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_insert_policy
  ON public.chat_messages;
CREATE POLICY chat_messages_insert_policy
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      JOIN public.books b ON b.id = t.project_id
      WHERE t.id = chat_messages.thread_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_delete_policy
  ON public.chat_messages;
CREATE POLICY chat_messages_delete_policy
  ON public.chat_messages
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      JOIN public.books b ON b.id = t.project_id
      WHERE t.id = chat_messages.thread_id
        AND b.user_id = auth.uid()
    )
  );

/* Messages are append-only from the UI (edit = new thread), so no
 * UPDATE policy is defined. Add one later if the feature ships
 * in-place edits. */

/* ==========================================================================
 * Seed the `chat` platform-default prompt template.
 * ==========================================================================
 * `prompt_templates` was introduced in migration 034 and seeded with the
 * other six tasks. The chat task was added in this migration, so we add
 * its default here so that `getActiveTemplate` can find a row. Kept in
 * sync with `lib/ai/default-templates.ts`.
 */
INSERT INTO public.prompt_templates (
  user_id,
  project_id,
  task_id,
  name,
  template_text,
  is_default
)
VALUES (
  NULL,
  NULL,
  'chat',
  'Story chat — platform default',
  $$You are a story consultant for the author of "{project.title}" ({project.genre}). Answer the user's question grounded in the materials provided in <worldbook>, <outline>, and <chapter>. If the user asks for brainstorming, produce multiple options. Never claim to know events that aren't in the provided context. Tone: collegial, specific, lightly opinionated — the kind of developmental editor the author would actually want. Keep responses concise unless asked for depth.

## Worldbook (characters, places, lore — canonical)
{codex}

## Outline so far (prior chapter summaries)
{prior_summaries}

## Current chapter
Chapter {chapter.number}: "{chapter.title}"

### Recent prose
{recent_prose}

## Voice reference
{style_examples}
{style_instructions}

Rules:
- When the user @mentions a codex entry or chapter, treat those references as high-priority context.
- If asked to brainstorm, return a numbered list of 3–7 options, each one sentence, each with a different shape.
- If a question can't be answered from the provided context, say so and offer the next question the author could answer themselves.
- POV: {project.pov}. Tense: {project.tense}.$$,
  true
)
ON CONFLICT DO NOTHING;

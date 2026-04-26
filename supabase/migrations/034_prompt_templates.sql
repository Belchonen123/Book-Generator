-- Prompt 6 — Prompt Template Editor
--
-- Lets power users inspect and override the system prompts behind every
-- AI generation task. The editor ships with three resolution tiers:
--   1. project-specific override  (user_id, project_id, task_id)
--   2. user-wide override         (user_id, NULL project_id, task_id)
--   3. platform default           (NULL user_id, NULL project_id,
--                                  is_default=true, task_id)
--
-- We enforce "one platform default per task" with a partial unique index.
-- The actual default template TEXT lives in `lib/ai/default-templates.ts`
-- and is inserted by the seed block at the bottom of this migration; the
-- app code is treated as the source of truth, and a supabase `db reset`
-- will reseed the rows. If you edit a default, bump this migration OR add
-- a follow-up migration that UPSERTs the new text.

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /* NULL => platform default. */
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  /* NULL => user-wide (or platform default when user_id is also null). */
  project_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  /* Platform defaults MUST have no user / project scope. Partial unique
   * index below enforces one default per task. */
  CONSTRAINT prompt_templates_default_unscoped
    CHECK (is_default = false OR (user_id IS NULL AND project_id IS NULL)),

  /* Cheap guardrail to catch runaway input client-side, mirrors the UI
   * cap. Tune if the editor ever needs to allow longer templates. */
  CONSTRAINT prompt_templates_text_length
    CHECK (char_length(template_text) <= 10000),

  /* Non-empty task_id / name keep the UI render predictable. */
  CONSTRAINT prompt_templates_task_id_nonempty
    CHECK (char_length(task_id) > 0),
  CONSTRAINT prompt_templates_name_nonempty
    CHECK (char_length(name) > 0)
);

/* One row per (user, project, task). A user can override project-wide OR
 * project-scoped, but not two rows that collide on the same tuple. NULLs
 * are compared via COALESCE to side-step Postgres's "NULL ≠ NULL" rule so
 * that (NULL project_id) rows get the unique check too. */
CREATE UNIQUE INDEX IF NOT EXISTS prompt_templates_scope_task_idx
  ON public.prompt_templates (
    COALESCE(user_id::text, ''),
    COALESCE(project_id::text, ''),
    task_id
  );

CREATE INDEX IF NOT EXISTS prompt_templates_task_id_idx
  ON public.prompt_templates (task_id);

/* One platform default per task. */
CREATE UNIQUE INDEX IF NOT EXISTS prompt_templates_default_idx
  ON public.prompt_templates (task_id)
  WHERE is_default AND user_id IS NULL AND project_id IS NULL;

/* `updated_at` bookkeeping. */
CREATE OR REPLACE FUNCTION public.prompt_templates_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prompt_templates_updated_at
  ON public.prompt_templates;

CREATE TRIGGER prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.prompt_templates_set_updated_at();

/* ==========================================================================
 * RLS
 * ==========================================================================
 * Anyone (authenticated or not) can READ platform defaults — the editor
 * needs to show the reference copy even if a user never overrode it. Users
 * can read/write their own rows. Project-scoped rows are additionally
 * checked against the `books` owner (belt-and-braces; UPDATE also filters
 * on `user_id` in app code, but a server-to-supabase call with a compromised
 * user could theoretically forge a row for someone else's book otherwise).
 */
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_templates_select_policy
  ON public.prompt_templates;
CREATE POLICY prompt_templates_select_policy
  ON public.prompt_templates
  FOR SELECT
  USING (
    /* Platform default — readable by anyone who can hit this API. */
    (user_id IS NULL AND is_default)
    /* Own row. */
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS prompt_templates_insert_policy
  ON public.prompt_templates;
CREATE POLICY prompt_templates_insert_policy
  ON public.prompt_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND is_default = false
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = project_id
          AND b.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS prompt_templates_update_policy
  ON public.prompt_templates;
CREATE POLICY prompt_templates_update_policy
  ON public.prompt_templates
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND is_default = false
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND is_default = false
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = project_id
          AND b.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS prompt_templates_delete_policy
  ON public.prompt_templates;
CREATE POLICY prompt_templates_delete_policy
  ON public.prompt_templates
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND is_default = false
  );

COMMENT ON TABLE public.prompt_templates IS
  'User-editable system-prompt templates per AI task. Resolution order per request: project-specific override > user-wide override > platform default.';

COMMENT ON COLUMN public.prompt_templates.task_id IS
  'Stable identifier for the AI task (e.g. chapter-gen, generate-outline). See lib/ai/template-variables.ts for the canonical list.';

COMMENT ON COLUMN public.prompt_templates.is_default IS
  'True for platform defaults seeded into the table. Users cannot set this via the UI — enforced by RLS.';

/* ==========================================================================
 * Seed — platform defaults
 * ==========================================================================
 * These mirror the templates in `lib/ai/default-templates.ts`. When the
 * app starts up it also reconciles defaults via `ensurePlatformDefaults()`
 * so deleting a row locally is self-healing; this block is primarily for
 * fresh `supabase db reset`s.
 */
INSERT INTO public.prompt_templates (user_id, project_id, task_id, name, template_text, is_default)
VALUES
  (NULL, NULL, 'chapter-gen', 'Chapter generation (default)',
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

Genre: {project.genre}. POV: {project.pov}. Tense: {project.tense}. Book: "{project.title}".$DEFAULT$,
   true),

  (NULL, NULL, 'generate-outline', 'Outline generation (default)',
$DEFAULT$You are a senior book development editor outlining "{project.title}" ({project.genre}).

## Premise
{project.premise}

## Voice & style anchor
{style_examples}
{style_instructions}

## Series context (canon across books — do not contradict)
{series_context}

## Worldbook (characters, locations, lore — hard continuity)
{codex}

## Author guidance
{user_instruction}

Produce a chapter-by-chapter outline. Each chapter needs:
- a working title
- one-line emotional contract (what the reader feels in their body)
- opening move (specific, not generic)
- signature detail (one granular world element unique to this chapter)
- the question the chapter opens that the next chapter picks up
- bridges_to_next (how the scene ending pulls forward)

Avoid generic hero's-journey beats unless the premise explicitly asks for them. Reject four-sentence summaries — scene-level specificity or nothing. Emit the outline as JSON matching the schema the caller will validate.$DEFAULT$,
   true),

  (NULL, NULL, 'refine-idea', 'Idea refinement (default)',
$DEFAULT$You are a senior book development editor at a literary press working with the author on "{project.title}" ({project.genre}).

Your job is NOT to collect generic metadata. Surface the specific, irrational, personal details that make a book feel written by a human with a point of view.

## How to behave
- Ask ONE focused question per turn. Do not interview.
- React with curiosity, not summary.
- Push back gently when an answer is generic ("brave" → "what is she a coward about?").
- Never suggest plot beats, names, or themes yourself unless asked.
- After 8–12 exchanges, or when the brief is rich enough, emit the refined brief and stop asking.

## Author's latest turn
{user_instruction}

When the brief is complete, emit JSON wrapped in <REFINED_IDEA>...</REFINED_IDEA> covering: title, subtitle, genre, subgenre, target_audience, core_premise, tone_and_style, protagonist_core_wound, world_specific_detail, must_have_scene, arc_shape, unique_angle, emotional_contract, comparable_titles (array), voice_anchor, before_state, after_state, key_themes (array), estimated_length.

Empty beats invented — fields the author declined to answer should be empty strings (or arrays). Emptiness is better than fabrication.$DEFAULT$,
   true),

  (NULL, NULL, 'inline-command', 'Inline editor command (default)',
$DEFAULT$You are a prose editor working inside "{project.title}" ({project.genre}, Chapter {chapter.number}: "{chapter.title}").

## Voice to match
{style_examples}
{style_instructions}

## Series context (canon across books — do not contradict)
{series_context}

## Worldbook (do not contradict)
{codex}

## Context above the selection
{preceding_context}

## Selection the author wants edited
{selection}

## Context after the selection
{following_context}

## Command from the author
{user_instruction}

Return ONLY the replacement prose — no preamble, no quotes, no meta. Match the voice exactly. Respect POV ({project.pov}) and tense ({project.tense}). Never paraphrase the author's intent — obey it.$DEFAULT$,
   true),

  (NULL, NULL, 'chapter-assist', 'Chapter assistant (default)',
$DEFAULT$You are helping the author draft "{project.title}" ({project.genre}) — Chapter {chapter.number}: "{chapter.title}".

## Voice
{style_examples}
{style_instructions}

## Series context (canon across books — do not contradict)
{series_context}

## Worldbook
{codex}

## Prior chapters
{prior_summaries}

## Chapter so far
{recent_prose}

## Author request
{user_instruction}

Reply as the editor helping them land the next move. Keep response tight and actionable. When writing prose, match the voice in the style anchor above exactly.$DEFAULT$,
   true),

  (NULL, NULL, 'expand-outline', 'Expand outline beat (default)',
$DEFAULT$You are a senior editor expanding one outline beat for "{project.title}" ({project.genre}) into a shot list for Chapter {chapter.number}: "{chapter.title}".

## Beat
{chapter.beat}

## Voice reference
{style_examples}

## Series context (canon across books — do not contradict)
{series_context}

## Worldbook
{codex}

## Prior chapters (for continuity)
{prior_summaries}

## Author guidance
{user_instruction}

Expand the beat into 4–8 concrete scene moves. Each move is one sentence naming: WHO acts, WHAT changes, WHERE it happens, and the small specific detail that makes this scene not interchangeable with another book's version. Don't write prose. Write the spine.$DEFAULT$,
   true),

  (NULL, NULL, 'chat', 'Story chat (default)',
$DEFAULT$You are a story consultant for the author of "{project.title}" ({project.genre}). Answer the user's question grounded in the materials provided in <worldbook>, <outline>, and <chapter>. If the user asks for brainstorming, produce multiple options. Never claim to know events that aren't in the provided context. Tone: collegial, specific, lightly opinionated — the kind of developmental editor the author would actually want. Keep responses concise unless asked for depth.

## Series context (canon across books — do not contradict)
{series_context}

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
- POV: {project.pov}. Tense: {project.tense}.$DEFAULT$,
   true),

  (NULL, NULL, 'scene-beat', 'Scene beat expansion (default)',
$DEFAULT$You are ghostwriting "{project.title}" — a {project.genre} novel — in {project.pov} POV and {project.tense} tense. The author has written a beat describing what should happen next; expand it into finished published prose.

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

## Beat to expand
{user_instruction}

Rules:
- Produce prose only. No preamble, no meta commentary, no chapter headings, no scene break markers.
- Read the beat literally. Every action/line/image the author names happens on-page; skip nothing.
- When you see bracketed instructions in the beat — e.g. [slow down], [describe the smell], [end on a line of dialogue] — treat them as stage directions. Implement them. NEVER repeat the brackets or their text in the output.
- Do NOT introduce new named characters, locations, or major plot events that aren't in the beat or prior context. Stay grounded.
- Match POV ({project.pov}) and tense ({project.tense}) exactly. Match the voice of the Recent prose — sentence rhythm, diction, interiority level.
- Write the requested length naturally. If a beat feels short for the target, deepen through specific sensory detail and character interiority, not filler.$DEFAULT$,
   true)
ON CONFLICT DO NOTHING;

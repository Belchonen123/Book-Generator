-- 039_scene_beat_template.sql
--
-- Prompt 9: scene-beat blocks. Register the default platform template for
-- the `scene-beat` task so the template resolver can find a row when the
-- new editor node streams prose via /api/ai/scene-beat.
--
-- No new tables or columns. This migration only seeds one row into
-- `prompt_templates` (introduced in migration 034). `ON CONFLICT DO
-- NOTHING` keeps the migration idempotent — re-running it after an admin
-- has hand-edited the default is a no-op.

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
  'scene-beat',
  'Scene-beat expansion — platform default',
  $$You are ghostwriting "{project.title}" — a {project.genre} novel — in {project.pov} POV and {project.tense} tense. The author has written a beat describing what should happen next; expand it into finished published prose.

## Voice anchor & style
{style_examples}

{style_instructions}

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
- Write the requested length naturally. If a beat feels short for the target, deepen through specific sensory detail and character interiority, not filler.$$,
  true
)
ON CONFLICT DO NOTHING;

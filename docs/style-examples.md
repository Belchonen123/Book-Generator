# Style Examples — per-project voice injection

## What it is

`books.style_examples` is an optional 500–2,000 word sample of prose the
author wants the AI to emulate. `books.style_instructions` is a short free-form
steering note (e.g. "match this voice but keep dialogue tighter"). Both are set
on the project's **Voice & Style** page (`/projects/[id]/style`) and stored as
nullable `TEXT` columns — see migration `029_book_style_examples.sql`.

## How it is injected

`lib/openai/style-examples.ts` exports a single helper:

```ts
buildStyleExamplesBlock({ style_examples, style_instructions })
```

Every prose-generating AI route calls it and appends the result to its system
prompt. The helper returns an empty string when `style_examples` is unset, so
appending is always safe. The block looks like:

```
<style_examples>
…author sample…
</style_examples>

<style_instructions>
Match the voice, sentence rhythm, and vocabulary register of the style_examples
above. Do not copy phrases; emulate the feel. …author note…
</style_instructions>
```

The block is always appended **after** every other section of the system prompt
(series continuity, character bible, etc.) because tail position gets the
strongest model attention.

## Routes that inject (prose-generating)

- `app/api/ai/generate-chapter/route.ts`
- `app/api/ai/expand-outline/route.ts`
- `app/api/ai/chapter-assist/route.ts`
- `app/api/ai/refine-idea/route.ts`
- `app/api/ai/generate-outline/route.ts`
- `app/api/ai/voice-to-chapter/route.ts`
- `app/api/ai/inline-assist/route.ts`
- `app/api/ai/inline-command/route.ts`
- `app/api/ai/rewrite-transitions/route.ts`
- `app/api/ai/polish-replacements/route.ts`

## Routes that do NOT inject (metadata / cover / analysis)

These routes either produce non-prose output (DALL·E prompts, structured
metadata fields) or analyze existing prose rather than generating new prose.
Injecting wastes tokens and can derail the required JSON/prompt formats:

- `app/api/ai/generate-cover/route.ts`
- `app/api/ai/generate-book-metadata/route.ts`
- `app/api/ai/generate-subtitle/route.ts`
- `app/api/ai/generate-back-cover/route.ts`
- `app/api/ai/generate-about-author/route.ts`
- `app/api/ai/analyze-beats/route.ts`
- `app/api/ai/check-consistency/route.ts`
- `app/api/ai/regenerate-idea-field/route.ts`

## Adding a new prose route

1. Select `style_examples, style_instructions` alongside the rest of the book
   row (or import `STYLE_EXAMPLES_SELECT_COLUMNS` from
   `lib/openai/style-examples.ts`).
2. Append `buildStyleExamplesBlock({ style_examples, style_instructions })` to
   the system prompt string.
3. Leave everything else alone. The helper no-ops when the sample is unset.

## Server action

The **Voice & Style** page calls `updateStyleExamples(projectId, examples,
instructions)` from
`app/(dashboard)/projects/[id]/style/actions.ts`. The action validates
ownership via Supabase auth and row-owner check, and returns
`{ success, error? }`.

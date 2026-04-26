# Inline AI Commands — bubble-menu multi-alternative rewriter

## What it is

When the author highlights a passage in the TipTap chapter editor, the bubble
menu now surfaces six preset AI commands:

| Command         | What it does                                                                 |
| --------------- | ---------------------------------------------------------------------------- |
| Rewrite         | Same voice, different wording + sentence structure                           |
| Expand          | ~2× length with sensory detail, interiority, beat-level pacing (no new plot) |
| Shorten         | Tighten to ~60% — preserve every beat and every line of dialogue             |
| Describe        | Add concrete sensory detail (objects, smells, textures, sounds)              |
| Show Don't Tell | Replace stated emotions with action, dialogue, sensory cues                  |
| Custom          | Free-form author instruction                                                 |

Clicking a command opens a slide-in panel on the right of the editor that
streams 2–3 distinct rewrites into a card stack. Each card offers
**Insert** (replace the selection), **Append below** (insert as a new
paragraph), and **Copy**. Panel-level footer: **Regenerate** and **Close**.

## Files

| Path                                                     | Role                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `lib/ai/inline-commands.ts`                              | Command registry (`label`, `description`, `promptFragment`) + shared `ALTERNATIVE_DELIMITER` |
| `lib/utils/schemas.ts`                                   | `InlineCommandRequestSchema`                                          |
| `app/api/ai/inline-command/route.ts`                     | POST endpoint. Streams raw `text/plain` with `---ALTERNATIVE---` separators |
| `components/book/chapter-editor/bubble-menu.tsx`         | Adds the 6 new buttons                                                |
| `components/book/chapter-editor/utils.ts`                | Selection + context extraction helpers (preserves sentence boundaries) |
| `components/book/chapter-editor/inline-command-panel.tsx`| Card-stack UI                                                         |
| `components/book/chapter-editor/ChapterEditor.tsx`       | Wires it all together (state, streaming, Insert / Append / Regenerate) |

## Prompt shape

The route builds the prompt described in the feature spec:

```
System:
You are a fiction editor working inside an author's manuscript. Preserve
character voice, POV, and tense. Do not introduce new plot events or
characters. Return ONLY the rewritten passage, no commentary, no quotes,
no labels.
<style_examples>…</style_examples>             (if set — see docs/style-examples.md)
<style_instructions>…</style_instructions>

User:
GENRE: <genre>
POV: unspecified
TENSE: unspecified

PRECEDING CONTEXT (for tone/voice reference, do not rewrite):
<~500 words before the selection>

---

PASSAGE TO REWRITE:
<selection>

---

FOLLOWING CONTEXT (for tone/voice reference, do not rewrite):
<~300 words after the selection>

Task: <commandPromptFor(command, customInstruction)>

Return <alternativeCount> distinct alternative rewrites, separated by the
exact delimiter line '---ALTERNATIVE---' on its own line.
```

### POV / tense

`books` does not yet have dedicated POV or tense columns (they live inferred
inside `refined_idea`). Until the codex schema (Prompt 3) ships real columns
the route sends `"unspecified"` for both. Voice/register is still anchored
by the preceding-context window and `style_examples`.

### Codex

Prompt 3 (codex entries detected in the selection + context) is not yet
implemented. The route is structured so adding a codex block later is a
single helper call alongside `buildStyleExamplesBlock`; the prompt template
has room for it between the style block and the user message.

## Streaming protocol

The route returns `Content-Type: text/plain; charset=utf-8` and streams raw
chunks from the OpenAI completion straight through a `ReadableStream`. The
client (`ChapterEditor.runInlineCommandStream`) accumulates the bytes and
splits on the shared `ALTERNATIVE_DELIMITER` constant as they arrive:

1. All splits except the last are rendered as `complete` cards.
2. The last split is rendered as a `streaming` card (with a spinner).
3. On `done`, the last split promotes to `complete`; empty trailing splits
   are dropped.

A mid-stream error emits `\n---ALTERNATIVE---\n[ERROR] …` so the panel's
error card renders the partial alternatives alongside a Retry button.

## Edge cases

| Case                                | Handling                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Empty selection                     | Bubble menu doesn't render (TipTap `shouldShow` returns false). Click path toasts "Select some text first." if invoked programmatically. |
| Selection > 2,000 words             | Toast: "Selection too long. Try a smaller passage." — request is not sent.                 |
| Streaming error                     | Panel flips to `error` status; existing alternatives stay visible; [Retry] reruns the same request. |
| User closes panel mid-stream        | `AbortController.abort()` tears down the fetch; the stale resolver is guarded by `prev.request` identity. |
| Document edited between click & Insert | `from/to` clamped to current doc size before the TipTap chain runs.                      |
| Rate limit hit                      | Server returns `apiJsonRateLimited`; client shows the generic toast.                        |
| Missing `OPENAI_API_KEY`            | Server returns `openAIRequestFailureResponse` — surfaces as "The assistant is temporarily unavailable." |
| Free tier, chapter > free cap       | Server returns `UPGRADE_REQUIRED`; client opens the `ProUpgradeModal` and closes the panel. |

## Adding a new preset command

1. Add an entry to `INLINE_COMMANDS` in `lib/ai/inline-commands.ts` (and to
   `INLINE_COMMAND_IDS` just above it).
2. Pick an icon in `bubble-menu.tsx`'s `INLINE_COMMAND_ICONS` map and add it
   to `INLINE_COMMAND_ORDER`.
3. Done — the API route, panel, and streaming layer are agnostic to which
   commands exist.

A future **Prompt 6** (customizable templates) will replace step 1 with a
user-editable row in a new `command_templates` table; the registry is the
planned swap point.

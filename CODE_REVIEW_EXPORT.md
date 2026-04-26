# Code Review Export

This document consolidates the recent Codex-related fixes into a single file for review.

---

## 1) `app/api/ai/generate-chapter/route.ts`

### A) Import + helper additions for outline-driven codex context

```ts
import { buildCodexBlock } from "@/lib/ai/codex-context";

const OUTLINE_CODEX_TEXT_MAX_CHARS = 12_000;

function collectStringLeaves(value: unknown, out: string[], seen: Set<string>): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringLeaves(item, out, seen);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    collectStringLeaves(nested, out, seen);
  }
}

function buildOutlineSectionCodexText(
  outlineSection: Record<string, unknown> | null,
): string {
  if (!outlineSection) return "";
  const lines: string[] = [];
  const seen = new Set<string>();
  collectStringLeaves(outlineSection, lines, seen);
  const joined = lines.join("\n");
  if (!joined) return "";
  return joined.length <= OUTLINE_CODEX_TEXT_MAX_CHARS
    ? joined
    : joined.slice(0, OUTLINE_CODEX_TEXT_MAX_CHARS);
}
```

### B) Auto-force codex entries from outline mentions

```ts
const outlineForcedCodexEntryIds = codexIdArrayField(
  outlineSection,
  "forced_codex_entry_ids",
);
const outlineCodexText = buildOutlineSectionCodexText(outlineSection);
const autoForcedFromOutlineMentions = outlineCodexText
  ? (
      await buildCodexBlock(supabase, bookId, outlineCodexText, {
        tokenBudget: 1,
        currentChapterNumber: chapter.chapter_number,
      })
    ).matchedEntryIds
  : [];
const mergedForcedCodexEntryIds = Array.from(
  new Set([
    ...(selectedCodexEntryIds ?? []),
    ...outlineForcedCodexEntryIds,
    ...autoForcedFromOutlineMentions,
  ]),
);
```

### C) Include outline-derived text in codex matching context

```ts
const codexTextContext = [
  chapter.title,
  chapter.outline_summary ?? "",
  outlineCodexText,
  codexAuthorNotes,
  priorSummaries.join("\n"),
]
  .filter((s) => !!s)
  .join("\n");
```

---

## 2) `app/(dashboard)/projects/[id]/codex/_components/codex-page-content.tsx`

### A) Surface create failures (`New` button) immediately

```ts
const handleCreate = (
  scopeOverride?: Extract<CodexEntryScopeDb, "project" | "series">,
  seedPatch?: Partial<CodexEntry>,
  entryTypeOverride?: CodexEntryType,
) => {
  startCreateTransition(async () => {
    setSaveErrors((m) => {
      if (!m.__create) return m;
      const next = { ...m };
      delete next.__create;
      return next;
    });

    const res = await createCodexEntry(bookId, {
      entry_type: createType,
      name: `New ${meta.label.toLowerCase()}`,
      ai_scope: "on_match",
      scope: seriesContext ? resolvedScope : "project",
    });

    if (!res.success) {
      setSaveErrors((m) => ({ ...m, __create: res.error }));
      toast.error(res.error);
      return;
    }

    setSaveErrors((m) => {
      if (!m.__create) return m;
      const next = { ...m };
      delete next.__create;
      return next;
    });

    // ... existing optimistic creation flow
  });
};
```

### B) Inline create error rendering near the `New` control

```tsx
{saveErrors.__create ? (
  <p className="text-xs text-red-300">{saveErrors.__create}</p>
) : null}
```

---

## 3) `app/(dashboard)/projects/[id]/codex/actions.ts`

### Fix Next.js server-action export violation

`"use server"` files must not export runtime objects/constants unless valid server action exports.  
The following were changed from exported constants to internal constants:

```ts
const CODEX_UI_TYPES: readonly CodexEntryTypeDb[] = [
  "character",
  "location",
  "object",
  "lore",
  "faction",
  "subplot",
] as const;

const CODEX_AI_SCOPES: readonly CodexEntryAiScopeDb[] = [
  "always",
  "on_match",
  "never",
] as const;
```

---

## Notes

- This export focuses on the changed sections relevant to Codex matching, forced inclusion, and Codex entry creation UX/runtime stability.
- If you want a full raw per-file dump (entire file contents concatenated), I can generate a second artifact for that format.
# ChapterAI - code review export

Single-file bundle of the **idea to outline to chapter** pipeline, prompts, types, key UI, Anthropic client usage, and the chapter **editor toolbar**. Generated for external review. The full app lives in the repository; this is not a complete copy of every file.

Generated: 2026-04-22 21:34:49
Files: 13

Fences use tilde (three) so triple backticks inside source (e.g. markdown strings) do not break the bundle.

## Contents (search for these path headings)

1. ``lib/anthropic/client.ts``
2. ``lib/anthropic/message-attempts.ts``
3. ``lib/anthropic/text-model.ts``
4. ``lib/openai/literary-chapter-system-prompts.ts``
5. ``lib/openai/prompts.ts``
6. ``lib/openai/idea-refinement-briefs.ts``
7. ``lib/openai/outline-briefs.ts``
8. ``app/api/ai/generate-chapter/route.ts``
9. ``app/api/ai/generate-outline/route.ts``
10. ``types/book.types.ts``
11. ``components/book/IdeaChat.tsx``
12. ``components/book/OutlineEditor.tsx``
13. ``components/book/chapter-editor/toolbar.tsx``

---

## ``lib/anthropic/client.ts``

~~~ts
import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy singleton — server-only; do not import from Client Components.
 * Uses ANTHROPIC_API_KEY from the environment.
 */
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
~~~

## ``lib/anthropic/message-attempts.ts``

~~~ts
import { APIError } from "@anthropic-ai/sdk";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

import { getAnthropicClient } from "@/lib/anthropic/client";

type RetryDecision = "stop" | "try_plain_system" | "next_model";

function classifyAnthropicCreateError(
  err: unknown,
  usedCachedSystem: boolean,
): RetryDecision {
  if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
    return "stop";
  }

  if (!(err instanceof APIError) || err.status === undefined) {
    return "stop";
  }

  const status = err.status;
  const msg = err.message.toLowerCase();

  if (status === 401 || status === 403 || status === 429) {
    return "stop";
  }
  if (status === 404) {
    return "next_model";
  }
  if (status === 400) {
    if (
      usedCachedSystem &&
      (msg.includes("cache") || msg.includes("cache_control"))
    ) {
      return "try_plain_system";
    }
    if (
      msg.includes("model") ||
      msg.includes("not_found") ||
      msg.includes("invalid_request_error")
    ) {
      return "next_model";
    }
    if (usedCachedSystem) {
      return "try_plain_system";
    }
    return "next_model";
  }
  if (status >= 500) {
    return "stop";
  }
  return "stop";
}

export type AnthropicMessagesArgs = {
  systemPrompt: string;
  max_tokens: number;
  temperature: number;
  messages: MessageParam[];
};

export async function anthropicMessagesCreateNonStreaming(
  args: AnthropicMessagesArgs,
  models: string[],
): Promise<{ message: Message; modelUsed: string }> {
  let lastErr: unknown;

  for (const model of models) {
    for (const mode of ["cached", "plain"] as const) {
      const usedCache = mode === "cached";
      const system = usedCache
        ? [
            {
              type: "text" as const,
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : args.systemPrompt;

      try {
        const message = await getAnthropicClient().messages.create({
          model,
          max_tokens: args.max_tokens,
          temperature: args.temperature,
          system,
          messages: args.messages,
          stream: false,
        });
        return { message, modelUsed: model };
      } catch (err) {
        lastErr = err;
        const decision = classifyAnthropicCreateError(err, usedCache);
        if (decision === "stop") {
          throw err;
        }
        if (decision === "try_plain_system" && usedCache) {
          continue;
        }
        if (decision === "next_model") {
          break;
        }
      }
    }
  }

  throw lastErr;
}

export async function anthropicMessagesCreateStreaming(
  args: AnthropicMessagesArgs,
  models: string[],
): Promise<{ stream: AsyncIterable<unknown>; modelUsed: string }> {
  let lastErr: unknown;

  for (const model of models) {
    for (const mode of ["cached", "plain"] as const) {
      const usedCache = mode === "cached";
      const system = usedCache
        ? [
            {
              type: "text" as const,
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : args.systemPrompt;

      try {
        const stream = await getAnthropicClient().messages.create({
          model,
          max_tokens: args.max_tokens,
          temperature: args.temperature,
          system,
          messages: args.messages,
          stream: true,
        });
        return { stream, modelUsed: model };
      } catch (err) {
        lastErr = err;
        const decision = classifyAnthropicCreateError(err, usedCache);
        if (decision === "stop") {
          throw err;
        }
        if (decision === "try_plain_system" && usedCache) {
          continue;
        }
        if (decision === "next_model") {
          break;
        }
      }
    }
  }

  throw lastErr;
}

/**
 * The Vercel AI SDK `AnthropicStream` `onFinal` callback sometimes receives an
 * empty string even when the model produced text (stream event shape vs.
 * `streamable` aggregation mismatch). The Anthropic `MessageStream` still
 * holds the final assistant text; call `finalText()` after the stream ends.
 */
export async function getChapterTextForPersistence(
  messageStream: unknown,
  aiSdkOnFinalText: string,
): Promise<string> {
  const fromSdk = aiSdkOnFinalText.trim();
  if (fromSdk) return fromSdk;
  const ms = messageStream as { finalText?: () => Promise<string> };
  if (typeof ms.finalText !== "function") return "";
  try {
    return (await ms.finalText()).trim();
  } catch {
    return "";
  }
}
~~~

## ``lib/anthropic/text-model.ts``

~~~ts
/** Default text model for outline / chapter generation (Messages API). Sonnet 4.5. */
export const DEFAULT_ANTHROPIC_TEXT_MODEL = "claude-sonnet-4-5-20250929";

/**
 * When the primary alias is not enabled for an API key, try dated Sonnet IDs next.
 * Override order with ANTHROPIC_TEXT_MODEL (single model id).
 */
const FALLBACK_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
] as const;

export function anthropicTextModelsToTry(): string[] {
  const fromEnv = process.env.ANTHROPIC_TEXT_MODEL?.trim();
  const primary = fromEnv || DEFAULT_ANTHROPIC_TEXT_MODEL;
  const seen = new Set<string>([primary]);
  const out: string[] = [primary];
  for (const m of FALLBACK_MODELS) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}
~~~

## ``lib/openai/literary-chapter-system-prompts.ts``

~~~ts
/* eslint-disable max-len */
/**
 * Long-form system prompts for full chapter generation (Claude / literary flow).
 * Legacy chapter prompt bodies (historical). Full generation uses inline templates in
 * `getChapterSystemPrompt` in `prompts.ts`; this module is kept for reference and diffing.
 */

export type LiteraryChapterSystemArgs = {
  chapterNumber: number;
  chapterTitle: string;
  targetWordCount: number;
  trimmedContext: string;
  characterBlock: string;
  priorBlock: string;
};

export function buildFictionLiteraryChapterSystemPromptBody(
  a: LiteraryChapterSystemArgs,
): string {
  const { chapterNumber, chapterTitle, targetWordCount, trimmedContext, characterBlock, priorBlock } = a;
  return `You are a literary novelist under deadline. You are NOT a helpful AI assistant. You are a writer who has sold books, has a voice, and has opinions about prose. Your job is to write Chapter ${chapterNumber}: "${chapterTitle}" of a novel the author will publish. It must not be distinguishable from prose written by a human novelist who notices things.

TARGET: ${targetWordCount} words. No author notes. No summaries. No meta. Start with the required heading at the very end of this prompt, then write.

# WHY MOST AI-WRITTEN CHAPTERS FAIL

Most AI-written chapters fail for the same three reasons, and you must actively work against all three:

1. The narrator has no attitude — it's a neutral camera that reports what happens.
2. Every reaction is a face reaction ("eyes widened," "heart quickened") because the model defaulted to the highest-probability physical cliché.
3. The chapter RESOLVES at the end instead of OPENING the next question.

The brief you are given includes three fields specifically designed to fight these failures: voice_anchor, authorial_stance, and cultural_texture. USE THEM. They are not decorative.

# CRAFT RULES

## 1. Voice before setting

The FIRST sentence is a point of view, not a backdrop. Do not open with "the sky was X" or "the room was Y." Open with:
- a specific observation the POV character is making,
- a private thought or classification they've invented,
- a small concrete action,
- a line of dialogue mid-moment,
- a wry narrator remark if the authorial_stance permits it.

The OUTLINE provides an opening_psychological_move field. Use it. If no opening_psychological_move is provided, invent one in the same spirit.

## 2. The narrator has attitude

Look at the authorial_stance field in the brief. If it says the narrator is wry, ironic, or has opinions, let that narrator occasionally intrude with an aside — a small wise parenthetical, a sentence that knows something the character doesn't. Lines like:

  "...she said immediately, which is never what anyone says when they haven't done anything."

  "...he accepted it, the way other people accept that they have brown eyes."

These are the narrator speaking. They are what gives prose a fingerprint. Use them at least 2-4 times per chapter if the stance allows.

If the stance is "neutral camera," do NOT insert authorial asides. But still let the prose have rhythm and specificity.

## 3. Characterization through concrete specifics, not adjectives

NEVER write "her green eyes alight with anticipation." NEVER write "voice bubbling with infectious enthusiasm." NEVER write "heart swelling with pride."

INSTEAD, write a specific thing the character does. Examples of how to replace emotion-adjectives with behavior:

- Instead of "she was nervous": she had been holding the edge of her sleeve for a full minute without noticing.
- Instead of "he was angry": he spoke very carefully, which was how he spoke when he was choosing his words so he didn't break them.
- Instead of "she was excited": she had already stood up once, sat back down, and was now standing up again.

The signature_chapter_detail field in the outline will name a specific concrete thing for this chapter. Work it in. Make it earn its place.

## 4. Dialogue is shorthand

Real people in close relationships talk in shorthand. They finish each other's setup. They contradict without explaining. Sisters, old friends, spouses, siblings — their dialogue is dense with history.

GOOD DIALOGUE PATTERN:
  "Get off."
  "Tell me a story."
  "I'm counting."
  "Count a story."
  "Faiga."
  "Nechama."

Short lines. No "said excitedly." No "replied with enthusiasm." The action and the history do the work.

If two characters share a relationship, let at least one dialogue exchange in the chapter feel like this — dense, patterned, carrying the weight of shared history.

## 5. One sentence that stops the reader

Every chapter should contain ONE sentence that does the whole scene's work in a single move. Like:

  "Faiga took it without comment, which was how Nechama knew she was actually scared, because Faiga did not hold hands unless it mattered."

These sentences teach the reader a relationship or a character in one line. Aim for one per chapter, minimum.

## 6. Cultural texture without explanation

The brief's cultural_texture field names specific details of the world that should APPEAR but NEVER be EXPLAINED. If the cultural_texture says "havdalah, spice box, motzei shabbos, bubby, siddur" — use those words as ambient texture. Do NOT write "havdalah (the Jewish ceremony marking the end of the sabbath)." Do NOT write "her grandmother (bubby)."

Readers who don't know what these are will infer from context or not, and either way it makes the prose feel lived-in rather than researched.

## 7. Show psychological decisions, not physical reactions

When something surprising happens, do NOT default to a physical reaction (gasp, eyes widening, heart racing). Instead, show the character's mental process — what they notice, what they rule out, what they fear. Example from a chapter facing a supernatural letter:

  "Nechama was the older one. She was the one who knew what they did. This was a thing she had accepted about herself a long time ago... She stared at the window and ran the inventory she always ran when something was wrong: Are we safe. Is Faiga safe. Is anything on fire. Is anybody bleeding. Is Ima home."

The reader experiences the character's cognition, not just their facial muscles.

## 8. Chapter endings open, do not close

The outline's ending_opens_what field tells you what new question/tension the ending must introduce. The chapter MUST end on:
- A new piece of information that reframes what the reader knew
- A new complication that didn't exist when the chapter started
- A line of dialogue that shifts the frame
- A concrete action that commits the character to the next chapter

The chapter MUST NOT end on:
- A summary of what the chapter taught the characters
- A meditation on friendship, wonder, adventure, discovery
- A gauzy promise of more to come
- The phrase "little did they know"
- The phrase "and so" or "and so it was"

## 9. Prose rhythm modeled on the voice anchor

The brief's voice_anchor field names (or describes) a prose style to match. INTERNALIZE IT. If the voice_anchor is Roald Dahl, your sentences should be wry, short, and slightly cruel. If it's Kate DiCamillo, your sentences should be tender, quiet, and patient with strangeness. If it's Lemony Snicket, your sentences should be mock-scholarly. If it's Kazuo Ishiguro, restrained and emotionally concealed. If the author provided a sample paragraph, model your rhythm on it: study the sentence lengths, the presence or absence of conjunctions, the diction.

This is a HARD instruction. A chapter that ignores the voice_anchor has failed.

# BANNED PHRASES (use none of these)

No-exceptions ban list. Do not write any of these phrases or their near-twins:

- "eyes wide with [awe/wonder/curiosity/excitement/concern]"
- "heart swelling", "heart quickened", "heart lifted", "heart raced"
- "tinged with [emotion]", "bubbling with [emotion]", "bright with [emotion]"
- "a mix of [X] and [Y]" to describe a feeling
- "velvet blanket of stars / sky / night"
- "ethereal glow", "golden glow", "soft glow", "warm glow", "gentle glow"
- "pinprick of light"
- "bathed in [light/moonlight/sunlight]"
- "the air was tinged with / filled with / alive with"
- "a sense of [wonder/peace/resolve/purpose/belonging]"
- "cosmic" as a lazy adjective (cosmic adventure, cosmic journey, cosmic sea, cosmic capers)
- "the universe seemed to [breathe / hold its breath / whisper / approve]"
- "stars twinkled with approval / in agreement / with secrets"
- "infectious enthusiasm", "boundless curiosity", "unbridled joy"
- "dramatic flourish"
- Chapter endings that are a gauzy promise of future adventure

If you catch yourself typing one, stop, delete it, write what actually happens instead.

# CHARACTER CONTINUITY

- Never downgrade established relationships. If two characters are sisters, they are sisters every time. Not "her friend."
- Read the character reference BEFORE writing. If a physical trait is specified, do not contradict it.
- Named characters who appear in only this chapter should be described by role, not named.

# FORBIDDEN MOVES FROM THE BRIEF

The brief may include a forbidden_moves field. Whatever it contains, do NOT do those things. They are the author's personal vetoes.

# BRIEF + OUTLINE CONTEXT

${trimmedContext}${characterBlock}
## Prior chapter summaries (hard continuity)
${priorBlock}

# OUTPUT FORMAT

REQUIRED — your very first line must be this EXACT markdown heading, alone on its line:

# Chapter ${chapterNumber}: ${chapterTitle}

Then an empty line. Then the chapter prose. No preamble. No "Here is the chapter." No author's note. No code fences. Markdown subheadings (## or ###) only if editorially appropriate.

Before you output, mentally check:
- Did I open on character psychology, not setting description?
- Did I use the voice_anchor rhythm?
- Did I include at least one "sentence that stops the reader"?
- Did I use cultural_texture words without explaining them?
- Did the chapter end on a new question, not a resolution?
- Did I use any phrase from the banned list?

If any answer is wrong, rewrite before outputting.`;
}

export function buildNonFictionLiteraryChapterSystemPromptBody(
  a: LiteraryChapterSystemArgs,
): string {
  const { chapterNumber, chapterTitle, targetWordCount, trimmedContext, characterBlock, priorBlock } = a;
  return `You are a non-fiction author under real deadline. You are NOT a helpful assistant. You are the writer: you have a thesis, a reader in mind, and a voice. Your job is to write Chapter ${chapterNumber}: "${chapterTitle}" in a book the author will publish. The prose must read like a human who knows this subject from the inside — not a summary bot.

TARGET: about ${targetWordCount} words of finished chapter prose. No author notes, no "In conclusion," no meta. Start with the required heading at the end of this prompt, then write.

# WHY AI NON-FICTION FAILS

1. The voice is generic "business guru" or "therapist handout" with no person behind it.
2. Every point lands with a fake statistic, a name-dropped company, or a made-up case study the brief never gave you.
3. The chapter ends by restating the thesis and promising the next section — instead of leaving the reader with a question or cost they must read on to resolve.

The brief's voice_anchor, authorial_stance, and cultural_texture are binding. The outline's opening_hook_move, signature_example, and bridges_to_next are your craft map.

# VOICE / REGISTER

- **Voice anchor:** Match the prose *texture* of the named author or book (Gladwell, Mary Roach, bell hooks, Michael Lewis, Oliver Burkeman — each is a different register). Short punchy service journalism is not the same as reflective memoir-essay. A chapter that sounds like a Wikipedia abstract has failed.
- **Authorial stance:** If the brief says warm first-person, be warm. If it says cool analyst, be cool. If it says you must challenge the reader, challenge — without hedging. If the stance is "expert with stories," interleave one concrete story beat per big claim.
- **Cultural / professional texture:** The cultural_texture field lists jargon, shorthand, and insider terms the reader in this field already knows. Use them in passing. Do NOT define them in parentheses. Trust the reader you were promised. If a term might confuse a lay reader, work meaning through context, not a glossary tone.

# OPENING

The outline gives an **opening_hook_move** — a counterintuitive claim, a sharp question, a scene beat, a stat *kind* (not a fake number), or a direct provocation. Do NOT open with "In this chapter, we will…" or "This chapter covers…" or a throat-clearing definition. If opening_hook_move is empty, open with a hook in the same spirit as the book's earlier chapters.

# MIDDLE: CLAIM → EVIDENCE → SO WHAT

- State the claim plainly.
- Support it with the *kind* of evidence the brief allows: your story, reader stories in general, research as a category, interviews as a category — not invented names, companies, or data points unless they appear in the BRIEF + OUTLINE CONTEXT.

# DIALOGUE AND SCENE (WHEN THE CHAPTER IS NARRATIVE)

- Keep dialogue and reported speech in the same tight, real register as the voice anchor. No TED-talk quips. No fake banter to sound smart.

# ONE SENTENCE THAT LANDS

Include at least one sentence that does disproportionate work — reframes, names the reader's unspoken worry, or lands the chapter's one idea in a line the reader will remember.

# CULTURE / JARGON

Use cultural_texture terms naturally. The reader is an insider. No "simply put, X is…" for every term.

# ENDINGS

The outline's **bridges_to_next** field tells you what tension or question this ending must set up. The draft MUST end on that energy — a question, a cost, a reframe, or a concrete next action — not a recap, not a three-bullet summary, not "in the next chapter we explore."

# EVIDENCE DISCIPLINE

- **No invented statistics, poll numbers, years, or "studies show"** unless the BRIEF + OUTLINE CONTEXT provides them. Say "the research in this area suggests" or "in my practice, the pattern I see" when the brief is experiential.
- **No real living public figures** as if they had coffee with you unless the brief names them. No fake case studies. No Fortune 500 placeholder — name nothing you were not given.

# BANNED (BUSINESS / SELF-HELP SLOP)

Do not use these or close variants:
- "paradigm shift", "at the end of the day", "it's a journey", "move forward" / "moving forward", "unlock your potential", "game-changer", "deep dive", "leverage" (as verb, unless technical and earned), "circle back" (unless direct quoted speech in character)
- "In today's fast-paced world" or similar throat-clearing
- Chapter endings that are a soft landing of mutual affirmation

# BRIEF + OUTLINE + AUTHOR POSITIONING
${trimmedContext}${characterBlock}
## Prior chapter summaries (continuity of argument and through-line)
${priorBlock}

# OUTPUT FORMAT

Your first line must be this EXACT markdown heading, alone on its line:

# Chapter ${chapterNumber}: ${chapterTitle}

Then a blank line. Then the chapter. No preamble. No code fences. Use ## or ### only when they serve the chapter (e.g. a clear sub-argument in a long chapter).

Mental check before you send:
- Hook first sentence — not a topic header?
- voice_anchor register honored?
- signature_example and bridges_to_next honored?
- No invented "data" or names?
- Ending opens the next problem, not a recap?`;
}
~~~

## ``lib/openai/prompts.ts``

~~~ts
import { NON_FICTION_IDEA_REFINEMENT_SYSTEM_BRIEF } from "@/lib/openai/idea-refinement-briefs";
/**
 * System prompts for ChapterAI — UPGRADED v2.
 *
 * Design goals vs. the previous version:
 *  1. Refinement now extracts the *specific, irrational, textural* details that
 *     make prose feel written (protagonist wound, world-specific detail,
 *     must-have scene, comparable titles, voice anchor). Generic = slop.
 *  2. Outline prompt is no longer four sentences. It demands scene-level
 *     specificity, structural shape, emotional contract, and rejects stock
 *     "hero's journey" beats unless the brief explicitly asks for them.
 *  3. Chapter prompt now bans the specific failure modes observed in real
 *     generated manuscripts: Hallmark-quote chapter endings, bullet-point
 *     narrative structure, real public figures, "everyone-is-watching"
 *     resolutions, stock character-description tics ("eyes twinkled / lit up /
 *     widened"), and sentence patterns that read as authorial wisdom rather
 *     than character experience.
 *  4. Voice anchor (optional field on the book) gets passed *verbatim* into
 *     the chapter prompt so the model has a target to imitate instead of
 *     defaulting to its training-data mean.
 *
 * All functions return full system prompt strings for the model API
 * (server-side only).
 */

export function getIdeaRefinementSystemPrompt(): string {
  return `You are a senior book development editor at a literary press. Your
job is NOT to collect generic metadata — software can do that. Your job is to
surface the specific, irrational, personal details that make a book feel
written by a human with a point of view.

## How to behave

- Ask ONE focused question per turn. Do not interview.
- React to the author's answers with curiosity, not summary. "Tell me more
  about the part where X" beats "Great, so your tone is Y."
- Push back gently when an answer is generic. If the author says "my
  protagonist is brave," ask what she's a coward about. If they say "it's
  a thriller," ask what the reader should feel in their body on page one.
- Never suggest plot beats, character names, or themes yourself unless
  explicitly asked. You are extracting the book, not co-writing it.
- After 8–12 exchanges, or when you have enough texture to fill the brief
  below, emit the refined brief and stop asking questions.

## What to extract (ask until you have concrete answers)

Required:
- title (working title — author can change later)
- subtitle (4–14 words; a compelling promise or angle that sits under the
  title on the cover; never empty)
- genre and subgenre
- target_audience (specific: "lapsed literary fiction readers who loved
  Station Eleven" beats "adults")
- core_premise (2–3 sentences, concrete situation not abstract theme)
- tone_and_style (3–6 adjectives + one contrast, e.g. "deadpan, specific,
  warm but never sentimental")
- estimated_length (chapter count + target word count)

The fields that separate real books from AI competent filler — ask for these:
- protagonist_core_wound (the thing they won't admit to wanting, or the
  thing that happened to them that they're still reacting to)
- world_specific_detail (the one granular detail about this world that
  wouldn't appear in a different book in the same genre — a rule, a ritual,
  a texture, an object)
- must_have_scene (one image or moment the author can already see; even if
  they don't know how it fits)
- arc_shape (what the reader starts believing vs. what they believe by the
  end; this is the emotional contract, not the plot)
- unique_angle (what this book does that the top 3 books in its genre
  don't — in one sentence)
- emotional_contract (what the reader should feel in their body — not
  think, not learn. "Dread that becomes tenderness" beats "suspenseful")
- comparable_titles (2–3 real books/films this lives next to on a shelf)
- voice_anchor (optional but encouraged: a 100–400 word prose sample the
  author wants the writing to sound like — from any existing book, or from
  their own work. This is the single highest-signal field.)
- before_state / after_state (who is the reader when they open the book;
  who are they when they close it)

## Finishing

When the brief is rich enough, emit the completed brief as JSON wrapped in
<REFINED_IDEA>...</REFINED_IDEA> with these keys (all strings unless noted):
title, subtitle, genre, subgenre, target_audience, core_premise,
tone_and_style, protagonist_core_wound, world_specific_detail,
must_have_scene, arc_shape, unique_angle, emotional_contract,
comparable_titles (array of strings), voice_anchor, before_state,
after_state, key_themes (array of strings), estimated_length.

Any field the author declined to answer should be an empty string (or empty
array). Do NOT invent content for fields the author didn't provide —
emptiness is better than fabrication, because the chapter generator will
know to infer instead of follow a lie.`;
}

export function getNonFictionIdeaRefinementSystemPrompt(): string {
  return NON_FICTION_IDEA_REFINEMENT_SYSTEM_BRIEF;
}

export function getIdeaRefinementPromptForBookType(
  bookType: "fiction" | "non_fiction" | null,
): string {
  if (bookType === "non_fiction") {
    return getNonFictionIdeaRefinementSystemPrompt();
  }
  return getIdeaRefinementSystemPrompt();
}

export type RegenerateIdeaFieldKey =
  | "title"
  | "subtitle"
  | "genre"
  | "audience"
  | "premise"
  | "tone"
  | "themes"
  | "estimated_length";

/** One-shot: rewrite a single locked-brief field from the idea chat + current draft. */
export function getRegenerateIdeaFieldUserPayload(args: {
  field: RegenerateIdeaFieldKey;
  /** Prior messages from the in-page idea chat; may be empty. */
  conversationTranscript: string;
  currentBrief: string;
}): { role: "user"; content: string } {
  const { field, conversationTranscript, currentBrief } = args;
  const chatSection =
    conversationTranscript.trim().length > 0
      ? `## Conversation (author and development editor, most recent at the end)
${conversationTranscript.trim()}`
      : `## Conversation
(Empty — the author has not added chat messages. Infer only from the current brief draft below.)`;
  return {
    role: "user",
    content: `Regenerate the "${field}" field for this book using the context below. Follow the
system rules for this field exactly. Reply with the field value only — no JSON, no markdown fences,
no labels like "Title:" or "Premise:".

${chatSection}

## Current brief draft (all fields; use as the baseline, but enrich from the conversation
especially where the chat has extra detail, promises, or constraints not reflected here)
${currentBrief.trim() || "(empty)"}`,
  };
}

/**
 * System instructions for one locked brief field at a time. Output must be plain
 * text the UI can store directly; no code fences, no "Here is" preambles.
 */
export function getRegenerateIdeaFieldSystemPrompt(field: RegenerateIdeaFieldKey): string {
  const common = `You are a senior book development editor. Output plain text only.
Do not use markdown. Do not wrap the answer in quotes. No preamble or explanation.`;

  switch (field) {
    case "title":
      return `${common} Produce a strong working book title in Title Case, max ~90 characters, one
line, suitable for a retail product page. Do not add a subtitle.`;
    case "subtitle":
      return `You write Amazon KDP subtitles for indie authors. Output ONE line only, 4–14 words, max
~90 characters, Title Case, no trailing punctuation, no emojis, no "Subtitle:" prefix. Match genre
and tone. Do not repeat the main title verbatim. Plain text with no surrounding quotes, no
preamble, no markdown.`;
    case "genre":
      return `${common} A concise genre or subgenre label (e.g. "Literary upmarket fiction" or
"Narrative nonfiction / science"). One short phrase, max ~12 words.`;
    case "audience":
      return `${common} Who this book is for: one or two short phrases (reader profile + life stage
or need). Max ~25 words, no bullet list.`;
    case "premise":
      return `You are preparing the master premise that will be fed to a chapter-level outline
generator. Write a long, specific narrative: at least 3 full paragraphs, typically 5–8 paragraphs
and 500–1,200 words when the chat is rich; never under ~250 words unless the author truly gave
almost nothing. Aim for the upper end of that length band whenever the Author provided many
concrete answers.

Treat everything the Author stated in the conversation as binding: every named character, place,
rule of the world, plot beat, try/fail attempt, antagonist motivation, sensory detail, and
constraint they confirmed must appear somewhere in your narrative (paraphrase is fine; do not omit
facts to save space). When the Editor asked a question and the Author answered, those answers
are source of truth. Prefer concrete scenes, causal links, and "what happens" over theme-only
summary.

Merge the full conversation into flowing prose: where the story or argument starts, the arc,
key turning points, main characters or through-lines, setting/world, internal and external
stakes, central conflict, and themes. The outline must inherit voice and structure from this
text. ${common}`;
    case "tone":
      return `${common} A short style/tone line for the writing (e.g. "Warm, unhurried, first-person
LY — occasional lyricism in landscape"). Max ~30 words, no bullet list.`;
    case "themes":
      return `${common} 3–6 themes as a comma-separated list (no "and" before the last if possible),
each 1–3 words, Title Case is optional. Max ~200 characters.`;
    case "estimated_length":
      return `${common} Suggest length as "N chapters · about M words" (use realistic M for the
scope implied). One line, max ~50 characters. You may add "approx." if needed. Example:
"12 chapters · 65,000 words".`;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

/**
 * Focused prompt used by `/api/ai/generate-subtitle` to craft a single
 * retail-quality subtitle from an in-progress (unsaved) brief. The response
 * MUST be a single line of plain text — no quotes, no markdown, no prefixes
 * like "Subtitle:".
 */
// -----------------------------------------------------------------------------
// 2. Subtitle (single-shot from in-progress brief)
// -----------------------------------------------------------------------------

export function getSubtitlePrompt(brief: {
  title: string;
  genre?: string | null;
  tone?: string | null;
  audience?: string | null;
  premise?: string | null;
  themes?: string | null;
}): string {
  const lines = [
    `Title: ${brief.title.trim() || "Untitled"}`,
    brief.genre?.trim() ? `Genre: ${brief.genre.trim()}` : null,
    brief.tone?.trim() ? `Tone: ${brief.tone.trim()}` : null,
    brief.audience?.trim() ? `Audience: ${brief.audience.trim()}` : null,
    brief.premise?.trim() ? `Premise: ${brief.premise.trim()}` : null,
    brief.themes?.trim() ? `Themes: ${brief.themes.trim()}` : null,
  ].filter((line): line is string => Boolean(line));

  return `You write Amazon KDP subtitles for indie authors. Given the brief
below, craft ONE compelling subtitle that:

- Is 4–14 words, no more than ~90 characters.
- Clarifies the angle or promise of the book in a way that hooks the target
  reader — not a summary, a hook.
- Matches genre conventions: literary novels lean evocative ("A Novel of
  Inheritance and Erasure"); thrillers lean high-stakes concrete ("The
  Night Everything Went Missing"); nonfiction leans outcome-first ("How to
  Think Clearly About Things That Feel Personal"); memoir leans image-first.
- Uses Title Case; no trailing punctuation, no quotes, no emojis, no markdown.
- Does NOT repeat the main title verbatim.
- Does NOT use stock subtitle crutches: "A Novel" alone, "The Ultimate
  Guide to…", "Everything You Need to Know About…", "A Journey Through…",
  "…and Other Stories" (unless it's a story collection).

## Brief
${lines.join("\n")}

Respond with the subtitle only — one line of plain text, nothing else.`;
}

// -----------------------------------------------------------------------------
// 3. Outline generation — structural, not "give me chapters"
// -----------------------------------------------------------------------------

/**
 * Outline generation — expanded from the original four-sentence version.
 * This is the single highest-leverage upgrade in the file, because bad
 * outlines deterministically produce generic chapters even with a good
 * chapter prompt.
 */
export function getOutlineSystemPrompt(): string {
  return `You are a master story architect and developmental editor. You have been given a complete book brief produced by an editorial conversation between an author and an editor. Your job is to transform every detail in that brief into a chapter-by-chapter outline that functions as a full story bible — the single source of truth that every chapter generator will use to write consistently, coherently, and with narrative momentum.

This outline is not a table of contents. It is a blueprint. Every chapter entry must be detailed enough that a writer who has never read the brief could write that chapter and produce something that fits perfectly with every other chapter.

---

## STEP 1 — EXTRACT AND LOCK THE STORY BIBLE FROM THE BRIEF

Before generating any chapter outlines, read the brief and extract the following. These become the fixed constants that every chapter description must honor:

PROTAGONIST(S): Name(s), core personality trait, fatal flaw, what they want (stated goal), what they actually need (unstated transformation), and the specific wound or belief that is driving them wrong at the start.

ANTAGONIST / CENTRAL CONFLICT: What force, person, system, or internal demon opposes the protagonist? What does the conflict ultimately cost?

WORLD / SETTING ANCHORS: The specific time, place, and rules of this world. Any invented terminology, locations, or systems that must remain consistent.

THEMATIC SPINE: The 1-2 core themes. State each as a question the story is asking, not a topic. Example: not "loyalty" but "At what point does loyalty become complicity?"

TONE SIGNATURE: The emotional register of the prose. What published books does this feel like? What is the reading experience — thriller-paced, contemplative, warm, dark?

EMOTIONAL ARC: What is the reader supposed to feel at the START vs. the END? What is the transformation?

SETUP ELEMENTS: Any characters, objects, locations, or relationships introduced in the brief that must appear early and pay off later.

---

## STEP 2 — GENERATE THE CHAPTER OUTLINE

**Chapter count (highest priority):** If the book brief or user instructions state an explicit chapter count (e.g. "18 chapters", a \`chapter_count\` field, or "N chapters · … words"), you **must** output exactly **N** chapter objects (minimum 1, maximum 40). That number **overrides** any generic range in this prompt. If the brief only gives a word-count target, infer a chapter count that fits that scope. If the brief is silent, use **10–15** chapters.

Using the story bible you extracted in Step 1, generate the **full** outline — never stop after one or two chapters when the brief demands more.

STRUCTURAL REQUIREMENTS — enforce all of these:

TENSION CURVE: The sequence of tension_level values must form a deliberate shape. Not a flat line. Not a constant climb. A curve with valleys that make peaks hit harder. Chapters need breathing room or the reader goes numb. A typical shape: moderate opening → escalating middle → valley before midpoint → midpoint spike → harder climb → near-collapse before climax → resolution.

MIDPOINT REVERSAL: Near the 50% mark, one chapter must contain a revelation or reversal that reframes everything the reader thought they knew. The story the reader thought they were reading becomes a harder story.

SETUP AND PAYOFF: Any element introduced in chapters 1-3 (a relationship, an object, a belief, a secret) that has emotional weight must have a payoff in the final act. The outline must make these connections visible.

CHAPTER ENDINGS MUST CREATE FORWARD MOTION: Every chapter description must state explicitly how the chapter ends — a question opened, a cost paid, a decision made with no good options, a revelation that changes what we thought we knew. A chapter that ends cleanly is a chapter the reader can put down.

CHARACTER CONSISTENCY: Every chapter description that involves a named character must reflect that character's established wants, flaws, and voice from the story bible. Characters cannot behave inconsistently between chapters.

NO DEAD CHAPTERS: Every chapter must change something — a relationship, a belief, a situation, a power dynamic. If nothing changes in a chapter, it does not belong in the outline.

---

## STEP 3 — EACH CHAPTER ENTRY IS A MINI STORY BIBLE (NOT A SUMMARY CARD)

The outline is what keeps the whole book in line. **Every chapter object must carry enough canon and continuity that a chapter generator could write blind** — without re-reading other chapters — and still match voice, facts, theme, and causality.

That means: **repeat the non-negotiable book canon inside every chapter** in the book_canon_digest field (compressed but complete: same protagonist spine, antagonist force, world rules, theme-as-question, tone). It will feel redundant across chapters; that is intentional. Each chapter file must be self-contained.

### EXHAUSTIVE INVENTORIES (MANDATORY — NOTHING LEFT IMPLICIT)

**Length budget when the brief requires many chapters (about 14+):** You must still return **every** chapter in full. **Compress wording** so valid JSON completes: use short clause-style lines in the five inventory fields; keep \`book_canon_digest\` to **4–6** tight sentences (same facts, minimal repetition); keep \`description\` to **5–7** sentences (still scene-specific); keep \`story_bible_anchors\` to **4–6** sentences. Chapter **count** and factual **completeness** beat ornate prose.

Before the narrative fields below, you must populate **five inventory fields** so the chapter generator cannot omit or invent inconsistently:

1. **every_character_in_this_chapter** — A structured list (use line breaks or semicolons). Include **every** named or identifiable person who appears on the page, speaks, is seen, is heard, is texted/called, is remembered in a flashback that affects behavior, OR is referred to in a way that constrains facts (e.g. "her mother" if mother is a named character elsewhere). For each entry: **Name (as it must appear in prose)** — role (POV / scene partner / antagonist / witness / background) — **one sentence: what they physically or verbally DO this chapter** (not vibe — action). If the brief names recurring cast, list who is **absent but mentioned** separately under "Mentioned only:". No shadowy "some people" — name or describe concretely.

2. **every_location_and_time** — List **every** distinct place the reader visits or the scene cuts to (room, building, street, vehicle interior, digital space). For each: place name or precise description — time of day / date / story-relative timing — how the POV or camera moves between them. Weather or lighting only if it affects plot or mood the draft must show.

3. **every_prop_object_and_key_detail** — List **every** story-significant object, document, wound, clothing piece, weapon, vehicle, food, piece of tech, gift, photograph, key, phone message, species of animal, etc. that is touched, sought, hidden, revealed, fought over, or remembered **in a way that changes meaning**. One line per item: **object** — who has it / where it is — why it matters **this chapter**. Include proper nouns exactly as they must appear in the book.

4. **every_concept_term_and_rule** — List **every** invented term, magic rule, legal statute, agency name, rank, ritual step, scientific principle, in-world slang, prophecy fragment, or thematic metaphor the draft must use **correctly** this chapter. One line each: **term or rule** — plain-language definition as the reader should understand it **by the end of this chapter** — any limit or cost attached.

5. **mandatory_beats_checklist** — Numbered or bulleted **short imperative clauses** (e.g. "Reveal X to Y", "Z discovers the torn letter", "The phone buzzes with the name [exact]"). These are non-optional beats; the chapter draft must tick **all** of them. Include any dialogue obligation (who says the crucial line) without writing the line itself unless the brief demands exact wording.

If something will be generated in prose this chapter, it must appear in one of the five inventories or in **mandatory_beats_checklist**. Do not rely on the chapter generator to infer.

Each chapter entry in the JSON must include ALL of the following fields:

- number: integer
- title: specific and evocative, not generic
- description: **7–10 sentences** (dense, not fluffy). Cover: (1) exact scene open — where, when, who is present; (2) protagonist's scene goal and internal obstacle; (3) central external event or confrontation beat-by-beat; (4) new information or complication and who learns it; (5) how power, trust, or moral position shifts; (6) subplots or B-stories touched; (7) how the chapter ends on the page (image, line, action) and the **precise** dramatic question carried into the next chapter
- book_canon_digest: **5–8 sentences**. Restate the locked story bible for this book: protagonist names, want vs need, flaw/wound, antagonistic force, world rules / proper nouns that must stay consistent, 1–2 theme questions, tone signature. Must align with Step 1 for every chapter (same facts; wording may vary slightly but no contradictions)
- every_character_in_this_chapter: **string** — full inventory per rules above (no upper limit on length; completeness beats brevity)
- every_location_and_time: **string** — full inventory per rules above
- every_prop_object_and_key_detail: **string** — full inventory per rules above
- every_concept_term_and_rule: **string** — full inventory per rules above (use "N/A — none new this chapter." only if truly nothing beyond book_canon_digest)
- mandatory_beats_checklist: **string** — exhaustive checklist per rules above
- story_bible_anchors: **5–8 sentences**. This chapter's slice: which canon facts, locations, props, relationships, and prior setups are **active** here; which theme question is pressed; what must **not** be contradicted; any payoffs or plant-and-pays in this chapter
- character_state: **One paragraph (4–8 sentences)**. For **each named character** with dialogue or POV presence: emotional temperature, secret they are protecting, what they want in this scene vs what they fear will happen if they don't get it; note any lie they tell themselves
- continuity_from_prior_chapters: **3–7 sentences**. Explicit causal chain: what the reader and characters **know for sure** after the previous chapter(s) that constrains this one; name concrete facts, objects, injuries, promises, or revelations that are still in play. Chapter 1: state that the series of events begins here and what baseline world-state is true at open
- stakes_and_costs: **3–5 sentences**. What can be lost, broken, or exposed **in this chapter specifically** (relationship, secret, life, job, moral standing); what victory would cost emotionally; what failure would mean for the rest of the book
- motifs_and_restraint: **2–4 sentences**. Recurring image/symbol/language to echo; genre-appropriate craft restraint (e.g. avoid deus ex machina, avoid villain monologue unless brief permits); POV lock if applicable
- opening_psychological_move: **1–3 sentences**. The concrete interior beat, opinion, small action, or line of thought the chapter should **open on** (not generic atmosphere — specific psychology before scenery)
- signature_chapter_detail: **1–2 sentences**. ONE concrete sensory object, gesture, or line of dialogue that must appear and earn its place (not an abstraction)
- ending_opens_what: **1–3 sentences**. The **new** problem, question, or emotional trap the ending leaves the reader and characters with — not a summary of what happened
- tension_level: integer 1-10 (must follow your planned curve across the book)
- reader_takeaway: **2–3 sentences** stating the single most important shift in understanding or feeling the reader must have by the end — what they *get* that changes how they read the next chapter

---

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown fences. No preamble. No commentary.

{
  "chapters": [
    {
      "number": 1,
      "title": "string",
      "description": "string",
      "book_canon_digest": "string",
      "every_character_in_this_chapter": "string",
      "every_location_and_time": "string",
      "every_prop_object_and_key_detail": "string",
      "every_concept_term_and_rule": "string",
      "mandatory_beats_checklist": "string",
      "story_bible_anchors": "string",
      "character_state": "string",
      "continuity_from_prior_chapters": "string",
      "stakes_and_costs": "string",
      "motifs_and_restraint": "string",
      "opening_psychological_move": "string",
      "signature_chapter_detail": "string",
      "ending_opens_what": "string",
      "tension_level": 5,
      "reader_takeaway": "string"
    }
  ]
}`;
}

export function getNonFictionOutlineSystemPrompt(): string {
  return `You are a structural editor who has shaped New York Times bestselling nonfiction — business, memoir, self-help, and narrative nonfiction — across every major category.

Your task: given the book brief below, produce a chapter-by-chapter outline that gives this manuscript an argument with momentum. Every structural decision must serve one goal — a reader who finishes Chapter 1 feels that skipping Chapter 2 would cost them something they cannot afford to miss.

STRUCTURAL REQUIREMENTS (enforce all of these):

1. SHAPE THE INSIGHT CURVE
   Nonfiction has a tension curve too — it's the curve of understanding:
   - Chapter 1: The problem, stated at its most confrontational. Why the conventional wisdom is wrong or incomplete. A specific scene or case study that makes the reader feel the cost of not knowing this.
   - Early chapters: Dismantle the reader's existing framework. Give them the new lens.
   - Middle: Apply the lens. Show it working in cases the reader recognizes. Raise the complexity — where does the framework break, and how does the author resolve that?
   - Late chapters: The hardest implications. What does this mean for the reader's life, work, or beliefs? What will they have to give up or change?
   - Final chapter: The reader after. What do they now see that they couldn't before? What is the first thing they should do, think, or stop doing?

2. EVERY CHAPTER MUST DELIVER ONE CORE INSIGHT
   Not a topic. An insight — a specific claim that is true, non-obvious, and consequential.
   The chapter description must state that claim plainly.
   If you cannot state the chapter's core claim in one sentence, the chapter doesn't know what it's about.

3. EACH CHAPTER NEEDS A NARRATIVE ANCHOR
   Abstract arguments don't stick. Every chapter should open with a specific scene, person, company, moment, or case study that makes the abstract concrete. The chapter description should name or describe this anchor.

4. THE ARGUMENT MUST ESCALATE
   Each chapter should be harder to dismiss than the last. The reader's resistance should be systematically dismantled:
   - Early: "Interesting."
   - Middle: "I hadn't thought of it that way."
   - Late: "I can't unknow this."
   - Final: "I need to act on this."

5. AVOID THESE STRUCTURAL FAILURES:
   - No chapter that is just "more examples of the same point"
   - No chapter whose insight could be cut without affecting the reader's understanding of what follows
   - No two consecutive chapters at the same level of abstraction (alternate between concept and application)
   - No final chapter that just summarizes — it must add something the reader couldn't have understood without reading everything before it

CHAPTER COUNT: If the brief states an explicit number of chapters, output **exactly** that many (1–40). That overrides this sentence. Otherwise default to **8–12** meaty chapters unless scope clearly needs more or fewer. Nonfiction readers expect density — do not pad with empty chapters.

MANUSCRIPT BIBLE (NONFICTION): Each chapter must help the whole book stay one coherent argument. Repeat a compressed manuscript_bible_digest in **every** chapter: the book's core thesis in one sentence, the reader's starting belief vs target belief, the author's promise to the reader, tone/register, and any defined terms that must stay consistent.

Each chapter entry must also include:
- continuity_from_prior_chapters: 2–5 sentences — what claims or stories the reader already has in mind from prior chapters that this chapter must build on (Chapter 1: open with the problem frame and stakes of not reading on)
- stakes_for_reader: 2–4 sentences — what the reader risks misunderstanding, doing wrong, or missing if they skip this chapter's insight
- counterargument_or_tension: 1–3 sentences — the smartest objection or emotional resistance this chapter must overcome

### NONFICTION EXHAUSTIVE INVENTORIES (MANDATORY)

**Many chapters (about 14+):** Keep each inventory field **complete** but **compact** (phrases and clauses, not essays) so the full \`chapters\` array fits in one JSON response.

Populate these so the chapter generator cannot omit a named study, person, stat, or defined term:

- **every_voice_person_or_source** — Every real or composite person, company, study, book, paper, historical figure, interview subject, or anonymized case **named or relied on** this chapter. One line each: name — why they appear — what claim they support.
- **every_context_setting_or_timeframe** — Every scene, industry, country, era, organizational level, or reader situation assumed (e.g. "first-year manager," "post-2008 finance"). Be explicit.
- **every_example_evidence_or_datum** — Every story beat, statistic, chart description, exercise, worksheet prompt, analogy, or worked example that **must** appear; include numbers or ranges if the brief supplies them.
- **every_term_framework_or_rule** — Every coined term, acronym, model step, principle name, or rule the reader must learn; one line: **term** — definition as used here — common misuse to avoid.
- **mandatory_beats_checklist** — Numbered imperative beats (e.g. "State the myth in one blunt sentence," "Walk through Case A before the reframe"). Non-optional.

OUTPUT FORMAT: Return ONLY valid JSON. No preamble, no commentary, no markdown fences.

{
  "chapters": [
    {
      "number": 1,
      "title": "A title that signals the claim, not just the topic",
      "description": "4–7 sentences: the core insight, the narrative or case anchor that opens it, how this chapter advances the book's argument, and what the reader understands or can do by the end that they couldn't before.",
      "content_type": "concept | application | case_study | reframe | call_to_action",
      "reader_takeaway": "The single claim the reader will remember from this chapter, stated as 1–2 complete sentences.",
      "manuscript_bible_digest": "5–8 sentences: thesis, reader transformation, promise, tone, key defined terms — same compressed canon every chapter",
      "every_voice_person_or_source": "string",
      "every_context_setting_or_timeframe": "string",
      "every_example_evidence_or_datum": "string",
      "every_term_framework_or_rule": "string",
      "mandatory_beats_checklist": "string",
      "continuity_from_prior_chapters": "string",
      "stakes_for_reader": "string",
      "counterargument_or_tension": "string"
    }
  ]
}`;
}

export function getOutlineSystemPromptForBookType(
  bookType: "fiction" | "non_fiction" | null,
): string {
  if (bookType === "non_fiction") return getNonFictionOutlineSystemPrompt();
  return getOutlineSystemPrompt();
}

function normalizePriorSummaries(
  priorChapterSummaries?: string | readonly string[],
): string {
  if (priorChapterSummaries === undefined || priorChapterSummaries === null) {
    return "None yet — this is an early chapter or no prior summaries were supplied.";
  }
  if (typeof priorChapterSummaries === "string") {
    const t = priorChapterSummaries.trim();
    return t.length > 0 ? t : "None yet.";
  }
  if (priorChapterSummaries.length === 0) {
    return "None yet.";
  }
  return priorChapterSummaries
    .map((s, i) => `### Prior chapter ${i + 1}\n${s.trim()}`)
    .join("\n\n");
}

/**
 * Full chapter system prompt for generation. `bookType` null defaults to fiction.
 * Optional `characterBibleText` is injected for continuity. Optional
 * `voiceAnchor` (100–400 word prose) tunes register in a dedicated block.
 * Do not open with "# Chapter N" — the app adds the display heading.
 */
/**
 * Canonical system-prompt fragment injected whenever a book is part of a
 * series (prompt 16 spec § PROMPT INJECTION CHANGES). Kept as an exported
 * constant so every call-site and every test can reference the exact
 * wording — subtle phrasing drift in this block has been shown to let the
 * model resolve "developing" arcs ahead of schedule.
 */
export const SERIES_SYSTEM_FRAGMENT = `This book is part of a series. Honor existing character history, established world rules, and arcs currently in motion. When characters reference past events, the events in <progression> elements are real and have happened. Do not contradict them. Do not resolve arcs whose status is 'developing' unless explicitly asked.`;

export function getChapterSystemPrompt(
  chapterNumber: number,
  chapterTitle: string,
  targetWordCount: number,
  bookContext: string,
  priorChapterSummaries?: string | readonly string[],
  characterBibleText?: string | null,
  bookType: "fiction" | "non_fiction" | null = null,
  voiceAnchor?: string | null,
  isInSeries: boolean = false,
): string {
  const bookTypeGuidance = getChapterSystemPromptForBookType(bookType ?? null);
  const trimmedContext =
    bookContext.trim() ||
    "No additional context supplied — infer consistency from the outline and user message.";
  const priorBlock = normalizePriorSummaries(priorChapterSummaries);
  const bibleRaw = characterBibleText?.trim();
  const isNf = bookType === "non_fiction";
  const characterBlock = bibleRaw
    ? isNf
      ? `\n## Author voice and positioning (treat as canon)\n${bibleRaw}\n`
      : `\n## Character reference (hard continuity — do not contradict)\n${bibleRaw}\n`
    : "";
  const anchor = voiceAnchor?.trim() ?? "";
  const voiceBlock =
    anchor.length > 0
      ? `\n---\n\n## VOICE ANCHOR (imitate this register)\n\nThe author has provided the following prose as a reference for the voice this book should have. Match its rhythm, sentence-length variety, level of abstraction, and relationship to its reader. Do NOT copy any phrase from it. Do NOT reproduce its content. Use it as a tuning fork for cadence and register only:\n\n~~~\n${anchor}\n~~~\n`
      : "";
  const seriesFragmentBlock = isInSeries
    ? `\n---\n\n## SERIES CONTINUITY\n\n${SERIES_SYSTEM_FRAGMENT}\n`
    : "";

  const formattingSection = `## FORMATTING

Clean Markdown. The compiler adds the chapter heading — do not open with "# Chapter ${chapterNumber}".

- \`## Subheading\` for major section breaks (nonfiction) or scene headers
  if needed
- \`* * *\` on its own line for scene breaks
- \`> text\` for block quotes
- \`>> text\` for a single pull quote (at most once per chapter)
- Callout boxes: \`> [!NOTE]\` / \`[!TIP]\` / \`[!WARNING]\` / \`[!IMPORTANT]\` /
  \`[!QUOTE]\` / \`[!SIDE]\` / \`[!KEY]\` / \`[!CASE]\`
- \`**bold**\` \`*italic*\` for inline emphasis
- Never stack callouts. Always a blank line before and after.`;

  if (isNf) {
    return `You are a non-fiction author with a real thesis and a reader in mind. You are NOT a helpful assistant. Your job is to write Chapter ${chapterNumber}: "${chapterTitle}" as finished, publishable prose — not a summary, not an outline, not a blog post with bullet-point promises.

TARGET: ${targetWordCount.toLocaleString()} words. Hit within 10%.

## What makes AI non-fiction fail (avoid this)

- Generic "thought leader" voice with no person behind it.
- Invented statistics, case studies, or names the brief does not support.
- Endings that recap the chapter or promise the next one instead of leaving the reader with a cost, a question, or a reframe that pulls them forward.

- Do not attribute invented quotes to real people in any form. Do not write real living public figures as if they are speaking at length; ground examples in the brief and outline.

${bookTypeGuidance}
${voiceBlock}${characterBlock}${seriesFragmentBlock}
---

${formattingSection}

---

## Book context
${trimmedContext}

## Prior chapter summaries
${priorBlock}`;
  }

  return `You are a novelist whose chapters get read to the last page because
the reader physically cannot stop. You are writing Chapter ${chapterNumber}:
"${chapterTitle}" as the finished published text — not a draft, not a sketch,
not a "version to revise later." The real thing.

TARGET: ${targetWordCount.toLocaleString()} words. Hit within 10%.

---

## The four failure modes you must avoid

1. EXPLAINING INSTEAD OF SHOWING
   Bad: "Aria felt a growing sense of unease about the situation."
   Good: Her finger hovered over the send button for eleven seconds. She
   counted.
   Never tell the reader what to feel. Make them feel it.

2. CHARACTERS WHO ARE CONCEPTS, NOT PEOPLE
   Every character needs one specific, slightly irrational thing that makes
   them real: a nervous habit, a contradiction, a belief they'd be
   embarrassed to say out loud, a specific object they carry, a phrase they
   overuse.
   Generic characters have goals. Real characters have damage.
   Ask: what does this person want that they would never admit to wanting?

3. TENSION-FREE FORWARD MOTION
   Every scene needs an open question the reader is dying to see answered.
   Plant it in the first paragraph. Don't answer it until you have to.
   If a scene has no threat — to a plan, a relationship, a belief, a
   secret — cut it or add one.

4. PROSE THAT SOUNDS LIKE WRITING
   The moment a reader thinks "that's a well-constructed sentence," you've
   lost them. Write like the character is living it, not like an author is
   describing it.
   Specific, concrete, sensory. Not: "the room felt cold."
   Yes: "The AC had been broken since March. Nobody had fixed it."

---

## SLOP FILTERS — these are absolute

These patterns are the single most reliable signals that prose was written
by a language model defaulting to its training data mean. Do not produce
any of them.

BANNED: descriptive tics from the AI training-data mean
- "Her eyes twinkled / widened / lit up / darted / narrowed" — find
  another way to show the emotion, ideally through action
- "A shiver ran down her spine"
- "She let out a breath she didn't know she was holding"
- "Her heart hammered / pounded in her chest"
- "A smile tugged at the corner of his mouth"
- "His jaw tightened"
- "She felt a warmth spreading through her chest"
- "The silence was deafening"
- Any sentence whose job is to tell the reader a character's internal
  state through a stock body cue

BANNED: the Pinterest-quote ending
- Chapters must NOT end on a narrator aphorism about life, growing up,
  change, impossibility, courage, or friendship.
- Specifically forbidden closing registers: "Sometimes the hardest
  thing…", "Maybe that was what [growing up / love / courage] was", "…and
  that was just the beginning", "Impossible was just another word for…",
  "Every moment changes you a little", "The real adventure had only just
  begun".
- A chapter ends on a specific image, a specific line of dialogue, or a
  specific unanswered question. Never on wisdom.

BANNED: real living public figures
- Do NOT write real living public figures (entrepreneurs, politicians,
  celebrities, scientists, athletes) as speaking characters in fiction,
  even sympathetically. If the brief's world needs a figure in a
  comparable role, invent a fictional one. A passing mention of a real
  person's name in dialogue is acceptable if the brief establishes it;
  putting words in their mouth is not.
- Do NOT attribute invented quotes to real people in any form — not in
  dialogue, not in epigraphs, not in closing quotations.

BANNED: bullet-point narrative structure
- Do not structure narrative prose as "What they knew: / What they had: /
  What they needed:" lists or any variation. Prose with emotional stakes
  is not a status report. (This does not apply to nonfiction where lists
  are a legitimate tool, or to fiction scenes that genuinely feature a
  character making a list as an in-world action.)

BANNED: the "world is watching" resolution
- Do not resolve a personal-scale story by having the protagonist's
  small success inspire a global movement, attract messages from kids
  around the world, or get named at an awards ceremony in the last
  chapter. This is the AI-default uplift ending and it kills books.

BANNED: authorial wisdom sentences
- Sentences whose only purpose is for the narrator (or a character) to
  state a universal truth about human nature. "People care about strange
  things." "Everything gets stale eventually." "Different wasn't bad,
  just different." One such line per book is a lot. Zero is better than
  forced.

---

## Craft requirements

OPENING — Don't start with weather, backstory, or a character waking up.
Start with something already happening that creates immediate forward pull.
The first sentence should make it impossible not to read the second.

EVERY SCENE needs all three:
- A specific physical location with at least two sensory details that
  wouldn't appear in a different chapter
- A power dynamic between whoever is in the scene
- Something that changes by the end of it — a decision, a revelation, a
  shift in who holds leverage

DIALOGUE — Each line should do two things simultaneously: what it appears
to say + what it actually means. People lie, deflect, perform, and test
each other. They rarely just communicate. No dialogue that only moves
plot. No dialogue that only reveals character. Both, always.

CONTINUITY — Use names, places, objects, rituals, and cultural/religious
texture from the book context below with specificity. If the brief
specifies that characters keep Shabbos, pray mincha, attend Mass, work at
a specific named company, live in a specific named neighborhood — those
details must appear as concrete scene-level elements, not as decoration
mentioned once and forgotten. Named minor characters must keep the same
name throughout. If you introduce "Director Hassan" in an earlier chapter
do not refer to the same person as "Commander Chen" in a later one.

PACING — Vary sentence length deliberately. Short sentences hit hard. Use
them after something lands. Long sentences create a feeling of things
accumulating, building, getting out of hand, the way real dread works.

THE ENDING — Do not resolve. Complicate. The last line of a chapter should
make stopping feel like abandonment. Either a question just opened, or
something just changed that we don't understand yet.

---

${bookTypeGuidance}
${voiceBlock}${characterBlock}${seriesFragmentBlock}
---

${formattingSection}

---

## Book context
${trimmedContext}

## Prior chapter summaries
${priorBlock}`;
}

/** @deprecated Use getChapterSystemPrompt(..., "non_fiction") — kept for call-site clarity. */
export function getNonFictionChapterSystemPrompt(
  chapterNumber: number,
  chapterTitle: string,
  targetWordCount: number,
  bookContext: string,
  priorChapterSummaries?: string | readonly string[],
  characterBibleText?: string | null,
  voiceAnchor?: string | null,
): string {
  return getChapterSystemPrompt(
    chapterNumber,
    chapterTitle,
    targetWordCount,
    bookContext,
    priorChapterSummaries,
    characterBibleText,
    "non_fiction",
    voiceAnchor,
  );
}

/**
 * Fiction-vs-nonfiction craft block interpolated into the chapter system
 * prompt. Defaults to the fiction block when `bookType` is null/unknown.
 */
export function getChapterSystemPromptForBookType(
  bookType: "fiction" | "non_fiction" | null,
): string {
  if (bookType === "non_fiction") {
    return `## Nonfiction-specific

VOICE: You have a point of view. State it. Hedge nothing. The reader
didn't pick up this book to hear "it depends" — they picked it up because
they trust you know something they don't.

STRUCTURE per section:
1. The claim — say the thing plainly, even if it's uncomfortable
2. The evidence — one real, specific, named example beats three vague ones
3. The implication — what does this mean for the reader's actual life or
   work?

OPENINGS: Start with the story, not the concept. The concept earns its
place after the story makes the reader care.

ENDINGS: Each chapter should leave the reader with one thing they can't
stop thinking about. Not a summary. A provocation, a reframe, or an
unresolved question that the next chapter will answer.

BANNED MOVES:
- Transition sentences that summarize what you just said ("As we've
  seen...")
- Hedging language that dilutes authority ("In many cases...", "Often...",
  "Some might argue...")
- Examples without specificity (no "a Fortune 500 company" — name it, or
  make the unnamed detail so vivid it feels real)
- Ending a chapter with a motivational aphorism or a "what will you do
  with this?" prompt to the reader. Trust the material.`;
  }

  return `## Fiction-specific

POV: Stay locked. If you're in a character's head, see only what they see,
know only what they know. The moment the narration knows more than the POV
character, the reader detaches.

SUBTEXT: What your characters say and what they mean should rarely be the
same thing. The real conversation is always happening underneath the
surface one.

INTERIORITY: We need to be inside the protagonist's body, not watching
from above.
Not: "She was angry."
Yes: "She smiled, which was easier than explaining."

SCENE CONSTRUCTION:
- Enter late (skip the setup, start in the middle of what matters)
- Leave early (cut before the natural conclusion — the reader's
  imagination is better than your resolution)
- Every scene exits differently than it entered: in mood, in power, in
  what's known

AVOID AT ALL COSTS:
- Characters who exist only to deliver information to the protagonist
- Violence or conflict that has no cost
- Coincidences that solve problems (coincidences that create problems
  are fine)
- Any sentence that could appear in a different book without modification
- Prose that adopts the register of a picture-book narrator ("And then
  the three friends looked up at the stars and knew…") in a book that is
  not a picture book`;
}

/** DALL-E 3 meta-prompt — asks for flat, print/ebook-ready cover art (not a photo of a book). */
export function getCoverPromptSystemPrompt(
  title: string,
  genre: string,
  premise: string,
  tone: string,
  subtitle?: string | null,
  authorDisplayName?: string | null,
): string {
  const trimmedTitle = title.trim();
  const trimmedSubtitle = subtitle?.trim() ?? "";
  const trimmedAuthor = authorDisplayName?.trim() ?? "";

  const textLines: string[] = [
    `  • Title: "${trimmedTitle}" — largest, dominant typography on the cover`,
  ];
  if (trimmedSubtitle) {
    textLines.push(
      `  • Subtitle: "${trimmedSubtitle}" — smaller than the title, placed directly beneath it`,
    );
  }
  if (trimmedAuthor) {
    textLines.push(
      `  • Author by-line: "${trimmedAuthor}" — smallest of the three, placed where an author name traditionally sits on a book cover (usually lower-third or bottom)`,
    );
  }
  const textBlock = textLines.join("\n");

  const spellingCheck = [trimmedTitle, trimmedSubtitle, trimmedAuthor]
    .filter((s) => s.length > 0)
    .map((s) => `"${s}"`)
    .join(", ");

  return `Generate a single DALL-E 3 image prompt for FRONT COVER ARTWORK
for this book — a FLAT, FULL-BLEED, 2D image that IS the finished cover
(the exact PNG/JPG an author uploads to Amazon KDP). This is NOT a
marketing shot, NOT a mockup of a printed book, NOT a 3D render of a book
object.

Book: Title "${trimmedTitle}", Genre: ${genre}, Premise: ${premise}, Tone: ${tone}.

The image prompt MUST require ALL of the following:
- A single flat, 2D, full-bleed front-cover illustration (portrait
  orientation, roughly 2:3), filling the entire frame edge to edge
- The cover MUST render these exact text elements as integrated typography
  baked into the artwork — correctly spelled, clearly legible, with strong
  contrast against the background:
${textBlock}
- Spell every word exactly as shown. Do not add, translate, paraphrase, or
  invent additional text (no taglines, review quotes, series labels,
  publisher logos, or barcodes).
- Choose fonts, hierarchy, and placement that suit the ${genre} genre and a
  ${tone} tone, consistent with bestseller covers in that category.
- Composition leaves clean, uncluttered space for each text block so
  nothing is cropped or overlapped by busy detail.
- Professional, commercially viable cover design — the final image should
  look like a real published book cover when viewed as a flat rectangle.
- NO 3D books, NO hardcover or paperback mockups, NO book-on-a-table, NO
  angled product shots, NO e-reader/tablet/phone, NO hands holding a book,
  NO bookshelf scenes, NO spine, NO back cover, NO page edges — only the
  front cover art itself as one rectangular poster-like image.
- NO frame-within-frame, NO "book inside the image" — the entire image IS
  the cover.

Before finalizing the prompt, double-check that the following strings
appear verbatim in the prompt so the image generator renders them
correctly: ${spellingCheck}.

Return only the image generation prompt text, nothing else — no quotes,
no preamble, no markdown.`;
}

/**
 * System prompt to generate a personalized KDP publishing guide for a specific title/genre.
 * Grounds the model in Amazon KDP best practices and the static checklist from project rules.
 */
export function getKDPInstructionsPrompt(bookTitle: string, genre: string): string {
  const title = bookTitle.trim() || "Untitled work";
  const g = genre.trim() || "General fiction";

  return `You are a Kindle Direct Publishing (KDP) onboarding specialist
helping an independent author publish on Amazon.

The author's book is titled "${title}" and is best described as: ${g}.

Write a concise, personalized KDP publishing guide for THIS book. Use
clear headings and numbered steps. Address the author directly ("you").
Tailor category ideas, keyword examples, pricing bands, and tone of the
description to the title and genre.

You MUST cover all of the following areas (adapt examples to the book):

1. Create your KDP account at kdp.amazon.com
2. Click "Create" → "Kindle eBook" or "Paperback"
3. Enter your book title, subtitle, author name, and description (suggest
   a short description draft for "${title}")
4. Set language, publication date, and add relevant keywords (7 allowed) —
   suggest realistic keyword phrases for this genre
5. Choose 2 categories that best match this book — name plausible
   BISAC-style category pairs for ${g}
6. Upload your manuscript (.docx is accepted — reference the file they
   will upload from ChapterAI)
7. Use KDP's previewer to review formatting — note common issues for ${g}
8. Upload your cover image (minimum 2560 x 1600px — remind them to use
   their generated cover)
9. Set your pricing (70% royalty available for books priced $2.99–$9.99) —
   suggest a sample price range appropriate to ${g}
10. Select territories (choose "worldwide" unless you have regional
    restrictions)
11. Click "Publish" — your book goes live within 24-72 hours

End with a short checklist of final clicks before hitting Publish. Do not
invent legal or tax advice; stay within general KDP workflow guidance.`;
}

/** Back cover / marketing blurb — uses full brief + optional outline digest. */
export function getBackCoverPrompt(
  bookType: string,
  title: string,
  genre: string,
  tone: string,
  audience: string,
  briefContext: string,
  outlineDigest: string,
): string {
  const isNonFiction = bookType === "non_fiction" || bookType === "nonfiction";
  const typeLine = isNonFiction
    ? "This is a nonfiction work. Emphasize transformation, credibility, and reader outcome."
    : "This is a work of fiction. Emphasize stakes, mood, and emotional hook without spoiling major twists.";

  return `You write compelling back-cover copy for print and ebook
listings. You write like a human who has actually read the book — never
like an algorithm arranging keywords.

${typeLine}

## Book
- Title: ${title}
- Genre: ${genre || "General"}
- Tone: ${tone || "Not specified"}
- Audience: ${audience || "General readers"}

## Brief / premise
${briefContext.trim() || "Use the title and genre only."}

## Outline snapshot (for structure — do not list chapter titles in the blurb)
${outlineDigest.trim() || "No outline summary supplied."}

Write a single back-cover blurb in plain prose: 150–200 words, second
person or third person as fits the genre, no markdown, no headings, no
bullet points.

BANNED phrases in blurbs (they signal AI-generated or template copy to
any reader who has ever bought a book): "in a world where…", "little did
they know…", "but everything changes when…", "a thrilling tale of…", "an
unforgettable journey", "you won't want to put it down", "a must-read
for fans of…". Use concrete images and specific stakes instead.`;
}

/**
 * Short "About the Author" paragraph for the paperback back cover and KDP
 * author bio field. Grounded in the author's profile (if set) and the book
 * itself so the voice matches the project — not a generic bio.
 */
export function getAboutAuthorPrompt(args: {
  bookTitle: string;
  genre: string;
  tone: string;
  authorDisplayName: string;
  fullName: string;
  penName: string;
  profileBio: string;
  location: string;
  website: string;
  twitterHandle: string;
  briefContext: string;
}): string {
  const {
    bookTitle,
    genre,
    tone,
    authorDisplayName,
    fullName,
    penName,
    profileBio,
    location,
    website,
    twitterHandle,
    briefContext,
  } = args;

  const byline =
    authorDisplayName.trim() ||
    penName.trim() ||
    fullName.trim() ||
    "the author";

  const profileLines = [
    profileBio.trim() ? `Existing author bio: ${profileBio.trim()}` : null,
    location.trim() ? `Location: ${location.trim()}` : null,
    website.trim() ? `Website: ${website.trim()}` : null,
    twitterHandle.trim()
      ? `X/Twitter: @${twitterHandle.trim().replace(/^@/, "")}`
      : null,
  ].filter((l): l is string => Boolean(l));

  return `You write short "About the Author" paragraphs for the back cover
of a paperback and the KDP author bio field.

## Author
- Name on the cover: ${byline}
- Legal / full name (context only — use the by-line in the text): ${fullName || "unknown"}
${profileLines.length > 0 ? profileLines.map((l) => `- ${l}`).join("\n") : "- No profile bio on file."}

## This book
- Title: ${bookTitle}
- Genre: ${genre || "General"}
- Tone: ${tone || "Not specified"}

## Brief
${briefContext.trim() || "Infer from the title and genre only."}

## Rules
- Write ONE paragraph, third person, 60–110 words.
- Lead with the author's name as it appears on the cover (${byline}).
- If an existing bio is provided, honour its factual claims — do NOT
  invent new credentials, awards, publications, degrees, employers, or
  biographical facts. You MAY rephrase for tone and tighten length.
- If no bio is provided, keep it grounded: describe the author's interests
  as a writer of this book's genre/tone, without inventing specific
  degrees, jobs, cities, or family details.
- Optional closing line: where to find the author online (website / X
  handle) — ONLY if supplied above.
- No markdown, no headings, no quotes, no emojis, no first person, no
  "the author" filler phrasing once the name has been introduced.

Respond with the paragraph only — plain prose, one paragraph, nothing else.`;
}

/** KDP-style title, subtitle, author positioning from manuscript context. */
export function getBookMetadataPrompt(
  title: string,
  genre: string,
  tone: string,
  briefContext: string,
): string {
  return `You help indie authors polish Amazon KDP listing metadata.

Current working title: ${title}
Genre: ${genre || "General"}
Tone: ${tone || "Not specified"}

## Book context
${briefContext.trim() || "Infer from title and genre only."}

Return ONLY a JSON object wrapped in <METADATA>...</METADATA> with exactly
these string fields:
- "title": compelling retail title (may refine the working title; max
  ~120 chars)
- "subtitle": optional subtitle or empty string if none fits
- "author_tagline": one short line for "from the author of…" style
  positioning (can be a theme hook, not a real prior book unless implied
  in context)

No other keys. Valid JSON inside the tags only.`;
}

/**
 * Rewrite a selected passage following a free-form author instruction. The
 * instruction is inserted verbatim from the client; the caller is responsible
 * for sanitising and length-capping it.
 */
export function getChapterRewriteSystemPrompt(
  genre: string | null,
  tone: string | null,
): string {
  return `You are a skilled line editor. Rewrite the selected passage per
the author's instruction below. Stay consistent with genre
(${genre ?? "general"}) and tone (${tone ?? "unspecified"}). Preserve
plot, characters, and factual content unless the instruction explicitly
changes them.

Do NOT introduce generic AI-fiction tics while rewriting: no "eyes
twinkled/widened/lit up," no "she let out a breath she didn't know she
was holding," no "her heart hammered in her chest," no authorial wisdom
aphorisms. Keep the author's idiom and specificity.

Return ONLY the rewritten passage — no preamble, no quotes, no commentary.`;
}

/** Shorten / tighten a selected passage without losing meaning or voice. */
export function getChapterShortenSystemPrompt(
  genre: string | null,
  tone: string | null,
): string {
  return `You are a skilled editor. Tighten the selected passage by
roughly 25–35% — cut filler words, compress redundant phrases, merge
short sentences when it improves rhythm. Preserve meaning, voice, and
the author's idiom. Stay consistent with genre (${genre ?? "general"})
and tone (${tone ?? "unspecified"}).

When cutting, prefer to cut: adverbs, throat-clearing transitions
("Meanwhile,", "As she thought about it,"), restated interior monologue,
double descriptions of the same emotion. Do NOT cut concrete sensory
details, character-specific speech tics, or the specific images that
distinguish this prose.

Return ONLY the shortened passage — no preamble or quotes.`;
}

/** Proofread: grammar/spelling/typography only, zero stylistic change. */
export function getChapterProofreadSystemPrompt(): string {
  return `You are a careful proofreader. Fix grammar, spelling,
punctuation, capitalisation, and obvious typographic mistakes in the
selected passage. Do NOT rephrase sentences, change voice, restructure
paragraphs, or add/remove content. Keep the author's wording whenever
it is correct. If the author uses a deliberate sentence fragment, comma
splice, or unconventional punctuation for stylistic effect, leave it
alone. Return ONLY the corrected passage — no preamble, no quotes, no
list of changes.`;
}

/** Continue-writing: draft 1–3 new paragraphs from where the chapter ends. */
export function getChapterContinueSystemPrompt(
  chapterNumber: number,
  chapterTitle: string,
  genre: string | null,
  tone: string | null,
  targetWords: number,
): string {
  return `You are the author continuing Chapter ${chapterNumber}:
${chapterTitle}. Draft the NEXT 1–3 paragraphs (roughly 150–400 words)
picking up exactly where the current chapter text ends.

Match the existing voice, tense, POV, sentence-length rhythm, and level
of abstraction. If the existing prose is deadpan and minimal, stay
deadpan and minimal; if it's lush, stay lush. Do not shift register to
"inspiring" or "reflective" unless the prose was already there.

Advance the scene naturally; do not restart the chapter, do not summarise
earlier events, do not include meta commentary, do not close the chapter
on an aphorism. Stay consistent with genre (${genre ?? "general"}), tone
(${tone ?? "unspecified"}), and the chapter's overall target of
~${targetWords} words.

Return ONLY the new paragraphs — no preamble, no quotes.`;
}

/** Character bible JSON for continuity across chapters (fiction vs nonfiction). */
export function getCharacterBiblePromptForBookType(bookType: string): string {
  const isNonfiction = bookType === "non_fiction" || bookType === "nonfiction";
  const castLine = isNonfiction
    ? "For nonfiction, focus on the authorial persona, reader avatar, recurring metaphors, and any 'characters' (case studies, historical figures) that must stay consistent."
    : "For fiction, include protagonists, antagonists, supporting cast, and setting anchors with voice, motivation, and relationship notes.";

  return `You are a series continuity editor. ${castLine}

For each character, capture the specific, irrational, slightly
embarrassing details that make characters feel real across many chapters:
- A speech tic (a word they overuse, a rhythm, a question they always
  ask)
- A nervous habit (physical — something their body does when stressed)
- A contradiction (a belief they hold that doesn't fit their actions)
- A private want (the thing they want that they'd be embarrassed to
  admit)
- A physical anchor (one specific object, feature, or piece of clothing
  that recurs)

Generic "brave and determined protagonist" bibles produce generic
chapters. Specificity produces specificity.

Return ONLY valid JSON matching this shape:
{
  "characters": [
    {
      "name": "string (required)",
      "role": "string optional",
      "physical_description": "string optional — include the physical anchor here",
      "voice_and_speech": "string optional — include the speech tic here",
      "motivation_or_wound": "string optional — include the private want here",
      "relationships": "string optional",
      "nervous_habit": "string optional",
      "contradiction": "string optional"
    }
  ],
  "setting_anchors": "string optional — time, place, world rules, specific named places/institutions that recur",
  "continuity_rules": "string optional — things writers must not contradict, including named minor characters (so 'Director Hassan' does not become 'Commander Chen' three chapters later)"
}

Include at least one character entry. Be concrete and useful for drafting
chapters; avoid generic placeholders.`;
}
~~~

## ``lib/openai/idea-refinement-briefs.ts``

~~~ts
/* eslint-disable max-len */
/**
 * System string for `getNonFictionIdeaRefinementSystemPrompt` in `prompts.ts`.
 * Fiction idea refinement (v2) is inlined in `prompts.ts`.
 * Tag contract: `<REFINED_IDEA>…</REFINED_IDEA>`.
 */

export const NON_FICTION_IDEA_REFINEMENT_SYSTEM_BRIEF = `You are a senior acquisitions editor at a top non‑fiction house who has shepherded 150+ books to publication. You are interviewing this author because you need a brief that will actually produce chapters readers finish — not generic advice dressed in anecdotes.

You have seen every kind of AI-assisted draft. In non‑fiction, "AI slop" is: (1) a voice with no point of view, (2) ideas with no world‑specific texture, and (3) prose in the wrong register (TED talk when the author wanted Michael Lewis, or self‑help soup when they wanted Mary Roach). Your interview must pin down a single prose model, a clear authorial "I" vs research stance, and the jargon/texture of the reader's world.

RULES:
- ONE question per turn. Never two.
- 8-14 exchanges. Don't rush to finish.
- If an answer is abstract, push for a specific example, name, or scene.
- If an answer is generic, ask "what would YOUR book do that the last three in this space did not?"
- Be direct. Not warm. Useful.

DIMENSIONS TO COVER (in roughly this order, but follow the author's lead):

## 1. The specific reader
- Who is this book FOR? Not a demographic — a person in a situation. "First-time founders six months after seed who just got a brutal board email." "Therapists in private practice who are exhausted by admin, not by clients."
- If the answer is broad, narrow it.

## 2. The one transformation
- What does the reader believe or do BEFORE, and what do they believe or do AFTER? Be specific about both states. No "they feel more confident" without the sentence they would say out loud on the last page.

## 3. VOICE ANCHOR (the most important question for non‑fiction)
Say this, verbatim or close to it:
"Name ONE non‑fiction book whose PROSE VOICE you want to sound like. Malcolm Gladwell? Mary Roach? bell hooks? Michael Lewis? Oliver Burkeman? Each is a different register. Not the topic — the sentences. If you can, paste a short paragraph, or tell me: long or short sentences, funny or dead serious, first person or mostly absent author? I don't want to guess whether you want 'Gladwell' or 'Roach' — that choice changes every chapter."

Then probe:
- If they name a book but not the prose, ask what the sentences *do* on the page.
- If they give a sample, ask whether their "I" in this book should match that intimacy level.

This becomes voice_anchor. The named book or author is voice_anchor_source.

## 4. AUTHORIAL STANCE
Ask: "How personal should YOU be? Are you a narrator with stories and stakes, or a researcher presenting findings with a light authorial I?" Follow up: "Is it okay to be funny? Stern? Vulnerable? Can you be wrong in print and correct yourself — or must you stay expert‑solid front to back?"

This becomes authorial_stance. Be specific (e.g. "first-person confessional with occasional data," not "engaging").

## 5. CULTURAL / JARGON TEXTURE
Ask: "What is the SPECIFIC jargon of the world you are writing for — terms you will use without glossing, because the reader is an insider? A therapist writing for therapists uses 'countertransference' without a sidebar definition. A founder for founders says 'PMF' or 'cap table' in passing. A chef says 'mise en place' without a textbook pause."

If they struggle, use examples: medical, legal, sports coaching, software, faith communities — one trade's shorthand that signals credibility.

This becomes cultural_texture. These are words and textures to use without explaining.

## 6. The competitive moat
- Name three adjacent books. What does each get wrong or leave out?
- What will you argue that many experts in the field would resist?

## 7. Credibility
- Lived, professional, or synthesis — what gives you the right?
- The one story, study, or moment that made YOU believe the thesis.

## 8. The one-sentence thesis
- The full argument in one sentence — iterate until it is sharp. This anchors every chapter.

## 9. Structure and evidence
- Framework vs narrative journey vs research synthesis vs hybrid. How many main principles or moves?
- Primary evidence: your stories, clients, data, research, interviews — be concrete.

## 10. The hard objection
- The objection that, unanswered, kills the book. How do you answer it, in one beat?

## 11. The anchor anecdote
- One case, scene, or story that must be in the book. Who, what, what it proves.

## 12. Commercial frame
- Subtitle as the promise (draft options). What did the reader just finish reading before yours?

## 13. OPENING SENTENCES (specific_openers)
Ask for 2–3 sample first sentences in the book's true voice. They need not be the real opening. Capture verbatim.

## 14. FORBIDDEN MOVES (critical for non‑fiction)
Ask: "What business‑book or self‑help clichés do you refuse? No 'paradigm shift,' no 'at the end of the day,' no 'it's about the journey' — name your own allergy list." Phrases, tonal moves, and fake profundity to ban.

These become forbidden_moves. Be specific.

## 15. Ending aim
- What should the reader feel on the last page? Not "inspired" — e.g. unsettled, urgent, quietly certain, angry in a useful way.

# COMPLETION

Output JSON inside <REFINED_IDEA>...</REFINED_IDEA> with ALL of these fields present (use empty string or empty array only if the author truly refused after being asked twice). Arrays may be empty only then.

{
  "title": "...",
  "subtitle": "...",
  "suggested_title": "...",
  "title_alternates": ["...", "..."],
  "category": "...",
  "subcategory": "...",
  "target_reader": "...",
  "reader_before_state": "...",
  "reader_after_state": "...",
  "one_sentence_thesis": "...",
  "unique_angle": "...",
  "comparable_titles": ["..."],
  "what_comps_get_wrong": "...",
  "author_credibility": "...",
  "structure_type": "framework | narrative | research | hybrid",
  "principle_count": 0,
  "evidence_base": "...",
  "hardest_objection": "...",
  "signature_case_study": "...",
  "dominant_tone": "...",
  "voice_anchor": "... (prose model — be specific)",
  "voice_anchor_source": "... (book or author named)",
  "authorial_stance": "... (how personal, how much 'I', researcher vs memoirist — be specific)",
  "cultural_texture": "... (jargon and insider texture used without glossing)",
  "specific_openers": ["...", "..."],
  "forbidden_moves": ["...", "..."],
  "ending_feeling": "...",
  "estimated_length": "...",
  "chapters": 0,
  "word_count": 0,
  "includes_exercises": true,
  "includes_case_studies": true
}

Do not use the phrase "Not specified" for any field. If the author hasn't answered, ask.`;
~~~

## ``lib/openai/outline-briefs.ts``

~~~ts
/* eslint-disable max-len */
/**
 * System prompts for chapter outline generation (fiction vs non-fiction).
 * Output contract: `{"chapters": [...]}` as JSON.
 */

export const OUTLINE_FICTION_SYSTEM_BRIEF = `You are a structural editor who has shaped 50+ novels that were acquired by major publishers. You know that an outline that just covers plot produces AI-slop chapters. An outline that specifies CRAFT targets produces real prose.

Given the brief — including its voice_anchor, authorial_stance, cultural_texture, and specific_openers fields — generate a chapter-by-chapter outline that gives the chapter writer specific craft targets to hit.

## HARD STRUCTURAL RULES

### RULE 1 — Every chapter has a try-fail-cost
Goal, obstacle, cost. If a chapter can be summarized as "character wants X, tries Y, gets X" — rewrite it. Stories run on friction.

### RULE 2 — No dilemma resolves in one move
If a chapter introduces a problem, the resolution requires at least two attempts. First attempt fails or backfires. Then the real solution, which requires a different approach.

### RULE 3 — Character economy
A named character who gets more than one line of dialogue must appear in at least TWO chapters. Single-scene roles get described by function ("the shopkeeper") not by name.

### RULE 4 — No real living public figures as speaking characters
No Elon Musk. No Taylor Swift. No current politicians, CEOs, celebrities, authors, or influencers as named speakers. Fictional analogues only.

### RULE 5 — Chapters open on psychology, not setting
The first move of a chapter should be a character's specific perception, thought, opinion, or small action. Not "the sky was X" or "she stood in the garden." Openings reveal WHO is observing before WHAT is there.

### RULE 6 — Chapter endings introduce the NEXT problem
A chapter doesn't end on recap or promise. It ends on a new complication, a revealed fact that changes what the reader thought, a sentence of dialogue that reframes, or a concrete action that commits the character to the next move. The chapter_ends_with field below must describe the literal final beat AND the new question it raises.

### RULE 7 — Tension curves breathe
Don't stack chapters 1→12 with tension rising monotonically. Real books have breath after spikes, small rises in quieter chapters, the midpoint and climax as the two highest, each preceded by a smaller breath.

## PER-CHAPTER FIELDS (all required)

For each chapter, return this shape:

{
  "number": 1,
  "title": "...",
  "description": "... 4-6 sentences: POV character's goal in this chapter, the obstacle, what actually happens, the cost, why it matters to the overall arc",
  "tension_level": 5,
  "character_moment": "... active choice or active realization, not a passive feeling",
  "opening_psychological_move": "... a specific interior observation, opinion, or small action the chapter should open with. E.g. 'Nechama privately thinks of the hour after havdalah as 'the middle of nowhere' — open in that observation.' NOT 'start with setting.'",
  "signature_chapter_detail": "... ONE concrete object, sensory fact, or line of dialogue that MUST appear. E.g. 'the purple winter coat with the faux-fur hood the younger sister refuses to admit she has outgrown.' This should often draw from signature_image or cultural_texture in the brief.",
  "chapter_ends_with": "... the literal final beat: concrete action, line of dialogue, revealed image, or new question.",
  "ending_opens_what": "... what NEW problem or question the ending creates for the next chapter. Not 'they continue their adventure' — the specific new thing in play.",
  "characters_introduced": ["..."]
}

## HOW TO FILL opening_psychological_move

This is the most important field. It tells the chapter writer how to START. Each one should be a specific move, not a category. Good examples:

- "Open with the POV character noticing they have been holding their breath without realizing. Only then reveal where they are."
- "Open with a private category or classification the character has invented: 'there were two kinds of afternoons in that house, and this was the other kind.'"
- "Open with a small domestic action — setting a cup down, untying a shoe — that carries the entire prior chapter's weight."
- "Open mid-argument, mid-sentence, with the second half of a line of dialogue."

Bad examples (do NOT produce these):
- "Open with sensory detail of the setting."
- "Establish the mood."
- "The character feels worried as the chapter begins."

## HOW TO FILL signature_chapter_detail

This is a specific concrete thing. Reuse details from the brief's signature_image or cultural_texture when possible — those details should recur across chapters.

Good: "The smell of the spice box still in the air." "Ima's voice from the kitchen saying '...no, the other Rosenbergs...'" "A kitchen scissors with a bent tip."
Bad: "A sense of wonder." "The beauty of the stars." "A feeling of warmth."

## HOW TO FILL ending_opens_what

What does the END of this chapter MAKE the reader wonder? What's the new question?

Good: "Faiga has confessed to stealing the siddur and the letter demands it back — but the reader now wonders: WHO is on the other end of that letter, and what does a siddur have to do with it?"
Bad: "They continue their journey." "The adventure goes on."

## OUTPUT

Return ONLY valid JSON:
{"chapters": [{"number": 1, "title": "...", "description": "...", "tension_level": 3, "character_moment": "...", "opening_psychological_move": "...", "signature_chapter_detail": "...", "chapter_ends_with": "...", "ending_opens_what": "...", "characters_introduced": ["..."]}]}

Generate 10-15 chapters. Before returning, verify every chapter has a specific opening_psychological_move (not a category), a concrete signature_chapter_detail (not an abstraction), and an ending_opens_what that introduces a NEW question (not a summary).`;

export const OUTLINE_NONFICTION_SYSTEM_BRIEF = `You are a non-fiction book editor who has turned rough proposals into books that people finish. You know that an outline that only lists topics produces chapters that sound like a blogroll. An outline with CRAFT targets — a hook move, a signature example, a bridge to the next chapter's tension — produces readable, authoritative chapters.

Use the book brief, including its voice_anchor, authorial_stance, cultural_texture, and specific_openers (where present), to align each chapter with the author's real register. Do not invent statistics, named case studies, or expert quotes; describe the *kind* of evidence only. Do not use real living public figures as if they spoke in the text; reference patterns, not name-droppable cameos as speakers.

## HARD STRUCTURAL RULES

### RULE 1 — One chapter, one irreplaceable idea
Each chapter must deliver one core idea the reader could not get from any other chapter. Merge chapters that only repeat the previous one's point with more examples.

### RULE 2 — Every chapter has a specific promise and delivers it
The chapter must promise something testable by the end ("After this, you will see WHY X fails"). Then deliver with evidence and a concrete takeaway.

### RULE 3 — No hollow authority
Do not invent specific statistics, study citations, named case studies, or direct quotes. Say what *type* of support the chapter will use, grounded in the brief. The drafting model and author add real data later.

### RULE 4 — Varied chapter textures
Do not use the same internal shape in every chapter. Vary framework-heavy, narrative, research-forward, exercise, and mixed shapes across the book.

### RULE 5 — Reader state tracking
Each chapter description should state what the reader can believe or do after it that they could not before.

### RULE 6 — Hooks, not warm-ups
Chapters do not start with "In this chapter we will…" or generic scene-setting. They start with a craft hook: a counterintuitive claim, a named moment from a case (described in kind, not invented detail), a direct challenge, or a sharp question — matched to the brief's authorial_stance and voice_anchor.

### RULE 7 — Endings hand off tension, not just topics
A chapter should not end in summary or "in sum." It ends in a line of thought, a question, or a problem the *next* chapter is built to answer.

## STRUCTURE BY BOOK TYPE

Match the structure_type / narrative shape implied in the brief (framework, narrative, research, hybrid) — same act guidance as a strong non-fiction proposal: problem → thesis → body of irreplaceable chapters → hard objections / edge cases → integration.

## PER-CHAPTER FIELDS (all required in the model output; see JSON below)

- number, title, description: same rigor as before — 4–6 sentences including evidence *kind*, reader state shift, and why this chapter is not redundant.
- reader_takeaway: the one honest sentence a reader should be able to repeat after the chapter.
- content_type: one of "framework" | "story" | "research" | "exercise" | "mixed"
- evidence_notes: short, non-specific note on what kind of evidence the chapter draws on (from the brief). No invented names or numbers.
- opening_hook_move: The specific hook the chapter opens with — a counterintuitive line, a named case-study *moment* (as a scene in brief, or described generically as "a founder at week six of…" without inventing a name), a sharp claim the reader resists, or a direct challenge. Not "set up the topic" or "define terms."
- signature_example: The one concrete anchor for the chapter: a recurring metaphor, a single through-line case (described in kind), a representative quoted *kind* of phrase from the field, or the evidence spine — one thing the drafter must not lose.
- bridges_to_next: What specific question, doubt, or tension the ending leaves in play that the *next* chapter is written to address. Not "and next we look at X" as a label — the emotional or intellectual hook.

## HOW TO FILL opening_hook_move (good vs bad)

Good: "Open with the statistic the reader thinks they know — then show why the common version hides the real mechanism." "Open on a specific Monday-morning moment: a manager reopening the same email three times (no proper names required)." "Open with a one-sentence heresy the field pretends not to say out loud."
Bad: "Engage the reader." "Introduce the main theme." "Provide context for the book."

## HOW TO FILL signature_example

One concrete through-line: "the cap table as the hidden character" or "one patient journey described at three time scales" (without inventing identities). If the brief names a case, use that; if not, stay generic in proper nouns but specific in *role and beat*.

## HOW TO FILL bridges_to_next

Good: "The reader now accepts that incentives distort feedback — but wonders how to spot distortion when their own team is the one giving feedback."
Bad: "The next chapter continues the discussion." "Transition to the next section."

## OUTPUT

Return ONLY valid JSON, no prose, no markdown fences:

{"chapters": [{"number": 1, "title": "...", "description": "...", "reader_takeaway": "...", "content_type": "framework", "evidence_notes": "...", "opening_hook_move": "...", "signature_example": "...", "bridges_to_next": "..."}]}

Generate 8–14 chapters. Before returning, verify: (1) one irreplaceable idea per chapter, (2) no invented stats or real named speakers not in the brief, (3) varied chapter shapes, (4) every opening_hook_move and signature_example is specific, (5) every bridges_to_next names a real tension for the next chapter, not a section title.`;
~~~

## ``app/api/ai/generate-chapter/route.ts``

~~~ts
/**
 * Full-chapter generation streams markdown from Claude (Anthropic Messages API)
 * via the Vercel AI SDK’s `AnthropicStream` + `StreamingTextResponse`, matching
 * `app/api/ai/voice-to-chapter/route.ts`. The client consumes the same data stream
 * format (`readDataStream` / `useChapter`).
 */
import { AnthropicStream, StreamingTextResponse, formatStreamPart } from "ai";

import { snapshotChapter } from "@/lib/book/revisions";
import {
  anthropicMessagesCreateStreaming,
  getChapterTextForPersistence,
} from "@/lib/anthropic/message-attempts";
import { classifyAnthropicRequestFailure } from "@/lib/anthropic/request-errors";
import { anthropicTextModelsToTry } from "@/lib/anthropic/text-model";
import { getChapterSystemPrompt } from "@/lib/openai/prompts";
import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { summarizeChapter } from "@/lib/ai/auto-summarize";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { buildSeriesContinuityForChapterPrompt } from "@/lib/series/continuity";
import { runContinuityCheckForChapter } from "@/lib/series/continuity-check";
import { createClient } from "@/lib/supabase/server";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { ChapterRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function characterBibleToPromptText(value: Json | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function inferChapterTargetWords(genre: string | null): number {
  if (!genre) return 2500;
  const g = genre.toLowerCase();
  const nonfictionHints = [
    "nonfiction",
    "non-fiction",
    "memoir",
    "biography",
    "self-help",
    "business",
    "history",
    "essay",
    "reference",
    "technical",
    "how-to",
    "how to",
    "guide",
    "philosophy",
    "science",
    "cookbook",
    "travel",
    "journalism",
    "textbook",
  ];
  const fictionHints = [
    "fiction",
    "novel",
    "fantasy",
    "sci-fi",
    "scifi",
    "science fiction",
    "romance",
    "thriller",
    "mystery",
    "horror",
    "literary",
    "young adult",
    "ya ",
    "drama",
    "adventure",
    "speculative",
    "magic",
    "paranormal",
    "historical fiction",
    "crime",
    "urban fantasy",
    "dystopian",
  ];
  if (nonfictionHints.some((h) => g.includes(h))) return 2000;
  if (fictionHints.some((h) => g.includes(h))) return 3000;
  return 2500;
}

function formatForbiddenMovesForPrompt(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join("; ");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

type BriefCraftFields = {
  voice_anchor: string;
  authorial_stance: string;
  cultural_texture: string;
  forbidden_moves: string;
};

function extractBriefCraftFromRefined(refined: string | null): BriefCraftFields {
  const empty: BriefCraftFields = {
    voice_anchor: "",
    authorial_stance: "",
    cultural_texture: "",
    forbidden_moves: "",
  };
  if (!refined?.trim()) {
    return empty;
  }
  try {
    const p = JSON.parse(refined) as Record<string, unknown>;
    return {
      voice_anchor: typeof p.voice_anchor === "string" ? p.voice_anchor.trim() : "",
      authorial_stance: typeof p.authorial_stance === "string" ? p.authorial_stance.trim() : "",
      cultural_texture: typeof p.cultural_texture === "string" ? p.cultural_texture.trim() : "",
      forbidden_moves: formatForbiddenMovesForPrompt(p.forbidden_moves),
    };
  } catch {
    return empty;
  }
}

function pickOutlineSectionForChapter(
  sections: Json | null | undefined,
  chapterNumber: number,
): Record<string, unknown> | null {
  if (!Array.isArray(sections)) {
    return null;
  }
  for (const row of sections) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    if (typeof o.number === "number" && o.number === chapterNumber) {
      return o;
    }
  }
  const idx = chapterNumber - 1;
  if (idx >= 0 && idx < sections.length) {
    const row = sections[idx];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return row as Record<string, unknown>;
    }
  }
  return null;
}

function strField(o: Record<string, unknown> | null, key: string): string {
  if (!o) {
    return "";
  }
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

function buildBookContext(params: {
  title: string;
  genre: string | null;
  tone: string | null;
  refinedIdea: string | null;
  chapterOutline: string | null;
  chapterTitle: string;
  authorNotes: string | null;
  bookType: BookTypeDb;
  briefCraft: BriefCraftFields;
  outlineSection: Record<string, unknown> | null;
}): string {
  const title = sanitizeText(params.title.trim() || "Untitled");
  const genre = params.genre ? sanitizeText(params.genre) : null;
  const tone = params.tone ? sanitizeText(params.tone) : null;
  const refined = params.refinedIdea?.trim()
    ? sanitizeText(params.refinedIdea.trim())
    : null;
  const chapterTitle = sanitizeText(params.chapterTitle.trim() || "Untitled");
  const outlineRaw =
    params.chapterOutline?.trim() ||
    "No outline summary supplied; infer from book context.";
  const outline = sanitizeText(outlineRaw);
  const authorNotes = params.authorNotes?.trim()
    ? sanitizeText(params.authorNotes.trim()).slice(0, 4_000)
    : null;

  const s = params.outlineSection;
  const isNonFiction = params.bookType === "non_fiction";

  const craftBlockLines: string[] = isNonFiction
    ? [
        "CURRENT CHAPTER CRAFT TARGETS (from outline):",
        `Opening hook move: ${
          strField(s, "opening_hook_move") || "(not set — infer from outline text below)"
        }`,
        `Signature example to anchor the chapter: ${
          strField(s, "signature_example") || "(not set)"
        }`,
        `Ending must bridge to: ${
          strField(s, "bridges_to_next") || "(not set)"
        }`,
        "",
      ]
    : [
        "CURRENT CHAPTER CRAFT TARGETS (from outline):",
        `Opening move: ${
          strField(s, "opening_psychological_move") || "(not set — infer from outline text below)"
        }`,
        `Signature detail to include: ${
          strField(s, "signature_chapter_detail") || "(not set)"
        }`,
        `Ending must open: ${
          strField(s, "ending_opens_what") || "(not set)"
        }`,
        "",
      ];

  const bc = params.briefCraft;
  const voiceBlockLines = [
    `VOICE ANCHOR (match this prose style): ${
      bc.voice_anchor || "(not set in brief — infer from full brief below)"
    }`,
    `AUTHORIAL STANCE: ${bc.authorial_stance || "(not set)"}`,
    `CULTURAL TEXTURE (use these words without explaining them): ${
      bc.cultural_texture || "(not set)"
    }`,
    `FORBIDDEN MOVES: ${bc.forbidden_moves || "(none listed)"}`,
    "",
  ];

  const lines = [
    ...craftBlockLines,
    ...voiceBlockLines,
    `Book title: ${title}`,
    genre ? `Genre: ${genre}` : null,
    tone ? `Tone: ${tone}` : null,
    refined ? `Refined brief / positioning:\n${refined}` : null,
    "",
    `Current chapter: ${chapterTitle}`,
    `Chapter outline (follow closely):\n${outline}`,
    authorNotes
      ? `\nAuthor steering notes (these take precedence when they conflict with the outline; obey them unless they violate the book's tone or continuity):\n${authorNotes}`
      : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function summarizePriorChapter(row: {
  title: string;
  outline_summary: string | null;
  content: string | null;
}): string {
  const title = sanitizeText(row.title.trim() || "Untitled");
  const outline = row.outline_summary?.trim();
  if (outline) {
    return `### ${title}\n${sanitizeText(outline)}`;
  }
  const body = row.content?.trim();
  if (body) {
    const excerpt = sanitizeText(body.slice(0, 1200));
    return `### ${title}\nSummary (excerpt from manuscript): ${excerpt}${body.length > 1200 ? "…" : ""}`;
  }
  return `### ${title}\n(No outline or draft text on file.)`;
}

export async function POST(request: Request) {
  let chapterIdForRevert: string | null = null;
  let bookIdForRevert: string | null = null;
  let shouldRevertOnStreamError = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = ChapterRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId, regenerateForOutline } = parsed.data;
    chapterIdForRevert = chapterId;
    bookIdForRevert = bookId;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "generate-chapter");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, tone, refined_idea, book_type, character_bible, series_id, style_examples, style_instructions",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("generate-chapter.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError("generate-chapter.profile-create", new Error(ensured.error));
        return apiJsonError(
          "Could not initialize profile.",
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      profile = { subscription_tier: "free" };
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select(
        "id, book_id, title, outline_summary, author_notes, chapter_number, status, target_word_count",
      )
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (
      profile.subscription_tier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      return apiJsonError(
        `Free plan includes AI generation for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro to generate chapter ${chapter.chapter_number} and beyond.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    if (book.series_id && profile.subscription_tier !== "pro") {
      return apiJsonError(
        "Series-linked books are a Pro feature.",
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { data: priorRows, error: priorError } = await supabase
      .from("chapters")
      .select(
        "chapter_number, title, outline_summary, content, status, ai_summary",
      )
      .eq("book_id", bookId)
      .lt("chapter_number", chapter.chapter_number)
      .in("status", ["draft", "edited", "approved"])
      .order("chapter_number", { ascending: true });

    if (priorError) {
      logServerError("generate-chapter.prior-chapters", priorError);
      return apiJsonError(
        "Could not load prior chapters.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const { data: outlineRow, error: outlineError } = await supabase
      .from("outlines")
      .select("sections")
      .eq("book_id", bookId)
      .maybeSingle();

    if (outlineError) {
      logServerError("generate-chapter.outline", outlineError);
    }

    const priorSummaries = (priorRows ?? []).map(summarizePriorChapter);

    /* Last ~500 words of the chapter IMMEDIATELY before this one —
     * models need the actual prose, not just a summary, to pick up the
     * in-progress voice, scene grammar, and sentence rhythm. Summaries
     * give structural continuity (who / what / where); the tail prose
     * gives textural continuity. `ai_summary` is preferred for the
     * summary-per-chapter block when present; we fall back to
     * outline_summary (which `summarizePriorChapter` already does). */
    const immediatelyPrior = priorRows?.[priorRows.length - 1];
    const precedingProseRaw = immediatelyPrior?.content?.trim() ?? "";
    const precedingProseWords = precedingProseRaw
      ? precedingProseRaw.split(/\s+/).filter(Boolean)
      : [];
    const precedingProse =
      precedingProseWords.length > 500
        ? `…${precedingProseWords.slice(-500).join(" ")}`
        : precedingProseRaw;

    const targetWords =
      chapter.target_word_count && chapter.target_word_count > 0
        ? chapter.target_word_count
        : inferChapterTargetWords(book.genre);

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;
    const briefCraft = extractBriefCraftFromRefined(book.refined_idea);
    const outlineSection = pickOutlineSectionForChapter(
      outlineRow?.sections ?? null,
      chapter.chapter_number,
    );

    const bookContext = buildBookContext({
      title: book.title,
      genre: book.genre,
      tone: book.tone,
      refinedIdea: book.refined_idea,
      chapterOutline: chapter.outline_summary,
      chapterTitle: chapter.title,
      authorNotes: chapter.author_notes,
      bookType,
      briefCraft,
      outlineSection,
    });
    const characterBibleText = characterBibleToPromptText(book.character_bible);

    const isInSeries = !!book.series_id;
    const seriesContinuity = isInSeries
      ? await buildSeriesContinuityForChapterPrompt(supabase, bookId, user.id)
      : null;

    const voiceAnchor =
      briefCraft.voice_anchor.trim().length > 0 ? briefCraft.voice_anchor : null;

    const baseSystem = getChapterSystemPrompt(
      chapter.chapter_number,
      chapter.title,
      targetWords,
      bookContext,
      priorSummaries,
      characterBibleText,
      bookType,
      voiceAnchor,
      isInSeries,
    );

    /* Prompt layering order (context-assembler spec):
     *   baseSystem → style_examples → series context → codex
     *
     * Rationale: style examples are the voice anchor; series context is the
     * factual continuity tier and must sit immediately before codex so the
     * two canonical-fact blocks (series-wide + book-scoped) read as one
     * contiguous reference region in the model's context window. The
     * canonical SERIES_SYSTEM_FRAGMENT is already baked into baseSystem via
     * getChapterSystemPrompt(..., isInSeries=true).
     *
     * `getChapterSystemPrompt` also bakes `priorSummaries` into the
     * system prompt for this route, so the assembler's own
     * `chapterSummaries` output would duplicate them — we pass
     * `priorChapters: []` here to skip it. The assembler's NEW
     * contribution is the token-budgeted codex block + the "last 500
     * words of the prior chapter" recent-prose block, which is
     * threaded into the user message below for textural continuity.
     */
    const codexTextContext = [
      chapter.title,
      chapter.outline_summary ?? "",
      priorSummaries.join("\n"),
    ]
      .filter((s) => !!s)
      .join("\n");

    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      currentChapterId: chapterId,
      currentChapterNumber: chapter.chapter_number,
      taskType: "chapter-gen",
      baseSystemPrompt: baseSystem,
      styleInput: {
        style_examples: book.style_examples,
        style_instructions: book.style_instructions,
      },
      systemSuffixAfterStyle:
        seriesContinuity && seriesContinuity.trim().length > 0
          ? `\n\n## Series continuity context\n${seriesContinuity}`
          : "",
      /* The route already fetched + summarized priors into `priorSummaries`
       * (as TEXT), but the Prompt Template Editor's `{prior_summaries}`
       * variable expects the context-assembler to produce the rendered
       * block. Re-supply the priors we already have — the assembler
       * renders them into the observability + variable dict for
       * templated generation, while the route's legacy systemPrompt
       * (which already bakes priorSummaries inline via
       * getChapterSystemPrompt) stays untouched as the fallback path. */
      priorChapters: (priorRows ?? []).flatMap((r) => {
        const summary =
          r.ai_summary?.trim() || r.outline_summary?.trim() || "";
        if (!summary) return [];
        return [
          {
            chapterNumber: r.chapter_number,
            title: r.title,
            summary,
          },
        ];
      }),
      precedingProse,
      codexTextOverride: codexTextContext,
      /* The new chapter is being GENERATED — its existing content (if
       * any) is not part of the context for this draft. */
      currentChapterContent: "",
      projectMeta: {
        title: book.title,
        genre: book.genre,
        premise: book.refined_idea,
      },
      chapterMeta: {
        number: chapter.chapter_number,
        title: chapter.title,
        beat: chapter.outline_summary,
      },
    });

    const { systemPrompt } = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "chapter-gen",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });

    const userMessage = context.recentProse
      ? `Write the complete chapter now. Target approximately ${targetWords} words.\n\n---\n\n## End of the previous chapter (for voice + scene continuity; do not repeat it)\n\n${context.recentProse}`
      : `Write the complete chapter now. Target approximately ${targetWords} words.`;

    const { error: statusError } = await supabase
      .from("chapters")
      .update({ status: "generating" })
      .eq("id", chapterId)
      .eq("book_id", bookId);

    if (statusError) {
      logServerError("generate-chapter.status-update", statusError);
      return apiJsonError(
        "Could not start generation.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    shouldRevertOnStreamError = true;

    const models = anthropicTextModelsToTry();
    const anthropicArgs = {
      systemPrompt,
      max_tokens: 16_384,
      temperature: 0.8,
      messages: [{ role: "user" as const, content: userMessage }],
    };

    const encoder = new TextEncoder();

    const revertChapterToPending = async () => {
      const sb = await createClient();
      await sb
        .from("chapters")
        .update({ status: "pending" })
        .eq("id", chapterId)
        .eq("book_id", bookId);
    };

    const encodeStreamError = (err: unknown): Uint8Array => {
      const classified = classifyAnthropicRequestFailure(err);
      const msg =
        classified?.message ?? "The writing assistant is temporarily unavailable.";
      return encoder.encode(formatStreamPart("error", msg));
    };

    /**
     * Start the HTTP response immediately so the client does not sit in "pending"
     * with no headers until Anthropic accepts the connection (which can take long
     * and triggers "Failed to fetch" on some networks / proxies / dev setups).
     */
    const piped = new ReadableStream<Uint8Array>({
      start(controller) {
        void (async () => {
          let modelUsedForUsage = "";
          try {
            const streamResult = await anthropicMessagesCreateStreaming(
              anthropicArgs,
              models,
            );
            modelUsedForUsage = streamResult.modelUsed;
            const { stream } = streamResult;

            const outStream = AnthropicStream(stream as never, {
              onFinal: async (completion) => {
                try {
                  const sb = await createClient();
                  const trimmed = await getChapterTextForPersistence(
                    stream,
                    completion as string,
                  );
                  if (!trimmed) {
                    await sb
                      .from("chapters")
                      .update({ status: "pending" })
                      .eq("id", chapterId)
                      .eq("book_id", bookId);
                    return;
                  }

                  const words = countWords(trimmed);

                  const { data: freshChapter, error: freshErr } = await sb
                    .from("chapters")
                    .select("generation_count")
                    .eq("id", chapterId)
                    .eq("book_id", bookId)
                    .single();

                  if (freshErr || !freshChapter) {
                    await sb
                      .from("chapters")
                      .update({ status: "pending" })
                      .eq("id", chapterId)
                      .eq("book_id", bookId);
                    return;
                  }

                  const nextGen = (freshChapter.generation_count ?? 0) + 1;

                  const snapshotSource = regenerateForOutline
                    ? "regenerate_for_outline"
                    : nextGen > 1
                      ? "regenerate"
                      : "generation";
                  await snapshotChapter(sb, {
                    chapterId,
                    userId: user.id,
                    source: snapshotSource,
                  });

                  const { error: chapterUpdateError } = await sb
                    .from("chapters")
                    .update({
                      content: trimmed,
                      status: "draft",
                      word_count: words,
                      generation_count: nextGen,
                    })
                    .eq("id", chapterId)
                    .eq("book_id", bookId);

                  if (chapterUpdateError) {
                    await sb
                      .from("chapters")
                      .update({ status: "pending" })
                      .eq("id", chapterId)
                      .eq("book_id", bookId);
                    return;
                  }

                  const { data: allChapters, error: sumError } = await sb
                    .from("chapters")
                    .select("word_count")
                    .eq("book_id", bookId);

                  if (!sumError && allChapters) {
                    const totalWords = allChapters.reduce(
                      (acc, row) => acc + (row.word_count ?? 0),
                      0,
                    );
                    await sb
                      .from("books")
                      .update({ word_count: totalWords })
                      .eq("id", bookId)
                      .eq("user_id", user.id);
                  }

                  const tokensUsed =
                    estimateTokensFromText(systemPrompt) +
                    estimateTokensFromText(userMessage) +
                    estimateTokensFromText(trimmed);

                  await sb.from("api_usage").insert({
                    user_id: user.id,
                    route: "/api/ai/generate-chapter",
                    tokens_used: tokensUsed,
                    model: modelUsedForUsage,
                  });

                  await trackEvent(user, "chapter_generated", bookId, {
                    chapterId,
                    words,
                  });

                  /* Refresh the chapter summary so the NEXT chapter's
                   * context assembly immediately benefits from this
                   * draft. Detached: summarization is a separate API
                   * call and we don't want it on the generation
                   * response's hot path. */
                  void summarizeChapter(chapterId).catch((err) => {
                    logServerError("generate-chapter.summarize", err);
                  });

                  /* Prompt 16 § 294-305: background continuity /
                   * plot-hole check. Safe to call unconditionally — the
                   * helper self-gates on series membership + the book's
                   * continuity_checks_enabled flag + book_type=fiction.
                   * Pass the freshly-generated text as an override so we
                   * don't race on the just-written DB row. Detached so
                   * a slow AI call never blocks the author's response. */
                  void runContinuityCheckForChapter(
                    sb,
                    { bookId, chapterId, userId: user.id },
                    { chapterContentOverride: trimmed },
                  ).catch((err) => {
                    logServerError("generate-chapter.continuity", err);
                  });
                } catch (e) {
                  logServerError("generate-chapter.onFinal-persist", e);
                }
              },
            });

            const reader = outStream.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                if (value) {
                  controller.enqueue(value);
                }
              }
              controller.close();
            } catch (pipeErr) {
              logServerError("generate-chapter.stream-pipe", pipeErr);
              await revertChapterToPending();
              try {
                controller.enqueue(encodeStreamError(pipeErr));
              } catch {
                /* controller may be closed */
              }
              try {
                controller.close();
              } catch {
                /* ignore */
              }
            } finally {
              reader.releaseLock();
            }
          } catch (e) {
            logServerError("generate-chapter.anthropic", e);
            await revertChapterToPending();
            try {
              controller.enqueue(encodeStreamError(e));
            } catch {
              /* ignore */
            }
            try {
              controller.close();
            } catch {
              /* ignore */
            }
          }
        })();
      },
    });

    return new StreamingTextResponse(piped, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    logServerError("generate-chapter", e);
    if (shouldRevertOnStreamError && chapterIdForRevert && bookIdForRevert) {
      try {
        const sb = await createClient();
        await sb
          .from("chapters")
          .update({ status: "pending" })
          .eq("id", chapterIdForRevert)
          .eq("book_id", bookIdForRevert);
      } catch {
        /* best effort */
      }
    }
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## ``app/api/ai/generate-outline/route.ts``

~~~ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { getOutlineSystemPromptForBookType } from "@/lib/openai/prompts";
import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import {
  buildSeriesContinuityForOutlinePrompt,
  loadSeriesMetaAndPriorBooks,
} from "@/lib/series/continuity";
import { buildChapterOutlineSummary } from "@/lib/outline/build-chapter-outline-summary";
import { buildPreviouslyInSeriesText } from "@/lib/series/previously";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { OutlineRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Normalized chapter row stored in `outlines.sections` (JSONB) and returned to the client.
 * Fiction and non-fiction share `number` / `title` / `description`; other fields are optional
 * so legacy outlines and mixed shapes still parse.
 */
export type OutlineSectionPayload = {
  number: number;
  title: string;
  description: string;
  /** Fiction: compressed book-wide canon repeated each chapter for self-contained generation. */
  book_canon_digest?: string;
  /** Fiction: anchors tying this chapter to the locked story bible (also folded into chapter outline_summary). */
  story_bible_anchors?: string;
  /** Fiction: emotional/motivational state of named characters entering the chapter. */
  character_state?: string;
  /** Fiction: causal facts in play from prior chapters. */
  continuity_from_prior_chapters?: string;
  stakes_and_costs?: string;
  motifs_and_restraint?: string;
  tension_level?: number;
  character_moment?: string;
  chapter_ends_with?: string;
  characters_introduced?: string[];
  /** Fiction: craft target for how the chapter opens (psychology before scenery). */
  opening_psychological_move?: string;
  /** Fiction: one concrete object/sensory/detail the draft must include. */
  signature_chapter_detail?: string;
  /** Fiction: new question or problem the ending sets up for the next chapter. */
  ending_opens_what?: string;
  reader_takeaway?: string;
  content_type?: string;
  evidence_notes?: string;
  /** Non-fiction: opening hook (claim, case beat, challenge), not topic setup. */
  opening_hook_move?: string;
  /** Non-fiction: anchor example or through-line the chapter centers on. */
  signature_example?: string;
  /** Non-fiction: tension or question the ending passes to the next chapter. */
  bridges_to_next?: string;
  /** Non-fiction: compressed thesis/reader arc repeated each chapter. */
  manuscript_bible_digest?: string;
  stakes_for_reader?: string;
  counterargument_or_tension?: string;
  /** Fiction: exhaustive cast inventory for this chapter. */
  every_character_in_this_chapter?: string;
  every_location_and_time?: string;
  every_prop_object_and_key_detail?: string;
  every_concept_term_and_rule?: string;
  mandatory_beats_checklist?: string;
  /** Non-fiction: exhaustive inventories (voices, context, evidence, terms, beats). */
  every_voice_person_or_source?: string;
  every_context_setting_or_timeframe?: string;
  every_example_evidence_or_datum?: string;
  every_term_framework_or_rule?: string;
};

/** Fiction outline: per-chapter mini story bible for chapter generation consistency. */
const fictionChapterSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  book_canon_digest: z.string().optional().default(""),
  story_bible_anchors: z.string().optional().default(""),
  character_state: z.string().optional().default(""),
  continuity_from_prior_chapters: z.string().optional().default(""),
  stakes_and_costs: z.string().optional().default(""),
  motifs_and_restraint: z.string().optional().default(""),
  opening_psychological_move: z.string().optional().default(""),
  signature_chapter_detail: z.string().optional().default(""),
  ending_opens_what: z.string().optional().default(""),
  tension_level: z.number().int().min(1).max(10).optional().default(5),
  reader_takeaway: z.string().optional().default(""),
  every_character_in_this_chapter: z.string().optional().default(""),
  every_location_and_time: z.string().optional().default(""),
  every_prop_object_and_key_detail: z.string().optional().default(""),
  every_concept_term_and_rule: z.string().optional().default(""),
  mandatory_beats_checklist: z.string().optional().default(""),
});

const nonFictionChapterSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  reader_takeaway: z.string().min(1),
  content_type: z.string().min(1),
  evidence_notes: z.string().optional(),
  opening_hook_move: z.string().optional(),
  signature_example: z.string().optional(),
  bridges_to_next: z.string().optional(),
  manuscript_bible_digest: z.string().optional().default(""),
  continuity_from_prior_chapters: z.string().optional().default(""),
  stakes_for_reader: z.string().optional().default(""),
  counterargument_or_tension: z.string().optional().default(""),
  every_voice_person_or_source: z.string().optional().default(""),
  every_context_setting_or_timeframe: z.string().optional().default(""),
  every_example_evidence_or_datum: z.string().optional().default(""),
  every_term_framework_or_rule: z.string().optional().default(""),
  mandatory_beats_checklist: z.string().optional().default(""),
});

const outlineFictionResponseSchema = z.object({
  chapters: z.array(fictionChapterSchema).min(1).max(40),
});

const outlineNonFictionResponseSchema = z.object({
  chapters: z.array(nonFictionChapterSchema).min(1).max(40),
});

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

/**
 * Detect an explicit chapter count in the author brief (prose or loose JSON).
 * Used to reinforce output length and validate the model did not stop after 1–2 chapters.
 */
function extractRequestedChapterCount(brief: string): number | null {
  const patterns: RegExp[] = [
    /\b(\d{1,3})\s*chapters?\b/i,
    /chapter[_\s]*count\s*[:=]\s*(\d{1,3})/i,
    /"chapter_count"\s*:\s*(\d{1,3})/,
    /\b(\d{1,3})\s*chapters?\s*[·•]/i,
  ];
  for (const re of patterns) {
    const m = brief.match(re);
    if (m) {
      const n = Number.parseInt(m[1]!, 10);
      if (n >= 1 && n <= 40) return n;
    }
  }
  return null;
}

function normalizeFictionSections(
  chapters: z.infer<typeof fictionChapterSchema>[],
): OutlineSectionPayload[] {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return sorted.map((c, index) => ({
    number: index + 1,
    title: c.title.trim(),
    description: c.description.trim(),
    book_canon_digest: (c.book_canon_digest ?? "").trim(),
    story_bible_anchors: (c.story_bible_anchors ?? "").trim(),
    character_state: (c.character_state ?? "").trim(),
    continuity_from_prior_chapters: (c.continuity_from_prior_chapters ?? "").trim(),
    stakes_and_costs: (c.stakes_and_costs ?? "").trim(),
    motifs_and_restraint: (c.motifs_and_restraint ?? "").trim(),
    opening_psychological_move: (c.opening_psychological_move ?? "").trim(),
    signature_chapter_detail: (c.signature_chapter_detail ?? "").trim(),
    ending_opens_what: (c.ending_opens_what ?? "").trim(),
    tension_level: c.tension_level ?? 5,
    reader_takeaway: (c.reader_takeaway ?? "").trim(),
    every_character_in_this_chapter: (c.every_character_in_this_chapter ?? "").trim(),
    every_location_and_time: (c.every_location_and_time ?? "").trim(),
    every_prop_object_and_key_detail: (c.every_prop_object_and_key_detail ?? "").trim(),
    every_concept_term_and_rule: (c.every_concept_term_and_rule ?? "").trim(),
    mandatory_beats_checklist: (c.mandatory_beats_checklist ?? "").trim(),
  }));
}

function normalizeNonFictionSections(
  chapters: z.infer<typeof nonFictionChapterSchema>[],
): OutlineSectionPayload[] {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  return sorted.map((c, index) => {
    const row: OutlineSectionPayload = {
      number: index + 1,
      title: c.title.trim(),
      description: c.description.trim(),
      reader_takeaway: c.reader_takeaway.trim(),
      content_type: c.content_type.trim(),
      manuscript_bible_digest: (c.manuscript_bible_digest ?? "").trim(),
      continuity_from_prior_chapters: (c.continuity_from_prior_chapters ?? "").trim(),
      stakes_for_reader: (c.stakes_for_reader ?? "").trim(),
      counterargument_or_tension: (c.counterargument_or_tension ?? "").trim(),
      every_voice_person_or_source: (c.every_voice_person_or_source ?? "").trim(),
      every_context_setting_or_timeframe: (c.every_context_setting_or_timeframe ?? "").trim(),
      every_example_evidence_or_datum: (c.every_example_evidence_or_datum ?? "").trim(),
      every_term_framework_or_rule: (c.every_term_framework_or_rule ?? "").trim(),
      mandatory_beats_checklist: (c.mandatory_beats_checklist ?? "").trim(),
    };
    if (c.evidence_notes?.trim()) {
      row.evidence_notes = c.evidence_notes.trim();
    }
    if (c.opening_hook_move?.trim()) {
      row.opening_hook_move = c.opening_hook_move.trim();
    }
    if (c.signature_example?.trim()) {
      row.signature_example = c.signature_example.trim();
    }
    if (c.bridges_to_next?.trim()) {
      row.bridges_to_next = c.bridges_to_next.trim();
    }
    return row;
  });
}

type RefinedBriefShape = {
  title?: unknown;
  suggested_title?: unknown;
  subtitle?: unknown;
  genre?: unknown;
  target_audience?: unknown;
  audience?: unknown;
  core_premise?: unknown;
  premise?: unknown;
  tone?: unknown;
  tone_and_style?: unknown;
  key_themes?: unknown;
  themes?: unknown;
};

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

function extractBookColumnsFromRefined(jsonStr: string): {
  title: string | null;
  subtitle: string | null;
  genre: string | null;
  target_audience: string | null;
  tone: string | null;
} {
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { title: null, subtitle: null, genre: null, target_audience: null, tone: null };
    }
    const b = parsed as RefinedBriefShape;
    return {
      title: pickString(b.title, b.suggested_title),
      subtitle: pickString(b.subtitle),
      genre: pickString(b.genre),
      target_audience: pickString(b.target_audience, b.audience),
      tone: pickString(b.tone, b.tone_and_style),
    };
  } catch {
    return { title: null, subtitle: null, genre: null, target_audience: null, tone: null };
  }
}

function renderConversationTranscript(
  conversation: { role: "user" | "assistant"; content: string }[] | undefined,
): string {
  if (!conversation || conversation.length === 0) return "";
  return conversation
    .map((m) => {
      const speaker = m.role === "user" ? "Author" : "Editor";
      return `${speaker}: ${sanitizeText(m.content).trim()}`;
    })
    .filter((line) => line.length > `Author: `.length)
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = OutlineRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const {
      bookId,
      rawIdea: rawIdeaIn,
      refinedIdeaOverride: refinedIn,
      conversation: conversationIn,
    } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rawIdea = rawIdeaIn !== undefined ? sanitizeText(rawIdeaIn) : undefined;
    const refinedIdeaOverride =
      refinedIn !== undefined ? sanitizeText(refinedIn) : undefined;

    if (rawIdea !== undefined && rawIdea.trim().length > 0) {
      const { error: rawUpdateError } = await supabase
        .from("books")
        .update({ raw_idea: rawIdea.trim() })
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (rawUpdateError) {
        logServerError("generate-outline.raw-idea", rawUpdateError);
        return apiJsonError("Could not save concept.", ApiErrorCode.INTERNAL, 500);
      }
    }

    let statusWasBumpedToRefining = false;

    if (
      refinedIdeaOverride !== undefined &&
      refinedIdeaOverride.trim().length > 0
    ) {
      const trimmedRefined = refinedIdeaOverride.trim();
      const cols = extractBookColumnsFromRefined(trimmedRefined);
      const refinedUpdate: {
        refined_idea: string;
        status: "refining";
        title?: string;
        subtitle?: string | null;
        genre?: string | null;
        target_audience?: string | null;
        tone?: string | null;
      } = {
        refined_idea: trimmedRefined,
        status: "refining",
      };
      if (cols.title) refinedUpdate.title = cols.title;
      if (cols.subtitle !== null) refinedUpdate.subtitle = cols.subtitle;
      if (cols.genre !== null) refinedUpdate.genre = cols.genre;
      if (cols.target_audience !== null) refinedUpdate.target_audience = cols.target_audience;
      if (cols.tone !== null) refinedUpdate.tone = cols.tone;

      const { error: refinedUpdateError } = await supabase
        .from("books")
        .update(refinedUpdate)
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (refinedUpdateError) {
        logServerError("generate-outline.refined-idea", refinedUpdateError);
        return apiJsonError("Could not save refined idea.", ApiErrorCode.INTERNAL, 500);
      }
      statusWasBumpedToRefining = true;
    }

    const rollbackRefiningStatus = async (): Promise<void> => {
      if (!statusWasBumpedToRefining) return;
      try {
        await supabase
          .from("books")
          .update({ status: "idea" })
          .eq("id", bookId)
          .eq("user_id", user.id);
      } catch {
        /* ignore */
      }
    };

    const { data: bookFresh, error: refetchError } = await supabase
      .from("books")
      .select(
        "refined_idea, raw_idea, title, book_type, series_id, series_order, previously_in_series, style_examples, style_instructions",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (refetchError || !bookFresh) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (bookFresh.series_id) {
      const { data: proProf } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();
      if (proProf?.subscription_tier !== "pro") {
        return apiJsonError("Series is a Pro feature.", ApiErrorCode.UPGRADE_REQUIRED, 403);
      }
    }

    const bookType: BookTypeDb = bookFresh.book_type ?? "fiction";

    const briefRaw =
      bookFresh.refined_idea?.trim() ||
      bookFresh.raw_idea?.trim() ||
      (bookFresh.title?.trim() && bookFresh.title.trim() !== "Untitled Book"
        ? `Working title: ${bookFresh.title.trim()}`
        : "");
    const brief = sanitizeText(briefRaw);

    if (!brief) {
      return apiJsonError(
        "Add a refined idea or paste a concept before generating an outline.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const baseSystemPromptForOutline = getOutlineSystemPromptForBookType(bookType);
    const transcript = renderConversationTranscript(conversationIn);
    const transcriptBlock =
      transcript.length > 0
        ? `\n\n## Full refinement chat transcript (for extra nuance; the brief above is authoritative)\n${transcript}`
        : "";
    let seriesBlock = "";
    if (bookFresh.series_id && bookFresh.series_order != null) {
      const [ctx, livePreviously] = await Promise.all([
        loadSeriesMetaAndPriorBooks(supabase, bookId, user.id),
        buildPreviouslyInSeriesText(
          supabase,
          bookFresh.series_id,
          user.id,
          bookFresh.series_order,
          bookId,
        ),
      ]);
      if (ctx?.series) {
        const cont = buildSeriesContinuityForOutlinePrompt({
          bookNumberInSeries: ctx.bookNumberInSeries,
          seriesName: ctx.series.name,
          priorBooks: ctx.priorBooks,
        });
        const prev =
          livePreviously.trim() || bookFresh.previously_in_series?.trim() || "";
        if (prev) {
          seriesBlock += `\n\n## Previously in the series (recap; honor continuity)\n${prev}`;
        }
        seriesBlock += `\n\n## Series continuity context\n${cont}`;
      }
    }
    const chapterTarget = extractRequestedChapterCount(`${brief}\n${transcript}`);
    const chapterTargetBlock =
      chapterTarget != null
        ? `\n\n## Author chapter target (mandatory)\nProduce exactly **${chapterTarget}** objects in the \`chapters\` array with \`number\` running 1 through ${chapterTarget}. Do not stop early. If the brief and this line conflict, follow **this line** for count.`
        : "";

    const userContent = `Book brief (structured JSON and/or prose):\n${brief}${transcriptBlock}${seriesBlock}${chapterTargetBlock}`;

    /* Outline generation returns JSON (response_format: json_object), so
     * the style block MUST stay outside the JSON structure. The
     * assembler appends it to the system prompt; the model keeps
     * emitting the required JSON but tilts chapter titles/descriptions
     * toward the author's voice. Codex entries matched in the brief +
     * transcript (plus always-on entries) ride along — they sit outside
     * the JSON contract as additional context. No chapters exist yet,
     * so summary / recent-prose blocks short-circuit to empty. */
    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      taskType: "generate-outline",
      baseSystemPrompt: baseSystemPromptForOutline,
      styleInput: {
        style_examples: bookFresh.style_examples,
        style_instructions: bookFresh.style_instructions,
      },
      codexTextOverride: `${brief}\n${transcript}`,
      priorChapters: [],
      currentChapterContent: "",
      projectMeta: {
        title: bookFresh.title,
        premise: brief,
      },
      userInstruction: transcript,
    });

    const { systemPrompt } = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "generate-outline",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });

    let completionText: string;
    let tokensUsed = 0;

    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        /** Default API cap is too low for many fat chapter objects; without this, JSON often truncates after 1–3 chapters. */
        max_completion_tokens: 16_384,
      });

      const usage = completion.usage;
      tokensUsed =
        usage?.total_tokens ??
        Math.ceil((systemPrompt.length + userContent.length) / 4);

      const choice = completion.choices[0];
      if (choice?.finish_reason === "length") {
        await rollbackRefiningStatus();
        return apiJsonError(
          "Outline generation hit the model output limit (response truncated). Try a slightly shorter premise, or generate again. If you need many chapters, keep the brief focused — the outline still carries full per-chapter detail.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }

      const raw = choice?.message?.content;
      if (!raw) {
        await rollbackRefiningStatus();
        return apiJsonError(
          "The model returned an empty outline.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          502,
        );
      }
      completionText = stripJsonFence(raw);
    } catch (err: unknown) {
      await rollbackRefiningStatus();
      return openAIRequestFailureResponse(err, "generate-outline.openai", {
        fallbackMessage: "The outline generator is temporarily unavailable.",
      });
    }

    let sections: OutlineSectionPayload[];
    try {
      const obj = JSON.parse(completionText) as unknown;
      if (bookType === "non_fiction") {
        const zResult = outlineNonFictionResponseSchema.safeParse(obj);
        if (!zResult.success) {
          logServerError("generate-outline.parse-zod", zResult.error);
          await rollbackRefiningStatus();
          return apiJsonError(
            "Could not parse outline from the model.",
            ApiErrorCode.UNPROCESSABLE_ENTITY,
            422,
          );
        }
        sections = normalizeNonFictionSections(zResult.data.chapters);
      } else {
        const zResult = outlineFictionResponseSchema.safeParse(obj);
        if (!zResult.success) {
          logServerError("generate-outline.parse-zod", zResult.error);
          await rollbackRefiningStatus();
          return apiJsonError(
            "Could not parse outline from the model.",
            ApiErrorCode.UNPROCESSABLE_ENTITY,
            422,
          );
        }
        sections = normalizeFictionSections(zResult.data.chapters);
      }
    } catch {
      await rollbackRefiningStatus();
      return apiJsonError(
        "Could not parse outline JSON from the model.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    if (chapterTarget != null && sections.length !== chapterTarget) {
      await rollbackRefiningStatus();
      return apiJsonError(
        `The outline has ${sections.length} chapters but your brief requests ${chapterTarget}. This often happens when the combined premise is very long. Try generating again, or shorten the premise slightly so the full JSON fits in one response.`,
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const sectionsJson = sections as unknown as Json;

    const { data: upserted, error: upsertError } = await supabase
      .from("outlines")
      .upsert(
        {
          book_id: bookId,
          sections: sectionsJson,
          approved: false,
        },
        { onConflict: "book_id" },
      )
      .select("id, sections")
      .single();

    if (upsertError || !upserted) {
      logServerError("generate-outline.upsert", upsertError);
      return apiJsonError("Could not save outline.", ApiErrorCode.INTERNAL, 500);
    }

    const { error: deleteChaptersError } = await supabase
      .from("chapters")
      .delete()
      .eq("book_id", bookId);

    if (deleteChaptersError) {
      logServerError("generate-outline.delete-chapters", deleteChaptersError);
      return apiJsonError("Could not reset chapters.", ApiErrorCode.INTERNAL, 500);
    }

    const chapterRows = sections.map((s) => ({
      book_id: bookId,
      chapter_number: s.number,
      title: s.title,
      outline_summary: buildChapterOutlineSummary(s),
      status: "pending" as const,
    }));

    const { error: insertChaptersError } = await supabase.from("chapters").insert(chapterRows);

    if (insertChaptersError) {
      logServerError("generate-outline.insert-chapters", insertChaptersError);
      return apiJsonError("Could not create chapter rows.", ApiErrorCode.INTERNAL, 500);
    }

    const { error: bookUpdateError } = await supabase
      .from("books")
      .update({
        status: "outlining",
        chapter_count: sections.length,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (bookUpdateError) {
      logServerError("generate-outline.book-update", bookUpdateError);
      return apiJsonError("Could not update book.", ApiErrorCode.INTERNAL, 500);
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-outline",
      tokens_used: tokensUsed,
      model: "gpt-4o",
    });

    if (bookFresh.series_id && bookFresh.series_order != null) {
      const syncPrev = await buildPreviouslyInSeriesText(
        supabase,
        bookFresh.series_id,
        user.id,
        bookFresh.series_order,
        bookId,
      );
      await supabase
        .from("books")
        .update({ previously_in_series: syncPrev || null, updated_at: new Date().toISOString() })
        .eq("id", bookId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      ok: true,
      outlineId: upserted.id,
      sections,
    });
  } catch (e) {
    logServerError("generate-outline", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
~~~

## ``types/book.types.ts``

~~~ts
import type { BookStatusDb, Database } from "@/types/database.types";

export enum SubscriptionTier {
  Free = "free",
  Pro = "pro",
}

export enum BookStatus {
  Idea = "idea",
  Refining = "refining",
  Outlining = "outlining",
  Writing = "writing",
  Editing = "editing",
  Cover = "cover",
  Complete = "complete",
}

export enum ChapterStatus {
  Pending = "pending",
  Generating = "generating",
  Draft = "draft",
  Edited = "edited",
  Approved = "approved",
}

/** Structured brief produced after idea refinement (AI or manual). */
export interface RefinedIdea {
  title: string;
  genre: string;
  targetAudience: string;
  premise: string;
  toneAndStyle: string;
  keyThemes: string[];
  estimatedChapters: number;
  estimatedWordCount: number;
}

/** Protagonist / antagonist blocks in fiction `<REFINED_IDEA>` JSON. */
export type IdeaBriefFictionRoleBlock = {
  name?: string;
  name_or_description?: string;
  age?: string;
  occupation_or_role?: string;
  want?: string;
  need?: string;
  wound?: string;
  fatal_flaw?: string;
  embarrassing_habit?: string;
  specific_habit?: string;
  wrong_belief_at_start?: string;
  true_belief_at_end?: string;
  motivation?: string;
  valid_point?: string;
  personal_stake?: string;
};

/**
 * Raw `<REFINED_IDEA>` JSON: fiction, non‑fiction, and legacy brief shapes
 * (all fields optional for backward compatibility with older saved `refined_idea` rows).
 */
export type RefinedIdeaBrief = {
  title?: string;
  suggested_title?: string;
  subtitle?: string;
  title_alternates?: string[];
  genre?: string;
  subgenre?: string;
  category?: string;
  subcategory?: string;
  target_audience?: string;
  audience?: string;
  target_reader?: string;
  comparable_titles?: string[];
  protagonist?: IdeaBriefFictionRoleBlock;
  antagonist?: IdeaBriefFictionRoleBlock;
  try_fail_cycle?: string;
  narrator_mode?: string;
  dominant_emotion?: string;
  signature_image?: string;
  signature_scene?: string;
  specific_world_detail?: string;
  core_premise?: string;
  premise?: string;
  one_sentence_thesis?: string;
  unique_angle?: string;
  reader_before_state?: string;
  reader_after_state?: string;
  what_comps_get_wrong?: string;
  author_credibility?: string;
  structure_type?: string;
  evidence_base?: string;
  hardest_objection?: string;
  signature_case_study?: string;
  tone?: string;
  tone_and_style?: string;
  dominant_tone?: string;
  themes?: string | string[];
  key_themes?: string | string[];
  /** Prose style anchor: sample, comparison book, or description — drives chapter voice. */
  voice_anchor?: string;
  /** Where the voice sample or comparison came from. */
  voice_anchor_source?: string;
  /** Insider world/culture details used without explaining — for texture, not theme. */
  cultural_texture?: string;
  /** Narrator attitude: neutral camera, wry, intimate, etc. */
  authorial_stance?: string;
  /** Example opening lines matching desired voice. */
  specific_openers?: string[];
  /** Phrases, tropes, or moves the author wants to avoid. */
  forbidden_moves?: string[];
  estimated_length?: string;
  chapters?: number;
  word_count?: number;
  principle_count?: number;
  includes_exercises?: boolean;
  includes_case_studies?: boolean;
};

/** Outline segment stored in `outlines.sections` JSONB. */
export interface OutlineSection {
  title: string;
  description: string;
  chapter_count: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/** Serialized book row for dashboard / project cards. */
export type DashboardBook = {
  id: string;
  title: string;
  genre: string | null;
  status: BookStatusDb;
  word_count: number;
  chapter_count: number;
  updated_at: string;
  seriesId: string | null;
  seriesName: string | null;
  seriesOrder: number | null;
};

type BooksRow = Database["public"]["Tables"]["books"]["Row"];
type ChaptersRow = Database["public"]["Tables"]["chapters"]["Row"];

/** Single book with all related chapters (ordered by `chapter_number` in queries). */
export type BookWithChapters = BooksRow & {
  chapters: ChaptersRow[];
};
~~~

## ``components/book/IdeaChat.tsx``

~~~tsx
"use client";

import type { Message } from "ai";
import { useChat } from "ai/react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { updateBookTypeAction } from "@/app/(dashboard)/projects/[id]/idea/actions";
import { Button } from "@/components/ui/button";
import type { BookTypeDb, Json } from "@/types/database.types";
import type { RefinedIdeaBrief } from "@/types/book.types";
import { cn } from "@/lib/utils/cn";

export type { RefinedIdeaBrief } from "@/types/book.types";

const REFINED_IDEA_REGEX = /<REFINED_IDEA>([\s\S]*?)<\/REFINED_IDEA>/i;

type EditableBrief = {
  title: string;
  subtitle: string;
  genre: string;
  audience: string;
  premise: string;
  tone: string;
  themes: string;
  estimated_length: string;
  voice_anchor: string;
  authorial_stance: string;
  cultural_texture: string;
};

type EditableFieldKey = keyof EditableBrief;

const EMPTY_EDITABLE: EditableBrief = {
  title: "",
  subtitle: "",
  genre: "",
  audience: "",
  premise: "",
  tone: "",
  themes: "",
  estimated_length: "",
  voice_anchor: "",
  authorial_stance: "",
  cultural_texture: "",
};

function themesToString(t: RefinedIdeaBrief["themes"] | RefinedIdeaBrief["key_themes"]): string {
  if (Array.isArray(t)) return t.join(", ");
  if (typeof t === "string") return t;
  return "";
}

function genreFromRefined(b: RefinedIdeaBrief): string {
  return (
    b.genre?.trim() ||
    b.subgenre?.trim() ||
    b.category?.trim() ||
    b.subcategory?.trim() ||
    ""
  );
}

function audienceFromRefined(b: RefinedIdeaBrief): string {
  return (b.target_audience ?? b.audience ?? b.target_reader ?? "").trim();
}

function toneFromRefined(b: RefinedIdeaBrief): string {
  return (b.tone ?? b.tone_and_style ?? b.dominant_tone ?? "").trim();
}

/** Maps stored brief JSON to the long "premise" field used in the outline / editor. */
function premiseFromRefined(b: RefinedIdeaBrief): string {
  const direct = (b.core_premise ?? b.premise ?? "").trim();
  if (direct) return direct;
  const thesis = b.one_sentence_thesis?.trim();
  if (thesis) {
    const parts: string[] = [thesis];
    const ua = b.unique_angle?.trim();
    if (ua) parts.push(`Unique angle: ${ua}`);
    const ho = b.hardest_objection?.trim();
    if (ho) parts.push(`Hardest reader objection: ${ho}`);
    const sc = b.signature_case_study?.trim();
    if (sc) parts.push(`Anchor case: ${sc}`);
    const gap = b.what_comps_get_wrong?.trim();
    if (gap) parts.push(`What adjacent books miss: ${gap}`);
    return parts.join("\n\n");
  }
  return "";
}

function briefToEditable(b: RefinedIdeaBrief | null): EditableBrief {
  if (!b) return { ...EMPTY_EDITABLE };
  const estimatedLengthFallback = (() => {
    const m = b.estimated_length?.trim();
    if (m) return m;
    const parts = [
      b.chapters != null ? `${b.chapters} chapters` : "",
      b.word_count != null ? `${b.word_count.toLocaleString()} words` : "",
    ].filter(Boolean);
    return parts.join(" · ");
  })();
  return {
    title: (b.title ?? b.suggested_title ?? "").trim(),
    subtitle: (b.subtitle ?? "").trim(),
    genre: genreFromRefined(b),
    audience: audienceFromRefined(b),
    premise: premiseFromRefined(b),
    tone: toneFromRefined(b),
    themes: themesToString(b.themes ?? b.key_themes).trim(),
    estimated_length: estimatedLengthFallback,
    voice_anchor: (b.voice_anchor ?? "").trim(),
    authorial_stance: (b.authorial_stance ?? "").trim(),
    cultural_texture: (b.cultural_texture ?? "").trim(),
  };
}

/** Derive numeric outline targets from the estimated-length line so JSON matches what the author typed. */
function parseEstimatedLengthToBudget(text: string): {
  chapters?: number;
  word_count?: number;
} {
  const t = text.trim();
  if (!t) return {};
  const out: { chapters?: number; word_count?: number } = {};
  const ch = t.match(/(\d+)\s*chapters?/i);
  if (ch) {
    const n = parseInt(ch[1], 10);
    if (!Number.isNaN(n) && n > 0 && n <= 200) out.chapters = n;
  }
  const wc =
    t.match(/([\d,]+)\s*words?\b/i) || t.match(/\b([\d,]+)\s*wk\b/i);
  if (wc) {
    const n = parseInt(wc[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n) && n > 0) out.word_count = n;
  }
  if (out.word_count == null) {
    const wk = t.match(/(\d+(?:\.\d+)?)\s*k\s*words?\b/i);
    if (wk) {
      const n = parseFloat(wk[1]);
      if (!Number.isNaN(n) && n > 0) out.word_count = Math.round(n * 1000);
    }
  }
  return out;
}

function editableToBrief(e: EditableBrief, preserve?: RefinedIdeaBrief | null): RefinedIdeaBrief {
  const themesArr = e.themes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: RefinedIdeaBrief = preserve ? { ...preserve } : {};
  out.title = e.title.trim() || "Untitled";
  out.genre = e.genre.trim();
  out.target_audience = e.audience.trim();
  out.core_premise = e.premise.trim();
  out.tone = e.tone.trim();
  out.tone_and_style = e.tone.trim();
  if (themesArr.length > 0) {
    out.key_themes = themesArr;
    out.themes = themesArr;
  }
  if (e.subtitle.trim()) out.subtitle = e.subtitle.trim();
  if (e.estimated_length.trim()) {
    out.estimated_length = e.estimated_length.trim();
    const budget = parseEstimatedLengthToBudget(e.estimated_length);
    if (budget.chapters != null) out.chapters = budget.chapters;
    else delete out.chapters;
    if (budget.word_count != null) out.word_count = budget.word_count;
    else delete out.word_count;
  }
  if (e.voice_anchor.trim()) out.voice_anchor = e.voice_anchor.trim();
  else delete out.voice_anchor;
  if (e.authorial_stance.trim()) out.authorial_stance = e.authorial_stance.trim();
  else delete out.authorial_stance;
  if (e.cultural_texture.trim()) out.cultural_texture = e.cultural_texture.trim();
  else delete out.cultural_texture;
  return out;
}

function parseRefinedBrief(jsonStr: string): RefinedIdeaBrief | null {
  try {
    const v = JSON.parse(jsonStr) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as RefinedIdeaBrief;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractRefinedFromAssistantContent(content: string): RefinedIdeaBrief | null {
  const match = content.match(REFINED_IDEA_REGEX);
  if (!match?.[1]) return null;
  return parseRefinedBrief(match[1].trim());
}

function conversationToMessages(raw: Json): Message[] {
  if (!Array.isArray(raw)) return [];
  const out: Message[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as { role?: string; content?: string };
    if (row.role !== "user" && row.role !== "assistant") continue;
    out.push({
      id: `loaded-${i}`,
      role: row.role,
      content: typeof row.content === "string" ? row.content : "",
    });
  }
  return out;
}

const briefInputClass =
  "w-full rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm text-editorial-cream placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-60";

function BriefField({
  label,
  hint,
  className,
  action,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("block", className)}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-editorial-muted">
          {label}
        </span>
        {action}
      </div>
      {hint ? (
        <span className="mb-2 block text-xs leading-relaxed text-editorial-muted/90">
          {hint}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function RegenerateFieldControl({
  busy,
  disabled,
  hasValue,
  onClick,
  compact,
}: {
  busy: boolean;
  disabled: boolean;
  hasValue: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={hasValue ? "Regenerate from chat" : "Generate from chat"}
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-gold/40 bg-gold/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold transition hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "" : "self-start",
      )}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-3 w-3" aria-hidden />
      )}
      {hasValue ? "Regenerate" : "From chat"}
    </button>
  );
}

export type IdeaChatProps = {
  bookId: string;
  bookTitle: string;
  initialConversation: Json;
  initialRefinedIdea: string | null;
  initialBookType: BookTypeDb;
};

export function IdeaChat({
  bookId,
  bookTitle,
  initialConversation,
  initialRefinedIdea,
  initialBookType,
}: IdeaChatProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipText, setSkipText] = useState("");
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [bookType, setBookType] = useState<BookTypeDb>(initialBookType);
  const [bookTypePending, startBookTypeTransition] = useTransition();

  const handleBookTypeChange = useCallback(
    (next: BookTypeDb) => {
      if (next === bookType) return;
      const prev = bookType;
      setBookType(next);
      startBookTypeTransition(async () => {
        const result = await updateBookTypeAction(bookId, next);
        if (!result.ok) {
          setBookType(prev);
          toast.error(result.error ?? "Could not save book type.");
        }
      });
    },
    [bookId, bookType],
  );

  const initialFromDb = useMemo(() => {
    if (!initialRefinedIdea) return null;
    return parseRefinedBrief(initialRefinedIdea);
  }, [initialRefinedIdea]);

  const [lockedBrief, setLockedBrief] = useState<RefinedIdeaBrief | null>(initialFromDb);
  const [editable, setEditable] = useState<EditableBrief>(() =>
    briefToEditable(initialFromDb),
  );
  const userTouchedFieldsRef = useRef<Set<EditableFieldKey>>(new Set());
  const lastSyncedBriefJsonRef = useRef<string | null>(
    initialFromDb ? JSON.stringify(initialFromDb) : null,
  );
  const [regeneratingField, setRegeneratingField] = useState<EditableFieldKey | null>(null);
  const autoSubtitleDoneRef = useRef<string | null>(null);

  const initialMessages = useMemo(
    () => conversationToMessages(initialConversation),
    [initialConversation],
  );

  const applyRefinedFromAssistant = useCallback((parsed: RefinedIdeaBrief) => {
    const json = JSON.stringify(parsed);
    if (lastSyncedBriefJsonRef.current === json) {
      return;
    }
    lastSyncedBriefJsonRef.current = json;
    setLockedBrief(parsed);
    setEditable((prev) => {
      const next = briefToEditable(parsed);
      const merged: EditableBrief = { ...next };
      userTouchedFieldsRef.current.forEach((k: EditableFieldKey) => {
        merged[k] = prev[k];
      });
      return merged;
    });
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: "/api/ai/refine-idea",
    initialMessages,
    experimental_prepareRequestBody: ({ messages: chatMessages }) => {
      const last = chatMessages[chatMessages.length - 1];
      if (!last || last.role !== "user") {
        return {
          bookId,
          messages: [],
          userMessage: "",
        };
      }
      const prior = chatMessages
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      return {
        bookId,
        messages: prior,
        userMessage: last.content,
      };
    },
    onError(err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
    onFinish(message) {
      const parsed = extractRefinedFromAssistantContent(message.content);
      if (parsed) {
        applyRefinedFromAssistant(parsed);
      }
    },
  });

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content || isLoading) return;
    const parsed = extractRefinedFromAssistantContent(lastAssistant.content);
    if (!parsed) return;
    applyRefinedFromAssistant(parsed);
  }, [messages, isLoading, applyRefinedFromAssistant]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const goToOutline = useCallback(
    async (opts?: { rawIdea?: string; refinedIdeaOverride?: RefinedIdeaBrief | null }) => {
      setOutlineBusy(true);
      try {
        const raw = opts?.rawIdea;
        const refined = opts?.refinedIdeaOverride;
        const body: {
          bookId: string;
          rawIdea?: string;
          refinedIdeaOverride?: string;
          conversation?: { role: "user" | "assistant"; content: string }[];
        } = { bookId };
        if (raw !== undefined && raw.trim().length > 0) {
          body.rawIdea = raw.trim();
        } else if (refined && Object.keys(refined).length > 0) {
          body.refinedIdeaOverride = JSON.stringify(refined);
        }
        const transcript = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
          .filter((m) => m.content.trim().length > 0);
        if (transcript.length > 0) {
          body.conversation = transcript;
        }
        const res = await fetch("/api/ai/generate-outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Could not start outline.");
        }
        router.push(`/projects/${bookId}/outline`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not start outline.");
      } finally {
        setOutlineBusy(false);
      }
    },
    [bookId, router, messages],
  );

  const onSkipSubmit = async () => {
    await goToOutline({ rawIdea: skipText });
    setSkipOpen(false);
    setSkipText("");
  };

  const setEditableField = useCallback(
    <K extends keyof EditableBrief>(key: K, value: EditableBrief[K]) => {
      userTouchedFieldsRef.current.add(key);
      setEditable((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetEditableToAI = useCallback(() => {
    userTouchedFieldsRef.current.clear();
    setEditable(briefToEditable(lockedBrief));
    lastSyncedBriefJsonRef.current = lockedBrief ? JSON.stringify(lockedBrief) : null;
  }, [lockedBrief]);

  const hasIdeaChatTranscript = useMemo(
    () =>
      messages.some(
        (m) =>
          (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0,
      ),
    [messages],
  );

  const hasBriefTextBasis = useCallback(
    (b: EditableBrief) => {
      return (
        b.title.trim().length > 0 ||
        b.subtitle.trim().length > 0 ||
        b.genre.trim().length > 0 ||
        b.audience.trim().length > 0 ||
        b.premise.trim().length > 0 ||
        b.tone.trim().length > 0 ||
        b.themes.trim().length > 0 ||
        b.estimated_length.trim().length > 0 ||
        b.voice_anchor.trim().length > 0 ||
        b.authorial_stance.trim().length > 0 ||
        b.cultural_texture.trim().length > 0
      );
    },
    [],
  );

  const regenerateBriefField = useCallback(
    async (field: EditableFieldKey, opts?: { silent?: boolean }) => {
      if (field === "subtitle" && !editable.title.trim()) {
        if (!opts?.silent) {
          toast.info("Add a working title first, then we can add a subtitle.");
        }
        return;
      }
      if (field === "title" && !editable.title.trim() && !hasIdeaChatTranscript) {
        if (!opts?.silent) {
          toast.info("Add a few messages in the chat or type a working title, then try again.");
        }
        return;
      }
      if (!hasIdeaChatTranscript && !hasBriefTextBasis(editable)) {
        if (!opts?.silent) {
          toast.info("Type something in the idea chat or the brief, then we can help.");
        }
        return;
      }

      setRegeneratingField(field);
      try {
        const res = await fetch("/api/ai/regenerate-idea-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            field,
            brief: {
              title: editable.title,
              subtitle: editable.subtitle,
              genre: editable.genre,
              audience: editable.audience,
              premise: editable.premise,
              tone: editable.tone,
              themes: editable.themes,
              estimated_length: editable.estimated_length,
            },
            conversation: messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { value?: string; error?: string }
          | null;
        if (!res.ok || !data?.value) {
          throw new Error(data?.error ?? "Could not regenerate this field.");
        }
        userTouchedFieldsRef.current.delete(field);
        setEditable((prev) => ({ ...prev, [field]: data.value ?? "" }));
        if (!opts?.silent) {
          toast.success(
            field === "premise"
              ? "Premise expanded from the chat and your draft — you can still edit it."
              : "Field refreshed from the chat and your current draft.",
          );
        }
      } catch (e) {
        if (!opts?.silent) {
          toast.error(
            e instanceof Error ? e.message : "Could not regenerate this field.",
          );
        }
      } finally {
        setRegeneratingField(null);
      }
    },
    [bookId, editable, hasBriefTextBasis, hasIdeaChatTranscript, messages],
  );

  // Whenever a new brief locks in without a subtitle, quietly ask the model
  // for one so the field is never left blank.
  useEffect(() => {
    if (!lockedBrief) return;
    const titleSig = (editable.title.trim() || "").toLowerCase();
    if (!titleSig) return;
    if (editable.subtitle.trim()) return;
    if (regeneratingField === "subtitle") return;
    if (autoSubtitleDoneRef.current === titleSig) return;
    autoSubtitleDoneRef.current = titleSig;
    void regenerateBriefField("subtitle", { silent: true });
  }, [
    lockedBrief,
    editable.title,
    editable.subtitle,
    regeneratingField,
    regenerateBriefField,
  ]);

  const hasEdits = useMemo(() => {
    const base = briefToEditable(lockedBrief);
    return (Object.keys(base) as (keyof EditableBrief)[]).some(
      (k) => base[k] !== editable[k],
    );
  }, [editable, lockedBrief]);

  const canRegenerate = useMemo(
    () => hasIdeaChatTranscript || hasBriefTextBasis(editable),
    [editable, hasBriefTextBasis, hasIdeaChatTranscript],
  );

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-gold sm:text-3xl">{bookTitle}</h1>
          <p className="mt-1 text-sm text-editorial-muted">
            Refine your concept with the editor — or jump ahead when you are ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSkipOpen(true)}
          className="text-sm text-gold/90 underline-offset-4 transition-colors hover:text-gold hover:underline"
        >
          Skip to outline
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Book type
            </p>
            <p className="mt-1 text-sm text-editorial-muted">
              Tells the AI how to write your chapters — novel-style prose vs.
              structured nonfiction with claims, evidence, and takeaways.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Book type"
            className="inline-flex self-start overflow-hidden rounded-lg border border-border/70 bg-background/60 p-1 sm:self-auto"
          >
            {(
              [
                { value: "fiction", label: "Fiction" },
                { value: "non_fiction", label: "Non-fiction" },
              ] as const
            ).map((opt) => {
              const selected = bookType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleBookTypeChange(opt.value)}
                  disabled={bookTypePending}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "bg-gold text-editorial-bg shadow-sm"
                      : "text-editorial-cream hover:bg-card",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-border/50 bg-card/30 px-3 py-4 sm:px-5"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-editorial-muted">
            Share what you are writing about. The editor will ask a few focused questions.
          </p>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "bg-gold text-editorial-bg"
                  : "bg-editorial-cream/95 text-editorial-bg",
                m.role === "assistant" && "font-serif text-[15px]",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-editorial-cream/10 px-4 py-3"
              aria-live="polite"
              aria-label="Assistant is typing"
            >
              <span className="sr-only">Assistant is typing</span>
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80" />
              </span>
              <span className="text-xs text-editorial-muted">Writing…</span>
            </div>
          </div>
        ) : null}
      </div>

      {lockedBrief ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-gold/35 bg-gradient-to-br from-gold/10 to-card/80 p-5 shadow-[0_0_40px_rgba(201,168,76,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  Idea locked in — edit freely before generating the outline
                </p>
                <p className="mt-1 text-xs text-editorial-muted">
                  These fields (plus the full idea chat) feed the chapter outline. Use Regenerate on
                  any field to fold the latest chat and your draft into fresh copy — the premise
                  regen in particular is built to produce a long, outline-ready brief.
                </p>
              </div>
              {hasEdits ? (
                <button
                  type="button"
                  onClick={resetEditableToAI}
                  className="text-xs text-gold/90 underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {"Reset to assistant's version"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-gold/25 bg-card/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                Voice and texture (drives chapter quality)
              </p>
              <p className="mt-1 text-xs text-editorial-muted">
                Pulled from the interview. Edit so downstream outlines and chapters match the prose
                you want — not guesswork.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-1">
                <BriefField
                  label="Voice anchor"
                  hint="A comparison book, pasted sample, or how the sentences should feel on the page."
                >
                  <textarea
                    rows={3}
                    value={editable.voice_anchor}
                    onChange={(e) => setEditableField("voice_anchor", e.target.value)}
                    placeholder="e.g. Sentence rhythm from a named book, or a short pasted paragraph…"
                    className={cn(briefInputClass, "min-h-[80px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField
                  label="Authorial stance"
                  hint="Neutral camera, wry, intimate, or how much the narrator judges or knows."
                >
                  <textarea
                    rows={2}
                    value={editable.authorial_stance}
                    onChange={(e) => setEditableField("authorial_stance", e.target.value)}
                    placeholder="e.g. Close third, dry humor about the kids, rare omniscient asides…"
                    className={cn(briefInputClass, "min-h-[64px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField
                  label="Cultural / world texture"
                  hint="Insider details, jargon, or setting markers used without explanation."
                >
                  <textarea
                    rows={2}
                    value={editable.cultural_texture}
                    onChange={(e) => setEditableField("cultural_texture", e.target.value)}
                    placeholder="e.g. Phrases, rituals, or trade terms the story assumes…"
                    className={cn(briefInputClass, "min-h-[64px] resize-y leading-relaxed")}
                  />
                </BriefField>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <BriefField
                label="Title"
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "title"}
                    disabled={
                      !canRegenerate ||
                      (!editable.title.trim() && !hasIdeaChatTranscript)
                    }
                    hasValue={Boolean(editable.title.trim())}
                    onClick={() => void regenerateBriefField("title")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.title}
                  onChange={(e) => setEditableField("title", e.target.value)}
                  placeholder="Working title"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Subtitle"
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "subtitle"}
                    disabled={!canRegenerate || !editable.title.trim()}
                    hasValue={Boolean(editable.subtitle.trim())}
                    onClick={() => void regenerateBriefField("subtitle")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.subtitle}
                  onChange={(e) => setEditableField("subtitle", e.target.value)}
                  placeholder={
                    regeneratingField === "subtitle"
                      ? "Crafting a subtitle…"
                      : "Subtitle under the title — auto-generated"
                  }
                  disabled={regeneratingField === "subtitle"}
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Genre"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "genre"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.genre.trim())}
                    onClick={() => void regenerateBriefField("genre")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.genre}
                  onChange={(e) => setEditableField("genre", e.target.value)}
                  placeholder="e.g. Literary fiction"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Audience"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "audience"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.audience.trim())}
                    onClick={() => void regenerateBriefField("audience")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.audience}
                  onChange={(e) => setEditableField("audience", e.target.value)}
                  placeholder="Who is this for?"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Premise"
                hint="This is the main fuel for the chapter outline. Aim for a long, detailed narrative: hook, full arc, turning points, setting and world, main characters, stakes, conflict, and themes. Use Regenerate to fold everything from the chat (plus your other fields) into a single rich draft; edit until it matches your vision."
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "premise"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.premise.trim())}
                    onClick={() => void regenerateBriefField("premise")}
                  />
                }
              >
                <textarea
                  rows={14}
                  value={editable.premise}
                  onChange={(e) => setEditableField("premise", e.target.value)}
                  placeholder="Write a long, concrete brief (multiple paragraphs) — the outline generator will lean heavily on this. When you are ready, use Regenerate to pull every detail you shared in the idea chat (and the fields above) into one cohesive, outline-ready document. The more you put here, the truer the book and structure will be to your idea."
                  className={cn(
                    briefInputClass,
                    "min-h-[320px] resize-y leading-relaxed",
                  )}
                />
              </BriefField>
              <BriefField
                label="Tone"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "tone"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.tone.trim())}
                    onClick={() => void regenerateBriefField("tone")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.tone}
                  onChange={(e) => setEditableField("tone", e.target.value)}
                  placeholder="e.g. Warm, observational, slow-burn"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Themes (comma-separated)"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "themes"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.themes.trim())}
                    onClick={() => void regenerateBriefField("themes")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.themes}
                  onChange={(e) => setEditableField("themes", e.target.value)}
                  placeholder="e.g. Memory, belonging, resilience"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Estimated length"
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "estimated_length"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.estimated_length.trim())}
                    onClick={() => void regenerateBriefField("estimated_length")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.estimated_length}
                  onChange={(e) => setEditableField("estimated_length", e.target.value)}
                  placeholder="e.g. 12 chapters · 60,000 words"
                  className={briefInputClass}
                />
              </BriefField>
            </div>
          </div>

          <Button
            type="button"
            disabled={outlineBusy || isLoading}
            className="h-auto w-full gap-2 bg-gold py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            onClick={() =>
              void goToOutline({ refinedIdeaOverride: editableToBrief(editable, lockedBrief) })
            }
          >
            {outlineBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <>
                Generate outline
                <ArrowRight className="h-5 w-5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          void handleSubmit(e);
        }}
        className="mt-4 flex gap-2 border-t border-border/50 pt-4"
      >
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Reply to the editor…"
          rows={2}
          disabled={isLoading}
          className="min-h-[48px] flex-1 resize-y rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-full min-h-[48px] bg-gold px-4 text-editorial-bg hover:bg-gold/90"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </Button>
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => stop()}
            >
              Stop
            </Button>
          ) : null}
        </div>
      </form>

      {skipOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-outline-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSkipOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="skip-outline-title" className="font-serif text-xl text-gold">
              Skip to outline
            </h2>
            <p className="mt-2 text-sm text-editorial-muted">
              Paste your concept, logline, or notes. We will save them and open the outline step.
            </p>
            <textarea
              value={skipText}
              onChange={(e) => setSkipText(e.target.value)}
              rows={6}
              placeholder="Your book in a paragraph or two…"
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSkipOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={outlineBusy || !skipText.trim()}
                onClick={() => void onSkipSubmit()}
              >
                {outlineBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Continue to outline"
                )}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-editorial-muted">
              Prefer the guided chat?{" "}
              <button
                type="button"
                className="text-gold underline-offset-4 hover:underline"
                onClick={() => setSkipOpen(false)}
              >
                Close and keep refining
              </button>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
~~~

## ``components/book/OutlineEditor.tsx``

~~~tsx
"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Wand2,
} from "@/lib/lucide-icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { approveOutline } from "@/app/(dashboard)/projects/[id]/outline/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { BookTypeDb, Json } from "@/types/database.types";
import { buildChapterOutlineSummary } from "@/lib/outline/build-chapter-outline-summary";
import { cn } from "@/lib/utils/cn";

export type OutlineSection = {
  number: number;
  title: string;
  description: string;
  book_canon_digest?: string;
  story_bible_anchors?: string;
  character_state?: string;
  continuity_from_prior_chapters?: string;
  stakes_and_costs?: string;
  motifs_and_restraint?: string;
  tension_level?: number;
  character_moment?: string;
  chapter_ends_with?: string;
  characters_introduced?: string[];
  opening_psychological_move?: string;
  signature_chapter_detail?: string;
  ending_opens_what?: string;
  reader_takeaway?: string;
  content_type?: string;
  evidence_notes?: string;
  opening_hook_move?: string;
  signature_example?: string;
  bridges_to_next?: string;
  manuscript_bible_digest?: string;
  stakes_for_reader?: string;
  counterargument_or_tension?: string;
  every_character_in_this_chapter?: string;
  every_location_and_time?: string;
  every_prop_object_and_key_detail?: string;
  every_concept_term_and_rule?: string;
  mandatory_beats_checklist?: string;
  every_voice_person_or_source?: string;
  every_context_setting_or_timeframe?: string;
  every_example_evidence_or_datum?: string;
  every_term_framework_or_rule?: string;
};

export type OutlineRow = {
  id: string;
  book_id: string;
  sections: Json;
  approved: boolean;
};

type SectionRow = OutlineSection & { id: string };

type SectionPatch = Partial<
  Pick<SectionRow, "title" | "description" | "reader_takeaway" | "content_type">
>;

function parseSectionsJson(raw: Json): SectionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, i) => {
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Untitled";
    const description = typeof o.description === "string" ? o.description : "";
    const number = typeof o.number === "number" ? o.number : i + 1;
    const tr = o.tension_level;
    const tension_level =
      typeof tr === "number" && Number.isFinite(tr)
        ? Math.min(10, Math.max(1, Math.round(tr)))
        : undefined;
    const character_moment =
      typeof o.character_moment === "string" ? o.character_moment : undefined;
    const chapter_ends_with =
      typeof o.chapter_ends_with === "string" ? o.chapter_ends_with : undefined;
    const reader_takeaway =
      typeof o.reader_takeaway === "string" ? o.reader_takeaway : undefined;
    const content_type =
      typeof o.content_type === "string" ? o.content_type : undefined;
    const evidence_notes =
      typeof o.evidence_notes === "string" ? o.evidence_notes : undefined;
    const opening_psychological_move =
      typeof o.opening_psychological_move === "string"
        ? o.opening_psychological_move
        : undefined;
    const signature_chapter_detail =
      typeof o.signature_chapter_detail === "string" ? o.signature_chapter_detail : undefined;
    const ending_opens_what =
      typeof o.ending_opens_what === "string" ? o.ending_opens_what : undefined;
    const opening_hook_move =
      typeof o.opening_hook_move === "string" ? o.opening_hook_move : undefined;
    const signature_example =
      typeof o.signature_example === "string" ? o.signature_example : undefined;
    const bridges_to_next =
      typeof o.bridges_to_next === "string" ? o.bridges_to_next : undefined;
    const book_canon_digest =
      typeof o.book_canon_digest === "string" ? o.book_canon_digest : undefined;
    const story_bible_anchors =
      typeof o.story_bible_anchors === "string" ? o.story_bible_anchors : undefined;
    const character_state =
      typeof o.character_state === "string" ? o.character_state : undefined;
    const continuity_from_prior_chapters =
      typeof o.continuity_from_prior_chapters === "string"
        ? o.continuity_from_prior_chapters
        : undefined;
    const stakes_and_costs =
      typeof o.stakes_and_costs === "string" ? o.stakes_and_costs : undefined;
    const motifs_and_restraint =
      typeof o.motifs_and_restraint === "string" ? o.motifs_and_restraint : undefined;
    const manuscript_bible_digest =
      typeof o.manuscript_bible_digest === "string" ? o.manuscript_bible_digest : undefined;
    const stakes_for_reader =
      typeof o.stakes_for_reader === "string" ? o.stakes_for_reader : undefined;
    const counterargument_or_tension =
      typeof o.counterargument_or_tension === "string"
        ? o.counterargument_or_tension
        : undefined;
    const every_character_in_this_chapter =
      typeof o.every_character_in_this_chapter === "string"
        ? o.every_character_in_this_chapter
        : undefined;
    const every_location_and_time =
      typeof o.every_location_and_time === "string" ? o.every_location_and_time : undefined;
    const every_prop_object_and_key_detail =
      typeof o.every_prop_object_and_key_detail === "string"
        ? o.every_prop_object_and_key_detail
        : undefined;
    const every_concept_term_and_rule =
      typeof o.every_concept_term_and_rule === "string"
        ? o.every_concept_term_and_rule
        : undefined;
    const mandatory_beats_checklist =
      typeof o.mandatory_beats_checklist === "string"
        ? o.mandatory_beats_checklist
        : undefined;
    const every_voice_person_or_source =
      typeof o.every_voice_person_or_source === "string"
        ? o.every_voice_person_or_source
        : undefined;
    const every_context_setting_or_timeframe =
      typeof o.every_context_setting_or_timeframe === "string"
        ? o.every_context_setting_or_timeframe
        : undefined;
    const every_example_evidence_or_datum =
      typeof o.every_example_evidence_or_datum === "string"
        ? o.every_example_evidence_or_datum
        : undefined;
    const every_term_framework_or_rule =
      typeof o.every_term_framework_or_rule === "string"
        ? o.every_term_framework_or_rule
        : undefined;
    const ci = o.characters_introduced;
    let characters_introduced: string[] | undefined;
    if (Array.isArray(ci)) {
      const names = ci
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length > 0) characters_introduced = names;
    }
    return {
      id: crypto.randomUUID(),
      number,
      title,
      description,
      ...(tension_level !== undefined ? { tension_level } : {}),
      ...(character_moment !== undefined ? { character_moment } : {}),
      ...(chapter_ends_with !== undefined ? { chapter_ends_with } : {}),
      ...(characters_introduced !== undefined ? { characters_introduced } : {}),
      ...(reader_takeaway !== undefined ? { reader_takeaway } : {}),
      ...(content_type !== undefined ? { content_type } : {}),
      ...(evidence_notes !== undefined ? { evidence_notes } : {}),
      ...(opening_psychological_move !== undefined
        ? { opening_psychological_move }
        : {}),
      ...(signature_chapter_detail !== undefined ? { signature_chapter_detail } : {}),
      ...(ending_opens_what !== undefined ? { ending_opens_what } : {}),
      ...(opening_hook_move !== undefined ? { opening_hook_move } : {}),
      ...(signature_example !== undefined ? { signature_example } : {}),
      ...(bridges_to_next !== undefined ? { bridges_to_next } : {}),
      ...(book_canon_digest !== undefined ? { book_canon_digest } : {}),
      ...(story_bible_anchors !== undefined ? { story_bible_anchors } : {}),
      ...(character_state !== undefined ? { character_state } : {}),
      ...(continuity_from_prior_chapters !== undefined
        ? { continuity_from_prior_chapters }
        : {}),
      ...(stakes_and_costs !== undefined ? { stakes_and_costs } : {}),
      ...(motifs_and_restraint !== undefined ? { motifs_and_restraint } : {}),
      ...(manuscript_bible_digest !== undefined ? { manuscript_bible_digest } : {}),
      ...(stakes_for_reader !== undefined ? { stakes_for_reader } : {}),
      ...(counterargument_or_tension !== undefined
        ? { counterargument_or_tension }
        : {}),
      ...(every_character_in_this_chapter !== undefined
        ? { every_character_in_this_chapter }
        : {}),
      ...(every_location_and_time !== undefined ? { every_location_and_time } : {}),
      ...(every_prop_object_and_key_detail !== undefined
        ? { every_prop_object_and_key_detail }
        : {}),
      ...(every_concept_term_and_rule !== undefined
        ? { every_concept_term_and_rule }
        : {}),
      ...(mandatory_beats_checklist !== undefined ? { mandatory_beats_checklist } : {}),
      ...(every_voice_person_or_source !== undefined
        ? { every_voice_person_or_source }
        : {}),
      ...(every_context_setting_or_timeframe !== undefined
        ? { every_context_setting_or_timeframe }
        : {}),
      ...(every_example_evidence_or_datum !== undefined
        ? { every_example_evidence_or_datum }
        : {}),
      ...(every_term_framework_or_rule !== undefined
        ? { every_term_framework_or_rule }
        : {}),
    };
  });
}

function renumber(sections: SectionRow[]): SectionRow[] {
  return sections.map((s, i) => ({ ...s, number: i + 1 }));
}

function toDbSections(sections: SectionRow[]): OutlineSection[] {
  return sections.map((s) => {
    const row: OutlineSection = {
      number: s.number,
      title: s.title,
      description: s.description,
    };
    if (typeof s.tension_level === "number") {
      row.tension_level = s.tension_level;
    }
    if (s.character_moment?.trim()) {
      row.character_moment = s.character_moment.trim();
    }
    if (s.chapter_ends_with?.trim()) {
      row.chapter_ends_with = s.chapter_ends_with.trim();
    }
    if (s.reader_takeaway?.trim()) {
      row.reader_takeaway = s.reader_takeaway.trim();
    }
    if (s.content_type?.trim()) {
      row.content_type = s.content_type.trim();
    }
    if (s.evidence_notes?.trim()) {
      row.evidence_notes = s.evidence_notes.trim();
    }
    if (s.characters_introduced && s.characters_introduced.length > 0) {
      row.characters_introduced = s.characters_introduced;
    }
    if (s.opening_psychological_move?.trim()) {
      row.opening_psychological_move = s.opening_psychological_move.trim();
    }
    if (s.signature_chapter_detail?.trim()) {
      row.signature_chapter_detail = s.signature_chapter_detail.trim();
    }
    if (s.ending_opens_what?.trim()) {
      row.ending_opens_what = s.ending_opens_what.trim();
    }
    if (s.opening_hook_move?.trim()) {
      row.opening_hook_move = s.opening_hook_move.trim();
    }
    if (s.signature_example?.trim()) {
      row.signature_example = s.signature_example.trim();
    }
    if (s.bridges_to_next?.trim()) {
      row.bridges_to_next = s.bridges_to_next.trim();
    }
    if (s.book_canon_digest?.trim()) {
      row.book_canon_digest = s.book_canon_digest.trim();
    }
    if (s.story_bible_anchors?.trim()) {
      row.story_bible_anchors = s.story_bible_anchors.trim();
    }
    if (s.character_state?.trim()) {
      row.character_state = s.character_state.trim();
    }
    if (s.continuity_from_prior_chapters?.trim()) {
      row.continuity_from_prior_chapters = s.continuity_from_prior_chapters.trim();
    }
    if (s.stakes_and_costs?.trim()) {
      row.stakes_and_costs = s.stakes_and_costs.trim();
    }
    if (s.motifs_and_restraint?.trim()) {
      row.motifs_and_restraint = s.motifs_and_restraint.trim();
    }
    if (s.manuscript_bible_digest?.trim()) {
      row.manuscript_bible_digest = s.manuscript_bible_digest.trim();
    }
    if (s.stakes_for_reader?.trim()) {
      row.stakes_for_reader = s.stakes_for_reader.trim();
    }
    if (s.counterargument_or_tension?.trim()) {
      row.counterargument_or_tension = s.counterargument_or_tension.trim();
    }
    if (s.every_character_in_this_chapter?.trim()) {
      row.every_character_in_this_chapter = s.every_character_in_this_chapter.trim();
    }
    if (s.every_location_and_time?.trim()) {
      row.every_location_and_time = s.every_location_and_time.trim();
    }
    if (s.every_prop_object_and_key_detail?.trim()) {
      row.every_prop_object_and_key_detail = s.every_prop_object_and_key_detail.trim();
    }
    if (s.every_concept_term_and_rule?.trim()) {
      row.every_concept_term_and_rule = s.every_concept_term_and_rule.trim();
    }
    if (s.mandatory_beats_checklist?.trim()) {
      row.mandatory_beats_checklist = s.mandatory_beats_checklist.trim();
    }
    if (s.every_voice_person_or_source?.trim()) {
      row.every_voice_person_or_source = s.every_voice_person_or_source.trim();
    }
    if (s.every_context_setting_or_timeframe?.trim()) {
      row.every_context_setting_or_timeframe = s.every_context_setting_or_timeframe.trim();
    }
    if (s.every_example_evidence_or_datum?.trim()) {
      row.every_example_evidence_or_datum = s.every_example_evidence_or_datum.trim();
    }
    if (s.every_term_framework_or_rule?.trim()) {
      row.every_term_framework_or_rule = s.every_term_framework_or_rule.trim();
    }
    return row;
  });
}

type ChapterCardEditorProps = {
  section: SectionRow;
  onChange: (id: string, patch: SectionPatch) => void;
  onDelete: (id: string) => void;
  bookType?: BookTypeDb;
};

function ChapterCardEditor({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
}: ChapterCardEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gold">
            Ch. {section.number}
          </span>
          {editingTitle ? (
            <input
              autoFocus
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 font-serif text-lg text-foreground"
              value={section.title}
              onChange={(e) => onChange(section.id, { title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingTitle(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 text-left font-serif text-lg text-editorial-cream hover:text-gold"
              onClick={() => setEditingTitle(true)}
            >
              {section.title || "Untitled chapter"}
            </button>
          )}
        </div>
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-md text-editorial-muted hover:bg-destructive/15 hover:text-destructive md:min-h-0 md:min-w-0 md:p-2"
          aria-label="Delete chapter"
          onClick={() => onDelete(section.id)}
        >
          <Trash2 className="mx-auto h-4 w-4" aria-hidden />
        </button>
      </div>
      {editingDesc ? (
        <textarea
          autoFocus
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          value={section.description}
          onChange={(e) => onChange(section.id, { description: e.target.value })}
          onBlur={() => setEditingDesc(false)}
        />
      ) : (
        <button
          type="button"
          className="w-full rounded-md px-1 py-1 text-left text-sm leading-relaxed text-editorial-muted hover:bg-muted/20 hover:text-editorial-cream"
          onClick={() => setEditingDesc(true)}
        >
          {section.description || "Click to add a short summary of this chapter…"}
        </button>
      )}
      {bookType === "non_fiction" ? (
        <div className="space-y-2 rounded-md border border-border/40 bg-card/20 px-3 py-2">
          <label className="block text-xs font-medium text-editorial-muted">
            Reader takeaway
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={section.reader_takeaway ?? ""}
              placeholder="What the reader can do or think differently after this chapter"
              onChange={(e) => onChange(section.id, { reader_takeaway: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-editorial-muted">
            Content focus
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={section.content_type ?? ""}
              placeholder="e.g. framework, story, research, exercise, mixed"
              onChange={(e) => onChange(section.id, { content_type: e.target.value })}
            />
          </label>
        </div>
      ) : null}
      {bookType === "non_fiction" &&
      (section.manuscript_bible_digest?.trim() ||
        section.every_voice_person_or_source?.trim() ||
        section.every_context_setting_or_timeframe?.trim() ||
        section.every_example_evidence_or_datum?.trim() ||
        section.every_term_framework_or_rule?.trim() ||
        section.mandatory_beats_checklist?.trim() ||
        section.continuity_from_prior_chapters?.trim() ||
        section.stakes_for_reader?.trim() ||
        section.counterargument_or_tension?.trim() ||
        section.opening_hook_move?.trim() ||
        section.signature_example?.trim() ||
        section.bridges_to_next?.trim() ||
        section.evidence_notes?.trim()) ? (
        <div className="space-y-2 rounded-md border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-editorial-muted">
          {section.every_voice_person_or_source?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Voices / sources</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_voice_person_or_source.trim()}
              </span>
            </p>
          ) : null}
          {section.every_context_setting_or_timeframe?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Context &amp; setting</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_context_setting_or_timeframe.trim()}
              </span>
            </p>
          ) : null}
          {section.every_example_evidence_or_datum?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Examples / evidence</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_example_evidence_or_datum.trim()}
              </span>
            </p>
          ) : null}
          {section.every_term_framework_or_rule?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Terms &amp; frameworks</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_term_framework_or_rule.trim()}
              </span>
            </p>
          ) : null}
          {section.mandatory_beats_checklist?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Mandatory beats</span>{" "}
              <span className="text-editorial-cream/90">
                {section.mandatory_beats_checklist.trim()}
              </span>
            </p>
          ) : null}
          {section.manuscript_bible_digest?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Manuscript bible</span>{" "}
              <span className="text-editorial-cream/90">
                {section.manuscript_bible_digest.trim()}
              </span>
            </p>
          ) : null}
          {section.continuity_from_prior_chapters?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Continuity</span>{" "}
              <span className="text-editorial-cream/90">
                {section.continuity_from_prior_chapters.trim()}
              </span>
            </p>
          ) : null}
          {section.stakes_for_reader?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Reader stakes</span>{" "}
              <span className="text-editorial-cream/90">{section.stakes_for_reader.trim()}</span>
            </p>
          ) : null}
          {section.counterargument_or_tension?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Counterargument / tension</span>{" "}
              <span className="text-editorial-cream/90">
                {section.counterargument_or_tension.trim()}
              </span>
            </p>
          ) : null}
          {section.opening_hook_move?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Opening hook</span>{" "}
              <span className="text-editorial-cream/90">{section.opening_hook_move.trim()}</span>
            </p>
          ) : null}
          {section.signature_example?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Signature example</span>{" "}
              <span className="text-editorial-cream/90">{section.signature_example.trim()}</span>
            </p>
          ) : null}
          {section.bridges_to_next?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Bridges to next</span>{" "}
              <span className="text-editorial-cream/90">{section.bridges_to_next.trim()}</span>
            </p>
          ) : null}
          {section.evidence_notes?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Evidence (kind)</span>{" "}
              <span className="text-editorial-cream/90">{section.evidence_notes.trim()}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      {bookType === "fiction" &&
      (section.book_canon_digest?.trim() ||
        section.every_character_in_this_chapter?.trim() ||
        section.every_location_and_time?.trim() ||
        section.every_prop_object_and_key_detail?.trim() ||
        section.every_concept_term_and_rule?.trim() ||
        section.mandatory_beats_checklist?.trim() ||
        section.story_bible_anchors?.trim() ||
        section.character_state?.trim() ||
        section.continuity_from_prior_chapters?.trim() ||
        section.stakes_and_costs?.trim() ||
        section.motifs_and_restraint?.trim() ||
        section.reader_takeaway?.trim() ||
        typeof section.tension_level === "number" ||
        section.character_moment?.trim() ||
        section.chapter_ends_with?.trim() ||
        section.opening_psychological_move?.trim() ||
        section.signature_chapter_detail?.trim() ||
        section.ending_opens_what?.trim()) ? (
        <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-md border border-gold/25 bg-gold/5 px-3 py-2 text-xs text-editorial-muted">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gold/90">
            Chapter story bible (feeds chapter generation)
          </p>
          {section.every_character_in_this_chapter?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Every character</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_character_in_this_chapter.trim()}
              </span>
            </p>
          ) : null}
          {section.every_location_and_time?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Locations &amp; time</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_location_and_time.trim()}
              </span>
            </p>
          ) : null}
          {section.every_prop_object_and_key_detail?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Props &amp; key details</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_prop_object_and_key_detail.trim()}
              </span>
            </p>
          ) : null}
          {section.every_concept_term_and_rule?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Concepts &amp; rules</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_concept_term_and_rule.trim()}
              </span>
            </p>
          ) : null}
          {section.mandatory_beats_checklist?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Mandatory beats</span>{" "}
              <span className="text-editorial-cream/90">
                {section.mandatory_beats_checklist.trim()}
              </span>
            </p>
          ) : null}
          {section.book_canon_digest?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Book canon</span>{" "}
              <span className="text-editorial-cream/90">{section.book_canon_digest.trim()}</span>
            </p>
          ) : null}
          {section.story_bible_anchors?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Chapter anchors</span>{" "}
              <span className="text-editorial-cream/90">{section.story_bible_anchors.trim()}</span>
            </p>
          ) : null}
          {section.character_state?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Character state</span>{" "}
              <span className="text-editorial-cream/90">{section.character_state.trim()}</span>
            </p>
          ) : null}
          {section.continuity_from_prior_chapters?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Continuity</span>{" "}
              <span className="text-editorial-cream/90">
                {section.continuity_from_prior_chapters.trim()}
              </span>
            </p>
          ) : null}
          {section.stakes_and_costs?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Stakes &amp; costs</span>{" "}
              <span className="text-editorial-cream/90">{section.stakes_and_costs.trim()}</span>
            </p>
          ) : null}
          {section.motifs_and_restraint?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Motifs / restraint</span>{" "}
              <span className="text-editorial-cream/90">{section.motifs_and_restraint.trim()}</span>
            </p>
          ) : null}
          {section.reader_takeaway?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Reader takeaway</span>{" "}
              <span className="text-editorial-cream/90">{section.reader_takeaway.trim()}</span>
            </p>
          ) : null}
          <div className="space-y-1 border-t border-border/30 pt-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {typeof section.tension_level === "number" ? (
                <span>
                  <span className="font-medium text-editorial-cream/90">Tension</span>{" "}
                  {section.tension_level}/10
                </span>
              ) : null}
              {section.chapter_ends_with?.trim() ? (
                <span>
                  <span className="font-medium text-editorial-cream/90">Ends with</span>{" "}
                  {section.chapter_ends_with.trim()}
                </span>
              ) : null}
            </div>
            {section.opening_psychological_move?.trim() ? (
              <p>
                <span className="font-medium text-editorial-cream/90">Opening (psych):</span>{" "}
                {section.opening_psychological_move.trim()}
              </p>
            ) : null}
            {section.signature_chapter_detail?.trim() ? (
              <p>
                <span className="font-medium text-editorial-cream/90">Signature detail:</span>{" "}
                {section.signature_chapter_detail.trim()}
              </p>
            ) : null}
            {section.ending_opens_what?.trim() ? (
              <p>
                <span className="font-medium text-editorial-cream/90">Ending opens:</span>{" "}
                {section.ending_opens_what.trim()}
              </p>
            ) : null}
            {section.character_moment?.trim() ? (
              <p>
                <span className="font-medium text-editorial-cream/90">Character beat:</span>{" "}
                {section.character_moment.trim()}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableChapterCard({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
}: ChapterCardEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full gap-3 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm",
        isDragging && "z-10 opacity-90 ring-2 ring-gold/40",
      )}
    >
      <button
        type="button"
        className="mt-1 flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-md border border-border/60 text-editorial-muted hover:bg-muted/30 hover:text-gold active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>
      <ChapterCardEditor
        section={section}
        onChange={onChange}
        onDelete={onDelete}
        bookType={bookType}
      />
    </div>
  );
}

type TouchReorderChapterCardProps = ChapterCardEditorProps & {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function TouchReorderChapterCard({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: TouchReorderChapterCardProps) {
  return (
    <div className="flex w-full gap-2 rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm sm:gap-3 sm:p-4">
      <div className="flex shrink-0 flex-col justify-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 border-border/60"
          disabled={!canMoveUp}
          aria-label="Move chapter up"
          onClick={onMoveUp}
        >
          <ChevronUp className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 border-border/60"
          disabled={!canMoveDown}
          aria-label="Move chapter down"
          onClick={onMoveDown}
        >
          <ChevronDown className="h-5 w-5" aria-hidden />
        </Button>
      </div>
      <ChapterCardEditor
        section={section}
        onChange={onChange}
        onDelete={onDelete}
        bookType={bookType}
      />
    </div>
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return coarse;
}

export type OutlineEditorProps = {
  bookId: string;
  bookTitle: string;
  bookType?: BookTypeDb;
  initialOutline: OutlineRow | null;
  /**
   * Fired after a drag (or touch) reorder, once the in-memory list has been
   * renumbered. Section ids are client-side (not `chapters` PKs) until the
   * outline is saved / approved — this is for analytics or future automations.
   */
  onSectionReorder?: (detail: { chapterId: string; newPosition: number; orderedSectionIds: string[] }) => void;
};

export function OutlineEditor({
  bookId,
  bookTitle,
  bookType = "fiction",
  initialOutline,
  onSectionReorder,
}: OutlineEditorProps) {
  const router = useRouter();
  const coarsePointer = useCoarsePointer();
  const [outlineId, setOutlineId] = useState<string | null>(initialOutline?.id ?? null);
  const [sections, setSections] = useState<SectionRow[]>(() =>
    initialOutline ? renumber(parseSectionsJson(initialOutline.sections)) : [],
  );
  const [loading, setLoading] = useState(!initialOutline);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const outlineIdRef = useRef(outlineId);
  outlineIdRef.current = outlineId;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(
    ...(coarsePointer ? [keyboardSensor] : [pointerSensor, keyboardSensor]),
  );

  const persist = useCallback(
    async (toSave: SectionRow[]) => {
      const oid = outlineIdRef.current;
      if (!oid) return;
      setSaving(true);
      try {
        const supabase = createClient();
        const dbSections = toDbSections(renumber(toSave));
        const { error: outlineErr } = await supabase
          .from("outlines")
          .update({ sections: dbSections as unknown as Json })
          .eq("id", oid)
          .eq("book_id", bookId);

        if (outlineErr) throw outlineErr;

        const { error: delErr } = await supabase.from("chapters").delete().eq("book_id", bookId);
        if (delErr) throw delErr;

        if (dbSections.length > 0) {
          const { error: insErr } = await supabase.from("chapters").insert(
            dbSections.map((s) => ({
              book_id: bookId,
              chapter_number: s.number,
              title: s.title,
              outline_summary: buildChapterOutlineSummary(s),
              status: "pending" as const,
            })),
          );
          if (insErr) throw insErr;
        }

        const { error: bookErr } = await supabase
          .from("books")
          .update({ chapter_count: dbSections.length })
          .eq("id", bookId);

        if (bookErr) throw bookErr;

        router.refresh();
      } catch {
        toast.error("Could not save outline. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [bookId, router],
  );

  const scheduleSave = useCallback(
    (snapshot: SectionRow[]) => {
      sectionsRef.current = snapshot;
      if (!outlineIdRef.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void persist(sectionsRef.current);
      }, 500);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (initialOutline) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("outlines")
          .select("id, book_id, sections, approved")
          .eq("book_id", bookId)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          toast.error("Could not load outline.");
          return;
        }
        if (data) {
          setOutlineId(data.id);
          setSections(renumber(parseSectionsJson(data.sections)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, initialOutline]);

  const applySectionsFromApi = useCallback((apiSections: OutlineSection[], newOutlineId: string) => {
    setOutlineId(newOutlineId);
    setSections(
      renumber(
        apiSections.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
        })),
      ),
    );
  }, []);

  const runGenerateOutline = useCallback(async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sections?: OutlineSection[];
        outlineId?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.sections || !data.outlineId) {
        throw new Error(data?.error ?? "Outline generation failed.");
      }
      applySectionsFromApi(data.sections, data.outlineId);
      toast.success("Outline updated.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Outline generation failed.");
    } finally {
      setRegenerating(false);
      setRegenDialogOpen(false);
    }
  }, [applySectionsFromApi, bookId, router]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = renumber(arrayMove(items, oldIndex, newIndex));
      sectionsRef.current = next;
      scheduleSave(next);
      onSectionReorder?.({
        chapterId: String(active.id),
        newPosition: newIndex + 1,
        orderedSectionIds: next.map((s) => s.id),
      });
      return next;
    });
  };

  const moveSectionByIndex = useCallback(
    (id: string, delta: -1 | 1) => {
      setSections((items) => {
        const i = items.findIndex((s) => s.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= items.length) return items;
        const next = renumber(arrayMove(items, i, j));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const updateSection = useCallback(
    (id: string, patch: SectionPatch) => {
      setSections((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const deleteSection = useCallback(
    (id: string) => {
      setSections((prev) => {
        const next = renumber(prev.filter((s) => s.id !== id));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const addChapter = useCallback(() => {
    setSections((prev) => {
      const next = renumber([
        ...prev,
        {
          id: crypto.randomUUID(),
          number: prev.length + 1,
          title: "New chapter",
          description: "",
          ...(bookType === "non_fiction"
            ? { reader_takeaway: "", content_type: "" }
            : {}),
        },
      ]);
      sectionsRef.current = next;
      scheduleSave(next);
      return next;
    });
  }, [bookType, scheduleSave]);

  const sortableIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const handleApprove = async () => {
    setApproveBusy(true);
    try {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      await persist(sectionsRef.current);

      const result = await approveOutline(bookId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Outline approved — happy writing.");
      router.push(`/projects/${bookId}/chapters/${result.firstChapterId}`);
      router.refresh();
    } catch {
      toast.error("Could not approve outline.");
    } finally {
      setApproveBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-editorial-muted">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-gold sm:text-3xl">{bookTitle}</h1>
          <p className="mt-1 text-sm text-editorial-muted">
            {coarsePointer
              ? "Use the arrows to reorder on touch devices. Click titles and descriptions to edit. Changes save automatically."
              : "Drag to reorder, click titles and descriptions to edit. Changes save automatically."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/40 text-gold hover:bg-gold/10"
          disabled={regenerating || !outlineId}
          onClick={() => setRegenDialogOpen(true)}
        >
          {regenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" aria-hidden />
          )}
          Regenerate entire outline
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 bg-gradient-to-b from-card/60 to-editorial-bg/80 px-6 py-12 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Outline</p>
          <h2 className="mt-2 font-serif text-2xl text-editorial-cream sm:text-3xl">
            No outline yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-editorial-muted">
            Once your idea feels solid, we&apos;ll propose chapter titles and beat-by-beat
            summaries. You can drag to reorder, edit every line, and regenerate anytime.
          </p>
          <ol className="mx-auto mt-8 max-w-lg space-y-3 text-left text-sm text-editorial-muted">
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">1.</span>
              Finish refining your idea on the Idea tab (or paste a brief below via generate).
            </li>
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">2.</span>
              Generate a structured outline from your book brief in one pass.
            </li>
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">3.</span>
              Approve when it feels right—then jump into chapter writing.
            </li>
          </ol>
          <Button
            type="button"
            className="mt-10 bg-gold px-8 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={regenerating}
            onClick={() => void runGenerateOutline()}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Generate outline from brief
          </Button>
        </div>
      ) : coarsePointer ? (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <TouchReorderChapterCard
              key={section.id}
              section={section}
              onChange={updateSection}
              onDelete={deleteSection}
              bookType={bookType}
              canMoveUp={idx > 0}
              canMoveDown={idx < sections.length - 1}
              onMoveUp={() => moveSectionByIndex(section.id, -1)}
              onMoveDown={() => moveSectionByIndex(section.id, 1)}
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section) => (
                <SortableChapterCard
                  key={section.id}
                  section={section}
                  onChange={updateSection}
                  onDelete={deleteSection}
                  bookType={bookType}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {sections.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full border border-border/60 sm:w-auto"
          onClick={addChapter}
          disabled={!outlineId}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add chapter
        </Button>
      ) : null}

      {sections.length > 0 ? (
        <div className="pt-4">
          <Button
            type="button"
            className="h-auto w-full gap-2 bg-gold py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={approveBusy || saving || regenerating || !outlineId}
            onClick={() => void handleApprove()}
          >
            {approveBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : null}
            Approve Outline & Start Writing
          </Button>
          {saving ? (
            <p className="mt-2 text-center text-xs text-editorial-muted">Saving changes…</p>
          ) : null}
        </div>
      ) : null}

      {regenDialogOpen ? (
        <div
          className={responsiveModalRoot("z-50")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="regen-outline-title"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close dialog"
            disabled={regenerating}
            onClick={() => {
              if (!regenerating) setRegenDialogOpen(false);
            }}
          />
          <div
            className={responsiveModalPanel("max-w-md p-6")}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="regen-outline-title" className="font-serif text-xl text-gold">
              Regenerate entire outline?
            </h2>
            <p className="mt-2 text-sm text-editorial-muted">
              This replaces all chapters with a fresh AI outline. Your current structure and
              edits will be lost.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={regenerating}
                onClick={() => setRegenDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={regenerating}
                onClick={() => void runGenerateOutline()}
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
~~~

## ``components/book/chapter-editor/toolbar.tsx``

~~~tsx
"use client";

import type { Editor } from "@tiptap/core";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  AlignCenterVertical,
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Code2,
  Expand,
  History,
  Italic,
  Keyboard,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize,
  MessageSquareText,
  Mic,
  Maximize2,
  Minimize2,
  PenLine,
  Quote,
  Redo2,
  Search,
  Shield,
  Sparkles,
  SpellCheck2,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo2,
  Wand2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { AssistToneOption } from "./types";

export type ToolbarProps = {
  editor: Editor | null;
  toolbarDisabled: boolean;
  aiBusy: boolean;
  findOpen: boolean;
  spellcheckOn: boolean;
  zenMode: boolean;
  /**
   * `focusMode` is the aggressive distraction-free mode that hides the
   * whole toolbar. The button here toggles it *on*; exit is handled
   * elsewhere (overlay chip + Esc). We still accept the prop so the
   * button can reflect pressed state for the rare case where the
   * toolbar is rendered during an edge-case transition.
   */
  focusMode: boolean;
  typewriterMode: boolean;
  expandPromptOpen: boolean;
  rewritePromptOpen: boolean;
  /** Destination for the Version history link (chapter-specific revisions page). */
  versionHistoryHref: string;
  /** True on macOS / iPadOS so the tooltip can show ⌘ instead of Ctrl for the Cmd+. shortcut. */
  isMacPlatform: boolean;
  onRegenerate: () => void;
  onOpenExpand: () => void;
  onOpenRewrite: () => void;
  onShorten: () => void;
  onProofread: () => void;
  onContinue: () => void;
  onTone: (tone: AssistToneOption) => void;
  onToggleFind: () => void;
  onToggleSpellcheck: () => void;
  onToggleZen: () => void;
  onToggleFocus: () => void;
  onToggleTypewriter: () => void;
  onShowCheatsheet: () => void;
  onOpenLink: () => void;
  /** When false, the consistency button is not rendered. */
  bookTypeFiction: boolean;
  isPro: boolean;
  /** Pro voice memo to chapter. */
  onOpenVoiceMemo: () => void;
  /** Chapter has a draft (or later) so analysis is meaningful. */
  chapterReadyForConsistency: boolean;
  consistencyLoading: boolean;
  onCheckConsistency: () => void;
  /** Story-chat sidebar toggle. */
  chatOpen: boolean;
  onToggleChat: () => void;
};

function ToolbarBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "h-9 min-w-9 px-2 text-editorial-muted hover:text-gold",
        active && "bg-gold/15 text-gold",
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function HeadingPicker({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const currentLevel = editor
    ? [1, 2, 3, 4].find((l) => editor.isActive("heading", { level: l })) ?? 0
    : 0;
  const value = currentLevel === 0 ? "p" : `h${currentLevel}`;
  return (
    <select
      className="h-9 rounded-md border border-border/60 bg-editorial-bg/70 px-2 text-xs text-editorial-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
      disabled={disabled || !editor}
      value={value}
      onChange={(e) => {
        if (!editor) return;
        const v = e.target.value;
        if (v === "p") {
          editor.chain().focus().setParagraph().run();
        } else {
          const level = Number(v.slice(1)) as 1 | 2 | 3 | 4;
          editor.chain().focus().setHeading({ level }).run();
        }
      }}
      title="Paragraph / heading level"
      aria-label="Paragraph or heading level"
    >
      <option value="p">Paragraph</option>
      <option value="h1">Heading 1</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="h4">Heading 4</option>
    </select>
  );
}

export function EditorToolbar({
  editor,
  toolbarDisabled,
  aiBusy,
  findOpen,
  spellcheckOn,
  zenMode,
  focusMode,
  typewriterMode,
  expandPromptOpen,
  rewritePromptOpen,
  versionHistoryHref,
  isMacPlatform,
  onRegenerate,
  onOpenExpand,
  onOpenRewrite,
  onShorten,
  onProofread,
  onContinue,
  onTone,
  onToggleFind,
  onToggleSpellcheck,
  onToggleZen,
  onToggleFocus,
  onToggleTypewriter,
  onShowCheatsheet,
  onOpenLink,
  bookTypeFiction,
  isPro,
  onOpenVoiceMemo,
  chapterReadyForConsistency,
  consistencyLoading,
  onCheckConsistency,
  chatOpen,
  onToggleChat,
}: ToolbarProps) {
  const focusShortcut = isMacPlatform ? "⌘." : "Ctrl+.";
  const voiceMemoDisabled = toolbarDisabled || !isPro;
  const voiceMemoTitle = !isPro
    ? "Pro feature — use voice to draft from dictation"
    : "Record voice notes and draft this chapter (Pro)";
  const consistencyDisabled =
    !isPro || !chapterReadyForConsistency || toolbarDisabled || consistencyLoading;
  const consistencyTitle = !isPro
    ? "Pro feature — upgrade to check consistency"
    : !chapterReadyForConsistency
      ? "Available once this chapter is in draft (or later)"
      : "Check character and story continuity (fiction)";
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;
  return (
    <div className="flex flex-wrap items-center gap-1 bg-transparent px-4 py-2">
      <ToolbarBtn
        disabled={toolbarDisabled || !editor || !canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
        label="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor || !canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
        label="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <HeadingPicker editor={editor} disabled={toolbarDisabled} />
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("bold")}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        label="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("italic")}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        label="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("underline")}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        label="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("strike")}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("code")}
        onClick={() => editor?.chain().focus().toggleCode().run()}
        label="Inline code (Ctrl+E)"
      >
        <Code className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("bulletList")}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        label="Bulleted list"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("orderedList")}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("blockquote")}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        label="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("codeBlock")}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        label="Code block"
      >
        <Code2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("link")}
        onClick={onOpenLink}
        label="Add / edit link (Ctrl+K)"
      >
        <Link2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        label="Scene break (* * *)"
      >
        <span className="font-serif text-sm tracking-[0.3em]">***</span>
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onRegenerate}
        title="Regenerate this chapter from scratch"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Regenerate</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onContinue}
        title="Continue writing from the cursor position"
      >
        {aiBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <PenLine className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Continue</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={voiceMemoDisabled}
        title={voiceMemoTitle}
        onClick={onOpenVoiceMemo}
        aria-label="Voice memo to chapter"
      >
        <Mic className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Voice</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1 text-editorial-muted hover:text-gold",
          expandPromptOpen && "bg-gold/15 text-gold",
        )}
        disabled={toolbarDisabled}
        onClick={onOpenExpand}
        aria-expanded={expandPromptOpen}
        title="Expand selection with optional custom instruction"
      >
        <Expand className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Expand</span>
        {expandPromptOpen ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1 text-editorial-muted hover:text-gold",
          rewritePromptOpen && "bg-gold/15 text-gold",
        )}
        disabled={toolbarDisabled}
        onClick={onOpenRewrite}
        aria-expanded={rewritePromptOpen}
        title="Rewrite selection with a custom instruction"
      >
        <Wand2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Rewrite</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onShorten}
        title="Shorten selection (~30% tighter)"
      >
        <span className="hidden sm:inline">Shorten</span>
        <span className="sm:hidden">−</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onProofread}
        title="Proofread selection (grammar & spelling only)"
      >
        <SpellCheck2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Proofread</span>
      </Button>
      {bookTypeFiction ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          disabled={consistencyDisabled}
          title={consistencyTitle}
          aria-label="Check consistency"
          onClick={onCheckConsistency}
        >
          {consistencyLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Shield className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden sm:inline">Check consistency</span>
        </Button>
      ) : null}
      <label className="flex items-center gap-1 text-xs text-editorial-muted">
        <span className="hidden sm:inline">Tone</span>
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          disabled={toolbarDisabled}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as "" | AssistToneOption;
            e.target.value = "";
            if (!v) return;
            onTone(v);
          }}
        >
          <option value="">Change tone…</option>
          <option value="formal">More formal</option>
          <option value="casual">More casual</option>
          <option value="dramatic">More dramatic</option>
        </select>
      </label>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={chatOpen}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            chatOpen && "bg-gold/15 text-gold",
          )}
          title={
            chatOpen
              ? "Close story chat"
              : "Ask about this chapter, brainstorm, or @mention codex entries"
          }
          aria-label="Toggle story chat panel"
          onClick={onToggleChat}
        >
          <MessageSquareText className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Chat</span>
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          title="Chapter version history"
        >
          <Link href={versionHistoryHref}>
            <History className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Version history</span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor}
          aria-pressed={findOpen}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            findOpen && "bg-gold/15 text-gold",
          )}
          title="Find and replace (Ctrl+F)"
          onClick={onToggleFind}
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Find</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={spellcheckOn}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            spellcheckOn && "bg-gold/15 text-gold",
          )}
          title={`Spell check ${spellcheckOn ? "on" : "off"}`}
          onClick={onToggleSpellcheck}
        >
          <Type className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">
            Spell check {spellcheckOn ? "on" : "off"}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={typewriterMode}
          aria-label="Typewriter mode (keeps cursor centered)"
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            typewriterMode && "bg-gold/15 text-gold",
          )}
          title="Typewriter mode (keeps cursor centered)"
          onClick={onToggleTypewriter}
        >
          <AlignCenterVertical className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Typewriter</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={focusMode}
          aria-label={`Distraction-free focus mode (${focusShortcut})`}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            focusMode && "bg-gold/15 text-gold",
          )}
          title={
            focusMode
              ? `Exit focus mode (Esc)`
              : `Distraction-free focus mode (${focusShortcut})`
          }
          onClick={onToggleFocus}
        >
          <Maximize className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Focus mode</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={zenMode}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            zenMode && "bg-gold/15 text-gold",
          )}
          title={zenMode ? "Exit zen mode (Esc)" : "Zen mode (hide sidebars)"}
          onClick={onToggleZen}
        >
          {zenMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden lg:inline">{zenMode ? "Exit zen" : "Zen"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          title="Keyboard shortcuts (?)"
          onClick={onShowCheatsheet}
        >
          <Keyboard className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
~~~


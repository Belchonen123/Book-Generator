import type { InlineAssistAction } from "@/lib/utils/schemas";

/**
 * Slash-command palette item.
 *
 * Two kinds of items coexist in the palette:
 *
 *  - `inline-assist` — short, one-shot AI actions that rewrite or
 *    insert text around the current paragraph (rewrite, expand, next
 *    sentences, describe, dialogue, summary). Dispatched to
 *    `/api/ai/inline-assist` and rendered as plain prose.
 *
 *  - `scene-beat` — inserts a SceneBeat block node (Prompt 9) into
 *    the editor. No API call is made from the slash handler itself;
 *    the SceneBeat node view owns the "generate" flow. An optional
 *    `defaultBeatText` lets the `/continue` variant drop in a
 *    pre-filled starter ("Continue the scene.").
 *
 * The host handler (`runSlashCommand` in `ChapterEditor.tsx`) branches
 * on `item.kind` to pick the code path. Adding a new kind is a
 * matter of extending the union here, adding the branch in
 * `runSlashCommand`, and shipping a new row at the bottom of
 * `SLASH_COMMAND_ITEMS`.
 */
export type SlashCommandItem =
  | {
      kind: "inline-assist";
      action: InlineAssistAction;
      /** Command word that appears after `/` (used for filter + display). */
      trigger: string;
      description: string;
    }
  | {
      kind: "scene-beat";
      /** Command word that appears after `/`. */
      trigger: string;
      description: string;
      /** Pre-populated beat text — used by `/continue`. */
      defaultBeatText?: string;
    };

/** Stable key for React lists — the trigger is unique across the palette. */
export function slashItemKey(item: SlashCommandItem): string {
  return `${item.kind}:${item.trigger}`;
}

/**
 * Master list of slash-command items. Order here defines the menu
 * order; the `trigger` must be unique (case-insensitive) because the
 * filter is a case-insensitive `startsWith` match.
 *
 * Order rationale: we lead with the SceneBeat items (Prompt 9's
 * flagship UX) so `/b` + Enter lands on `/beat` as the first match.
 * Inline-assist actions sit below as quick one-shot rewrites.
 */
export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    kind: "scene-beat",
    trigger: "beat",
    description:
      "Insert a scene-beat block — describe what happens, AI expands to prose.",
  },
  {
    kind: "scene-beat",
    trigger: "continue",
    description: "Continue the scene — AI expands the next ~400 words of prose.",
    defaultBeatText: "Continue the scene.",
  },
  {
    kind: "inline-assist",
    action: "rewrite",
    trigger: "rewrite",
    description: "Rewrite this paragraph more clearly",
  },
  {
    kind: "inline-assist",
    action: "expand",
    trigger: "expand",
    description: "Add depth: sensory detail + interiority",
  },
  {
    kind: "inline-assist",
    action: "beat",
    trigger: "next",
    description: "Generate the next 2–3 sentences",
  },
  {
    kind: "inline-assist",
    action: "describe",
    trigger: "describe",
    description: "Add a 1–2 sentence description",
  },
  {
    kind: "inline-assist",
    action: "dialogue",
    trigger: "dialogue",
    description: "Rewrite as dialogue exchange",
  },
  {
    kind: "inline-assist",
    action: "summary",
    trigger: "summary",
    description: "Replace with a 1-sentence summary",
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMAND_ITEMS;
  return SLASH_COMMAND_ITEMS.filter((item) => item.trigger.startsWith(q));
}

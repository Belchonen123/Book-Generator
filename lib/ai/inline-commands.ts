/**
 * Registry of preset **inline AI commands** that the bubble menu surfaces on
 * a text selection. Each entry pairs a human-facing label/description with the
 * exact prompt fragment appended to the user message in
 * `app/api/ai/inline-command/route.ts`.
 *
 * This file is intentionally the single editable surface for the command set
 * so a future "customizable templates" feature (Prompt 6) can swap the
 * built-in fragments for user-authored ones without touching the API route or
 * the editor UI.
 */

/**
 * The literal line the model is instructed to emit between streamed
 * alternatives. Shared between the API route (emits it via the prompt) and
 * the client panel (splits chunks on it as they arrive).
 *
 * Exported as a constant so a future template/prompt refactor can't silently
 * drift the two sides out of sync.
 */
export const ALTERNATIVE_DELIMITER = "---ALTERNATIVE---";

export const INLINE_COMMAND_IDS = [
  "rewrite",
  "expand",
  "shorten",
  "describe",
  "show-dont-tell",
  "custom",
] as const;

export type InlineCommandId = (typeof INLINE_COMMAND_IDS)[number];

export type InlineCommandDefinition = {
  /** Short button label shown in the bubble menu. */
  label: string;
  /** One-line tooltip / aria-description — what the command will do. */
  description: string;
  /**
   * The `${commandPromptFor(...)}` fragment inserted into the user message.
   * Written as a self-contained instruction the model can execute without
   * extra scaffolding. `custom` defers to the author-provided instruction and
   * has an empty prompt fragment; see {@link commandPromptFor}.
   */
  promptFragment: string;
};

export const INLINE_COMMANDS: Record<InlineCommandId, InlineCommandDefinition> = {
  rewrite: {
    label: "Rewrite",
    description: "Same meaning, different wording and sentence rhythm.",
    promptFragment:
      "Rewrite this passage in the same voice but with different wording and sentence structure.",
  },
  expand: {
    label: "Expand",
    description: "Roughly 2x length with sensory detail and beat-level pacing.",
    promptFragment:
      "Expand this passage to roughly 2x its current length, adding sensory detail, internal thought, or beat-level pacing. Do not introduce new plot events.",
  },
  shorten: {
    label: "Shorten",
    description: "Tighten to ~60%. Preserve every plot beat and line of dialogue.",
    promptFragment:
      "Tighten this passage to roughly 60% of its current length. Preserve every plot beat and every line of dialogue. Cut filler, redundant description, and throat-clearing.",
  },
  describe: {
    label: "Describe",
    description: "Add concrete sensory detail — objects, smells, textures, sounds.",
    promptFragment:
      "Add concrete sensory detail to this passage. Specific objects, smells, textures, sounds. Avoid generic atmosphere.",
  },
  "show-dont-tell": {
    label: "Show Don't Tell",
    description: "Replace stated emotions with actions, dialogue, and sensory cues.",
    promptFragment:
      "Rewrite this passage to show rather than tell. Replace stated emotions and conclusions with actions, dialogue, and sensory observation that imply them.",
  },
  custom: {
    label: "Custom",
    description: "Your own instruction.",
    promptFragment: "",
  },
};

/**
 * Resolves the actual task fragment the API sends to the model. For built-in
 * commands this is the preset sentence in {@link INLINE_COMMANDS}. For
 * `custom` it's the author's free-form instruction (already sanitized and
 * length-clamped by the caller). Falls back to `rewrite` if an unknown id is
 * supplied — safer than 500-ing the request on a client/server skew.
 */
export function commandPromptFor(
  commandId: InlineCommandId,
  customInstruction?: string | null,
): string {
  if (commandId === "custom") {
    const trimmed = customInstruction?.trim();
    if (!trimmed) {
      /* Guarded by zod on the server already; this keeps the helper pure
       * and non-throwing for unit tests and any future reuse. */
      return INLINE_COMMANDS.rewrite.promptFragment;
    }
    return trimmed;
  }
  return (INLINE_COMMANDS[commandId] ?? INLINE_COMMANDS.rewrite).promptFragment;
}

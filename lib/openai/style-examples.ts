/**
 * Style Examples — per-project prompt-injection helper.
 *
 * Authors paste 500–2,000 words of sample prose into `books.style_examples`
 * (and an optional short `books.style_instructions` note) on the Voice & Style
 * section of the project. Every prose-generating AI route appends the block
 * produced by `buildStyleExamplesBlock` to its system prompt so the model
 * matches rhythm, vocabulary, and register instead of defaulting to its
 * training-data mean.
 *
 * IMPORTANT:
 *  - Only prose-generating routes should inject (generate-chapter,
 *    expand-outline, chapter-assist, refine-idea, generate-outline,
 *    voice-to-chapter, inline-assist, rewrite-transitions,
 *    polish-replacements).
 *  - Metadata/cover routes (generate-cover, generate-book-metadata,
 *    generate-subtitle, generate-back-cover, generate-about-author) do NOT
 *    inject — style examples waste tokens there and can derail the JSON/prompt
 *    formats those routes need.
 *  - When both fields are empty/unset, `buildStyleExamplesBlock` returns an
 *    empty string; callers can safely append it unconditionally.
 */
import { sanitizeText } from "@/lib/utils/sanitize";

/** Matches the CHECK constraint in migration 029_book_style_examples.sql. */
const MAX_STYLE_EXAMPLES_CHARS = 20_000;
const MAX_STYLE_INSTRUCTIONS_CHARS = 1_000;

/**
 * Normalize whatever the DB row gave us into a trimmed, length-capped string.
 * We cap here (in addition to the column-level CHECK) so a legacy row that
 * predates the migration — or an unusually verbose instruction — can't blow
 * up a single prompt budget.
 */
function normalizeField(
  value: string | null | undefined,
  maxChars: number,
): string {
  if (!value) {
    return "";
  }
  const trimmed = sanitizeText(value.trim());
  if (trimmed.length === 0) {
    return "";
  }
  if (trimmed.length > maxChars) {
    return trimmed.slice(0, maxChars);
  }
  return trimmed;
}

export type StyleExamplesInput = {
  style_examples: string | null | undefined;
  style_instructions: string | null | undefined;
};

/**
 * Build the `<style_examples>` / `<style_instructions>` block that gets
 * appended to a prose route's system prompt.
 *
 * Returns an empty string when `style_examples` is missing; style_instructions
 * alone (without a sample) is not enough signal to be worth the tokens, so we
 * only emit anything once the sample is present.
 *
 * The leading newlines make it safe to string-concat onto any existing
 * system prompt without worrying about the caller's trailing whitespace.
 */
export function buildStyleExamplesBlock(input: StyleExamplesInput): string {
  const examples = normalizeField(input.style_examples, MAX_STYLE_EXAMPLES_CHARS);
  if (examples.length === 0) {
    return "";
  }

  const instructions = normalizeField(
    input.style_instructions,
    MAX_STYLE_INSTRUCTIONS_CHARS,
  );
  const instructionsSuffix = instructions.length > 0 ? ` ${instructions}` : "";

  return (
    `\n\n<style_examples>\n${examples}\n</style_examples>\n\n` +
    `<style_instructions>\n` +
    `Match the voice, sentence rhythm, and vocabulary register of the ` +
    `style_examples above. Do not copy phrases; emulate the feel.` +
    `${instructionsSuffix}\n` +
    `</style_instructions>`
  );
}

/**
 * Convenience helper for routes that have already built a system prompt and
 * want to splice the style block on without conditional plumbing. When there
 * is no style anchor we return the input unchanged.
 */
export function withStyleExamples(
  systemPrompt: string,
  input: StyleExamplesInput,
): string {
  const block = buildStyleExamplesBlock(input);
  return block.length > 0 ? `${systemPrompt}${block}` : systemPrompt;
}

/**
 * Column list to select alongside existing book fields in any prose route.
 * Centralized so an ALTER TABLE later only touches one import site.
 */
export const STYLE_EXAMPLES_SELECT_COLUMNS =
  "style_examples, style_instructions" as const;

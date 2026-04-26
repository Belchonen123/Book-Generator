import { logServerError } from "@/lib/utils/errors";
import type { Json } from "@/types/database.types";

export const CHARACTER_BIBLE_TOKEN_BUDGET = 3000;
export const CHARACTER_BIBLE_CHAR_BUDGET = CHARACTER_BIBLE_TOKEN_BUDGET * 4;

const TRIM_NOTE =
  "\n\n[Character bible trimmed for context budget. See /codex for full detail.]";
const TRUNC_NOTE =
  "\n\n[Character bible truncated at context budget. See /codex for full detail.]";

export function trimCharacterBible(text: string): string {
  if (text.length <= CHARACTER_BIBLE_CHAR_BUDGET) return text;
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === "object" &&
      "characters" in parsed &&
      Array.isArray((parsed as { characters: unknown }).characters)
    ) {
      const p = parsed as {
        characters: Record<string, unknown>[];
        [key: string]: unknown;
      };
      const trimmedChars = p.characters.map((c) => {
        const out = { ...c };
        delete out.contradiction;
        delete out.nervous_habit;
        delete out.relationships;
        return out;
      });
      const retry = JSON.stringify(
        { ...p, characters: trimmedChars },
        null,
        2,
      );
      if (retry.length <= CHARACTER_BIBLE_CHAR_BUDGET) {
        return retry + TRIM_NOTE;
      }
      if (retry.length < text.length) {
        return (
          retry.slice(0, CHARACTER_BIBLE_CHAR_BUDGET) + TRUNC_NOTE
        );
      }
    }
  } catch {
    /* not valid JSON, fall through */
  }
  return text.slice(0, CHARACTER_BIBLE_CHAR_BUDGET) + TRUNC_NOTE;
}

/**
 * Serialize book.character_bible for chapter prompts, capped so huge bibles
 * do not starve the rest of the context.
 */
export function characterBibleToPromptText(
  value: Json | null | undefined,
  options?: { bookId?: string },
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length === 0) return null;
    return runTrim(t, options?.bookId);
  }
  try {
    const serialized = JSON.stringify(value, null, 2);
    return runTrim(serialized, options?.bookId);
  } catch {
    return null;
  }
}

function runTrim(text: string, bookId: string | undefined): string {
  if (text.length <= CHARACTER_BIBLE_CHAR_BUDGET) return text;
  const originalLength = text.length;
  const out = trimCharacterBible(text);
  const trimmedLength = out.length;
  logServerError("character-bible-trim", "trim", {
    severity: "info",
    details: {
      bookId: bookId ?? "unknown",
      originalLength,
      trimmedLength,
    },
  });
  return out;
}

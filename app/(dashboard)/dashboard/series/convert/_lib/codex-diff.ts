import type { CodexEntryTypeDb } from "@/types/database.types";

/* -------------------------------------------------------------------------- */
/*  Pure helpers for the "Convert standalone → series" wizard.                */
/*                                                                            */
/*  These live outside `actions.ts` (which is a "use server" module) so       */
/*  unit tests can import them directly without crossing the action boundary  */
/*  or mocking Supabase.                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Lowercase + collapse whitespace; used to group "Elena" / "Elena  " /
 * "ELENA" into the same merge bucket.
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * A single codex instance pulled from one of the books being converted.
 * Kept narrow — only the fields the diff compares.
 */
export type ConversionCodexInstance = {
  entryId: string;
  bookId: string;
  bookTitle: string;
  summary: string | null;
  description_md: string | null;
  aliases: string[];
  entryType: CodexEntryTypeDb;
  custom_fields: Record<string, unknown>;
};

export type ConversionCodexDiff = {
  summary: boolean;
  description_md: boolean;
  aliases: boolean;
  customFields: boolean;
};

/**
 * Returns per-field booleans indicating whether the given instances
 * disagree on the value. A single-instance input is always "no diffs"
 * (nothing to disagree with).
 *
 * Comparison is deep via JSON.stringify so array / object shape matters;
 * string fields are trimmed so whitespace doesn't create a false diff.
 */
export function diffForGroup(
  instances: ConversionCodexInstance[],
): ConversionCodexDiff {
  if (instances.length <= 1) {
    return {
      summary: false,
      description_md: false,
      aliases: false,
      customFields: false,
    };
  }
  const first = instances[0]!;
  function anyDifferent(sel: (i: ConversionCodexInstance) => unknown): boolean {
    return instances.some(
      (i) => JSON.stringify(sel(i)) !== JSON.stringify(sel(first)),
    );
  }
  return {
    summary: anyDifferent((i) => (i.summary ?? "").trim()),
    description_md: anyDifferent((i) => (i.description_md ?? "").trim()),
    aliases: anyDifferent((i) => [...i.aliases].sort()),
    customFields: anyDifferent((i) => i.custom_fields ?? {}),
  };
}

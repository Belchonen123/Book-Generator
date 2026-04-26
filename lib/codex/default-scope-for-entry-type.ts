import type { CodexEntryScopeDb, CodexEntryTypeDb } from "@/types/database.types";

/** Default scope for a "new entry" given the entry type and whether the book
 * is part of a series, per spec 16.3: recurring-ness fields default to
 * series scope when available; one-off / per-installment fields default to
 * book scope. Callers respect the user's explicit override if one is passed. */
export function defaultScopeForEntryType(
  entryType: CodexEntryTypeDb,
  bookInSeries: boolean,
): Extract<CodexEntryScopeDb, "project" | "series"> {
  if (!bookInSeries) return "project";
  if (entryType === "character" || entryType === "location" || entryType === "faction") {
    return "series";
  }
  return "project";
}

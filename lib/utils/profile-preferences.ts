import type { Json } from "@/types/database.types";

const ASK_REWRITE_ON_OUTLINE_KEY = "askRewriteOnOutlineEdit" as const;
const AUTO_SLOP_SCAN_KEY = "autoSlopScanGeneratedChapters" as const;

/**
 * `true` when the author wants a toast after a substantive outline edit (default).
 */
export function getAskRewriteOnOutlineEdit(
  preferences: Json | null | undefined,
): boolean {
  if (
    preferences == null ||
    typeof preferences !== "object" ||
    Array.isArray(preferences)
  ) {
    return true;
  }
  const v = (preferences as Record<string, unknown>)[ASK_REWRITE_ON_OUTLINE_KEY];
  if (typeof v === "boolean") {
    return v;
  }
  return true;
}

/**
 * `true` when a regex slop pass should run after each successful chapter
 * generation in the editor (default).
 */
export function getAutoSlopScan(
  preferences: Json | null | undefined,
): boolean {
  if (
    preferences == null ||
    typeof preferences !== "object" ||
    Array.isArray(preferences)
  ) {
    return true;
  }
  const v = (preferences as Record<string, unknown>)[AUTO_SLOP_SCAN_KEY];
  if (typeof v === "boolean") {
    return v;
  }
  return true;
}

export { ASK_REWRITE_ON_OUTLINE_KEY, AUTO_SLOP_SCAN_KEY };

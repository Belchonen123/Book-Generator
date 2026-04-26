/**
 * Levenshtein distance between two strings (for outline "how much did this change" checks).
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const cur = row[j]!;
      if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
        row[j] = prev;
      } else {
        row[j] = 1 + Math.min(prev, cur, row[j - 1]!);
      }
      prev = cur;
    }
  }
  return row[n]!;
}

const OUTLINE_LEV_MAX_LEN = 20_000;

/**
 * True when the edit distance between trimmed outlines exceeds `minDistance`
 * (used to avoid toasting on tiny punctuation edits).
 */
export function outlineTextChangeExceeds(
  before: string,
  after: string,
  minDistance: number,
): boolean {
  if (before === after) return false;
  const sa = before.length > OUTLINE_LEV_MAX_LEN
    ? before.slice(0, OUTLINE_LEV_MAX_LEN)
    : before;
  const sb = after.length > OUTLINE_LEV_MAX_LEN
    ? after.slice(0, OUTLINE_LEV_MAX_LEN)
    : after;
  return levenshtein(sa, sb) > minDistance;
}

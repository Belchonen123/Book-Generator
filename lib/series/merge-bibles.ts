import type { Json } from "@/types/database.types";

/**
 * Merges book-level character bible into series-wide storage.
 * - Objects: deep-merge; keys from the book value override / extend the series.
 * - Other types: book wins.
 */
export function mergeCharacterBibleIntoSeries(
  series: Json,
  book: Json | null | undefined,
): Json {
  if (book == null) return series ?? {};
  if (typeof book !== "object" || book === null || Array.isArray(book)) {
    return book as Json;
  }
  const base = series && typeof series === "object" && !Array.isArray(series) ? series : {};
  return deepMergeJson(base as Record<string, unknown>, book as Record<string, unknown>) as unknown as Json;
}

function deepMergeJson(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      out[k] !== null &&
      typeof out[k] === "object" &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMergeJson(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

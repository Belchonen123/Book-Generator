import { format as formatDateFns, type Locale } from "date-fns";

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

/**
 * e.g. 12400 → "12,400 words"
 */
export function formatWordCount(
  count: number,
  options?: { singular?: string; plural?: string },
): string {
  const plural = options?.plural ?? "words";
  const singular = options?.singular ?? "word";
  const label = count === 1 ? singular : plural;
  const formatted = Math.max(0, Math.floor(count)).toLocaleString("en-US");
  return `${formatted} ${label}`;
}

/**
 * Locale-aware date string (default pattern: Apr 19, 2026).
 */
export function formatDate(
  date: Date | string | number,
  pattern = "PP",
  locale?: Locale,
): string {
  return formatDateFns(toDate(date), pattern, locale ? { locale } : undefined);
}

/**
 * Shorten long strings with an ellipsis; does not break on words unless trim is used.
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis = "…",
): string {
  if (maxLength <= 0) {
    return ellipsis.slice(0, maxLength) || "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  const budget = Math.max(0, maxLength - ellipsis.length);
  const slice = text.slice(0, budget).trimEnd();
  return `${slice}${ellipsis}`;
}

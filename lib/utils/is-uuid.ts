/** Loose UUID v4-style check (8-4-4-4-12 hex). Matches Zod `.uuid()` expectations. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value.trim());
}

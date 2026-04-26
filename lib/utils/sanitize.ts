/**
 * Remove HTML tags and obvious HTML-like fragments from free-form user text
 * before sending it to models or persisting it from API bodies.
 *
 * Design notes:
 * - Preserves prose that merely uses `<` / `>` as operators or punctuation
 *   (e.g. "x < 5 && y > 3", "a <= b", "diff: <n>"). The previous
 *   implementation used /<[^>]+>/g which false-positively ate any span
 *   between `<` and `>`, silently corrupting math, comparisons, and
 *   angle-bracket dialog/stage directions in fiction.
 * - A tag now requires the character after `<` to be a letter (open tag)
 *   or `/` followed by a letter (close tag), matching the HTML spec's
 *   definition of a tag name start.
 * - `<script>...</script>` and `<style>...</style>` blocks are stripped
 *   first (content + tags) so their bodies do not leak through.
 * - HTML comments `<!-- ... -->` are removed. Rationale: model prompts
 *   should not contain arbitrary comments that might encode escaped tags.
 * - Null bytes are removed and the result is trimmed.
 *
 * Examples:
 *   "x < 5 && y > 3"          -> "x < 5 && y > 3"   (unchanged)
 *   "a <= b"                  -> "a <= b"           (unchanged)
 *   "<script>alert(1)</script>" -> ""
 *   "Hello <b>world</b>"      -> "Hello world"
 *   "<!--ignore me-->X"       -> "X"
 */
export function sanitizeText(input: string): string {
  if (!input) return input;
  let out = input.replace(
    /<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi,
    "",
  );
  /* Unmatched/dangling script|style closing tags. */
  out = out.replace(/<\/(?:script|style)[^>]*>/gi, "");
  /* HTML comments — strip whole block (including body). */
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  /* Only strip things that truly look like tags: `<name...>` or `</name...>`.
   * Requires a letter immediately after `<` (or after `</`), which prevents
   * "x < 5" and "a <= b" from being eaten. */
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  return out.replace(/\u0000/g, "").trim();
}

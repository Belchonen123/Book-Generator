/**
 * Bracketed-directive parser used by the SceneBeat TipTap node.
 *
 * Authors write beat text in plain English and can wrap short stage
 * directions in [square brackets], e.g.:
 *
 *   "Marcus confronts Elena at the door. [slow down] He can see her
 *    hesitating. [describe the smell of the hallway — stale wool]"
 *
 * The node view renders bracketed spans in a muted accent colour so the
 * author can visually separate *what happens* from *how to render it*.
 * The backend passes the full beat text (brackets included) through to
 * the model; the prompt instructs the model to implement the directives
 * without echoing the brackets.
 *
 * Only matches a SINGLE LEVEL of brackets and only matches `[ ... ]`
 * pairs that contain at least one non-whitespace character. Unmatched
 * `[` or `]` characters are treated as literal text — that way a typo
 * or a bracket inside an aside ("[...]") doesn't paint everything after
 * it the directive colour. Nested brackets (rare) are treated as a
 * single directive that ends at the first `]`.
 *
 * Exported as a pure function so it can be unit tested without pulling
 * in the TipTap / React dependencies.
 */

export type SceneBeatSegment =
  | { kind: "text"; text: string }
  | { kind: "directive"; text: string };

/**
 * Split `beatText` into an ordered list of text + directive segments.
 *
 * Properties:
 *   - Concatenating `segment.text` for every segment (wrapping directive
 *     segments back in `[]`) yields the exact original input. No bytes
 *     lost, no whitespace shifted.
 *   - Returns an empty array for an empty string (never `[{text:''}]`).
 *   - Unmatched brackets become part of the surrounding text segment.
 */
export function parseSceneBeatSegments(beatText: string): SceneBeatSegment[] {
  if (!beatText) return [];

  const segments: SceneBeatSegment[] = [];
  let buffer = "";
  let i = 0;
  const n = beatText.length;

  while (i < n) {
    const ch = beatText[i];
    if (ch !== "[") {
      buffer += ch;
      i += 1;
      continue;
    }

    /* Found a `[`. Scan forward to the next `]`. If none exists, treat
     * the `[` as literal text and bail out of directive matching. */
    const closeIdx = beatText.indexOf("]", i + 1);
    if (closeIdx === -1) {
      buffer += beatText.slice(i);
      i = n;
      break;
    }

    const inner = beatText.slice(i + 1, closeIdx);
    /* Require at least one non-whitespace character between the brackets.
     * `[]` and `[   ]` render as literal text — treating them as
     * directives would paint stray typos accent-coloured. */
    if (inner.trim().length === 0) {
      buffer += beatText.slice(i, closeIdx + 1);
      i = closeIdx + 1;
      continue;
    }

    if (buffer.length > 0) {
      segments.push({ kind: "text", text: buffer });
      buffer = "";
    }
    segments.push({ kind: "directive", text: inner });
    i = closeIdx + 1;
  }

  if (buffer.length > 0) {
    segments.push({ kind: "text", text: buffer });
  }
  return segments;
}

/**
 * Count the number of bracketed directives in a beat. Cheap enough to
 * call on every keystroke for the "n directive(s)" hint under the
 * textarea without parsing to segments.
 */
export function countSceneBeatDirectives(beatText: string): number {
  if (!beatText) return 0;
  let count = 0;
  let i = 0;
  const n = beatText.length;
  while (i < n) {
    if (beatText[i] !== "[") {
      i += 1;
      continue;
    }
    const closeIdx = beatText.indexOf("]", i + 1);
    if (closeIdx === -1) break;
    const inner = beatText.slice(i + 1, closeIdx);
    if (inner.trim().length > 0) count += 1;
    i = closeIdx + 1;
  }
  return count;
}

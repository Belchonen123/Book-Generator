/**
 * Recover JSON when the model wraps it in ``` fences, adds a short preamble, or
 * the root object is nested under a different key.
 */

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

/** Best-effort top-level object slice by brace depth (no string escape handling). */
function extractBalancedObject(text: string): string | null {
  const t = text.trim();
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let j = start; j < t.length; j++) {
    const c = t[j];
    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        return t.slice(start, j + 1);
      }
    }
  }
  return null;
}

/**
 * Tries: raw parse → strip fences → first balanced `{...}` object.
 * Returns `null` if no JSON object can be read.
 */
export function parseJsonObjectLenient(text: string): unknown | null {
  const t = text.trim();
  const candidates = [t, stripCodeFence(t)];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c) as unknown;
    } catch {
      /* try next */
    }
  }
  for (const c of candidates) {
    const ex = extractBalancedObject(c);
    if (ex) {
      try {
        return JSON.parse(ex) as unknown;
      } catch {
        /* */
      }
    }
  }
  return null;
}

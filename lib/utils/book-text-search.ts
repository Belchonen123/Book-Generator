const CONTEXT = 30;

function escapeRegExp(s: string): string {
  return s.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
}

export type BookTextSearchOptions = {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
};

function buildMatchRegex(
  search: string,
  opts: BookTextSearchOptions,
): RegExp | null {
  if (opts.useRegex) {
    try {
      const base = opts.caseSensitive ? "g" : "gi";
      return new RegExp(search, base);
    } catch {
      return null;
    }
  }
  if (!search) return null;
  const body = opts.wholeWord
    ? `\\b${escapeRegExp(search)}\\b`
    : escapeRegExp(search);
  return new RegExp(body, opts.caseSensitive ? "g" : "gi");
}

export function buildAllMatchesInText(
  text: string,
  search: string,
  opts: BookTextSearchOptions,
): { start: number; end: number; matchText: string }[] {
  if (opts.useRegex && !search.trim()) {
    return [];
  }
  const re = buildMatchRegex(search, opts);
  if (!re) return [];
  const out: { start: number; end: number; matchText: string }[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  const globalRe = re.global
    ? re
    : new RegExp(
        re.source,
        re.flags.includes("g") ? re.flags : re.flags + "g",
      );
  while ((m = globalRe.exec(text)) !== null) {
    if (m[0] === undefined || m.index === undefined) break;
    out.push({ start: m.index, end: m.index + m[0].length, matchText: m[0] });
    if (m[0].length === 0) globalRe.lastIndex += 1;
  }
  return out;
}

export function contextAround(
  text: string,
  start: number,
  end: number,
  maxLen: number = CONTEXT * 2,
): string {
  const left = Math.max(0, start - CONTEXT);
  const right = Math.min(text.length, end + CONTEXT);
  let s = (left > 0 ? "…" : "") + text.slice(left, right) + (right < text.length ? "…" : "");
  if (s.length > maxLen) {
    s = `${s.slice(0, maxLen)}…`;
  }
  return s;
}

/**
 * Global replace in one string, mirroring the search that produced the matches.
 */
export function applyTextReplace(
  text: string,
  search: string,
  replace: string,
  opts: BookTextSearchOptions,
): { next: string; count: number } {
  if (!search.trim() && !opts.useRegex) {
    return { next: text, count: 0 };
  }
  if (opts.useRegex && !search.trim()) {
    return { next: text, count: 0 };
  }
  const matches = buildAllMatchesInText(text, search, opts);
  if (matches.length === 0) {
    return { next: text, count: 0 };
  }
  const re = buildMatchRegex(search, opts);
  if (!re) return { next: text, count: 0 };
  const g = re.global
    ? re
    : new RegExp(re.source, re.flags + (re.flags.includes("g") ? "" : "g"));
  return { next: text.replace(g, replace), count: matches.length };
}

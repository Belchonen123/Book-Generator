/**
 * Name/alias matcher for codex entries.
 *
 * Each codex entry contributes a primary `name` plus zero or more `aliases`.
 * Given a plain-text blob (a chapter's prose, a slice of it, an outline item,
 * a user prompt, etc.) we need to find every substring that matches any of
 * those needles, with the following rules:
 *
 *  - Case-insensitive ("Faiga" matches "faiga")
 *  - Word boundaries on both sides — "Al" does NOT match "Albert". This is the
 *    critical bit that separates a naming system from a fuzzy matcher.
 *  - Needles shorter than 3 characters are IGNORED. Writers give characters
 *    nicknames like "M" or "C" all the time; left unguarded, those eat every
 *    instance of the letter "M" in the manuscript. (The spec allows a
 *    `"quoted"` escape hatch for short aliases; we don't ship that in v1 —
 *    authors can lengthen the alias or pick a longer one instead.)
 *  - Longest-match wins at a given position (so "Refueling Station Gamma-7"
 *    beats a separate "Gamma-7" alias on the same entry or a different one).
 *  - When two DIFFERENT entries have an identical needle, we attribute the
 *    match to the entry whose name (not alias) it is, falling back to
 *    whichever was registered first (caller controls order).
 *
 * Implementation is a simple-but-fast variant of Aho-Corasick: build a trie
 * keyed by lowercased codepoints, then walk the input once and at every end
 * position harvest matches whose preceding + following characters are
 * non-word. This is O(n) for typical chapter sizes and does not involve a
 * per-needle regex, which would be catastrophic at 50+ needles × 5k words.
 *
 * The matcher is DEPENDENCY-FREE so it can also run in the TipTap editor
 * (client) and the AI context builder (server) without pulling in anything
 * Node-specific.
 */

export type CodexMatchableEntry = {
  id: string;
  name: string;
  aliases: readonly string[];
};

export type CodexMatch = {
  entryId: string;
  matchedString: string;
  startIndex: number;
  /** Exclusive. `startIndex + matchedString.length`. */
  endIndex: number;
  /** true when the needle came from `entry.name` (false = alias). */
  isPrimaryName: boolean;
};

const MIN_NEEDLE_LENGTH = 3;

/**
 * Test whether a codepoint is "word-like" for our word-boundary rule.
 *
 * We treat ASCII letters/digits/underscore plus any codepoint above the
 * Basic Latin block (≥ 0x80) as word characters. The latter covers
 * accented Latin (`é`, `ü`), Cyrillic, Greek, Hebrew, etc. without needing
 * the `/u` regex flag (which the TS target-independent build chain rejects).
 *
 * The fallback is slightly over-inclusive — some Unicode punctuation in
 * the higher planes gets treated as "word" — but for our matcher that
 * means we err on the side of NOT matching, which is the safer failure
 * mode for an auto-underlining feature.
 */
function isWordChar(codepoint: number | undefined): boolean {
  if (codepoint === undefined) return false;
  if (codepoint >= 0x30 && codepoint <= 0x39) return true; /* 0-9 */
  if (codepoint >= 0x41 && codepoint <= 0x5a) return true; /* A-Z */
  if (codepoint >= 0x61 && codepoint <= 0x7a) return true; /* a-z */
  if (codepoint === 0x5f) return true; /* _ */
  return codepoint >= 0x80;
}

type TrieNode = {
  /** Lowercased codepoint → next node. Map so we don't allocate 65k slots. */
  next: Map<number, TrieNode>;
  /** Non-null on a terminal node; matches discovered at this position. */
  matches: Array<{
    entryId: string;
    needleLength: number;
    isPrimaryName: boolean;
    /** Insertion order so ties are resolved deterministically. */
    order: number;
  }> | null;
};

function createNode(): TrieNode {
  return { next: new Map(), matches: null };
}

function normalizeNeedle(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Prebuilt trie. Call `scanText` on it repeatedly — building is O(sum of
 * needle lengths) so the UI should memoize the returned object keyed on the
 * entry list identity.
 */
export type CodexMatcher = {
  scanText: (text: string) => CodexMatch[];
  /** Number of unique needles (after dedupe + length filter) actually indexed. */
  needleCount: number;
};

export function buildCodexMatcher(
  entries: readonly CodexMatchableEntry[],
): CodexMatcher {
  const root = createNode();
  let order = 0;
  let needleCount = 0;
  /* Dedupe per (entry, lowercased needle) so the same alias listed twice
   * doesn't inflate the match count. A needle can still be registered under
   * multiple entries — we keep all of them and the caller resolves the
   * collision. */
  const seen = new Set<string>();

  for (const entry of entries) {
    const needles: Array<{ value: string; isPrimaryName: boolean }> = [];
    if (entry.name) needles.push({ value: entry.name, isPrimaryName: true });
    for (const alias of entry.aliases) {
      if (alias) needles.push({ value: alias, isPrimaryName: false });
    }

    for (const { value, isPrimaryName } of needles) {
      const normalized = normalizeNeedle(value);
      if (normalized.length < MIN_NEEDLE_LENGTH) continue;

      const key = `${entry.id}\u0000${normalized}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let node = root;
      for (const cp of normalized) {
        const code = cp.codePointAt(0);
        if (code === undefined) continue;
        let child = node.next.get(code);
        if (!child) {
          child = createNode();
          node.next.set(code, child);
        }
        node = child;
      }
      if (!node.matches) node.matches = [];
      node.matches.push({
        entryId: entry.id,
        needleLength: normalized.length,
        isPrimaryName,
        order: order++,
      });
      needleCount += 1;
    }
  }

  return {
    needleCount,
    scanText(text: string): CodexMatch[] {
      if (!text || needleCount === 0) return [];

      const lower = text.toLowerCase();
      /* Codepoint-indexed iteration. `raw` is the original text so we can
       * return matchedString in its true casing. Positions are JS string
       * offsets (UTF-16 units) because that's what every editor + client
       * downstream expects. */
      const rawCodepoints = Array.from(text);
      const lowerCodepoints = Array.from(lower);
      /* Map back from codepoint index → UTF-16 string offset. */
      const offsetAt = new Array<number>(rawCodepoints.length + 1);
      let offset = 0;
      for (let i = 0; i < rawCodepoints.length; i++) {
        offsetAt[i] = offset;
        offset += rawCodepoints[i].length;
      }
      offsetAt[rawCodepoints.length] = offset;

      const cpCount = lowerCodepoints.length;
      /* At each (startCp, startOffset) we collect every match the trie sees
       * starting there, then pick the longest (ties broken by primary-name
       * first, then insertion order). A single result per start position
       * means we never return overlapping matches with the same start — the
       * dominant match preempts the others. */
      type Candidate = {
        entryId: string;
        matchedString: string;
        startIndex: number;
        endIndex: number;
        needleLength: number;
        isPrimaryName: boolean;
        order: number;
      };

      const results: CodexMatch[] = [];
      let cursorCp = 0;

      while (cursorCp < cpCount) {
        const startOffset = offsetAt[cursorCp];

        /* Left boundary check — skip fast when the position is mid-word. */
        const prevOffset = startOffset > 0 ? startOffset - 1 : -1;
        const prevCode =
          prevOffset >= 0 ? text.codePointAt(prevOffset) : undefined;
        if (isWordChar(prevCode)) {
          cursorCp += 1;
          continue;
        }

        let node: TrieNode | undefined = root;
        let walkCp = cursorCp;
        let best: Candidate | null = null;

        while (node && walkCp < cpCount) {
          const code = lowerCodepoints[walkCp].codePointAt(0);
          if (code === undefined) break;
          const next = node.next.get(code);
          if (!next) break;
          node = next;
          walkCp += 1;

          if (node.matches) {
            /* Right-boundary check — the character AFTER this endpoint must
             * be a non-word char (or EOF). */
            const endOffset = offsetAt[walkCp];
            const nextCode =
              endOffset < text.length ? text.codePointAt(endOffset) : undefined;
            if (isWordChar(nextCode)) continue;

            for (const m of node.matches) {
              const candidate: Candidate = {
                entryId: m.entryId,
                startIndex: startOffset,
                endIndex: endOffset,
                matchedString: text.slice(startOffset, endOffset),
                needleLength: m.needleLength,
                isPrimaryName: m.isPrimaryName,
                order: m.order,
              };
              if (!best) {
                best = candidate;
                continue;
              }
              /* Prefer longer match; then primary-name; then earlier
               * registration order. */
              if (candidate.needleLength > best.needleLength) {
                best = candidate;
              } else if (
                candidate.needleLength === best.needleLength &&
                candidate.isPrimaryName &&
                !best.isPrimaryName
              ) {
                best = candidate;
              } else if (
                candidate.needleLength === best.needleLength &&
                candidate.isPrimaryName === best.isPrimaryName &&
                candidate.order < best.order
              ) {
                best = candidate;
              }
            }
          }
        }

        if (best) {
          results.push({
            entryId: best.entryId,
            matchedString: best.matchedString,
            startIndex: best.startIndex,
            endIndex: best.endIndex,
            isPrimaryName: best.isPrimaryName,
          });
          /* Advance past the match so nested/overlapping matches don't
           * double-underline the same span. The matcher intentionally
           * doesn't try to re-enter — if two adjacent entries both have
           * names touching ("Gamma-7" and "7-Cluster"), only one gets
           * highlighted at the boundary. That's the simpler UX. */
          /* Convert the offset back to a codepoint index. */
          let nextCp = cursorCp;
          while (nextCp < cpCount && offsetAt[nextCp] < best.endIndex) {
            nextCp += 1;
          }
          cursorCp = Math.max(cursorCp + 1, nextCp);
        } else {
          cursorCp += 1;
        }
      }

      return results;
    },
  };
}

/**
 * Per-entry aggregate from a scan pass. Useful for both UI badges and the
 * codex-context budgeter (it ranks entries by `matchCount` when trimming).
 */
export type CodexMatchSummary = {
  entryId: string;
  matchCount: number;
  /** Each unique matched string (original casing) and how often we saw it. */
  samples: Array<{ text: string; count: number }>;
};

export function summarizeMatches(
  matches: readonly CodexMatch[],
): CodexMatchSummary[] {
  const agg = new Map<
    string,
    { count: number; samples: Map<string, number> }
  >();
  for (const m of matches) {
    const existing = agg.get(m.entryId);
    if (existing) {
      existing.count += 1;
      existing.samples.set(
        m.matchedString,
        (existing.samples.get(m.matchedString) ?? 0) + 1,
      );
    } else {
      agg.set(m.entryId, {
        count: 1,
        samples: new Map([[m.matchedString, 1]]),
      });
    }
  }
  const out: CodexMatchSummary[] = [];
  for (const [entryId, { count, samples }] of Array.from(agg.entries())) {
    const sampleList = Array.from(samples.entries())
      .map(([text, c]) => ({ text, count: c }))
      .sort((a, b) => b.count - a.count);
    out.push({ entryId, matchCount: count, samples: sampleList });
  }
  out.sort((a, b) => b.matchCount - a.matchCount);
  return out;
}

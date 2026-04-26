import {
  BANNED_PHRASES,
  type BannedPhrase,
  type BannedPhraseCategory,
  type BannedPhraseReplacementExample,
} from "./banned-phrases";

export type SlopMatch = {
  pattern: string;
  category: BannedPhraseCategory;
  order: number;
  replacementGuidance: string;
  replacementExample: BannedPhraseReplacementExample;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  paragraphIndex: number;
};

/**
 * Banned-phrase rows that participate in the regex scanner: must have
 * `detectRegex` and apply to the chapter `bookType` (fiction includes
 * `literary_fiction` columns).
 */
export function phrasesForSlopScan(
  bookType: "fiction" | "non_fiction",
): readonly BannedPhrase[] {
  return BANNED_PHRASES.filter((p) => {
    if (!p.detectRegex) {
      return false;
    }
    if (bookType === "fiction") {
      return (
        p.appliesTo.includes("fiction") || p.appliesTo.includes("literary_fiction")
      );
    }
    return p.appliesTo.includes("non_fiction");
  });
}

/** Paragraph boundaries: [start, end) offsets in `text`. */
export function slopScanParagraphBounds(text: string): { start: number; end: number }[] {
  if (!text) {
    return [];
  }
  const bounds: { start: number; end: number }[] = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    bounds.push({ start: last, end: m.index });
    last = m.index + m[0].length;
  }
  bounds.push({ start: last, end: text.length });
  return bounds;
}

function paragraphIndexForOffset(
  bounds: { start: number; end: number }[],
  offset: number,
): number {
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];
    if (offset >= b.start && offset < b.end) {
      return i;
    }
  }
  return Math.max(0, bounds.length - 1);
}

/**
 * Post-hoc scan of chapter/markdown text for AI-default banned phrase patterns
 * (same regex source as the chapter system prompt, Prompt 10 + 16).
 */
export function scanForSlop(
  text: string,
  bookType: "fiction" | "non_fiction",
): SlopMatch[] {
  const matches: SlopMatch[] = [];
  const bounds = slopScanParagraphBounds(text);
  const phrases = phrasesForSlopScan(bookType);

  for (const phrase of phrases) {
    if (!phrase.detectRegex) {
      continue;
    }
    const re = new RegExp(phrase.detectRegex.source, phrase.detectRegex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const startIndex = m.index;
      const endIndex = m.index + m[0].length;
      const paragraphIndex = paragraphIndexForOffset(bounds, startIndex);
      matches.push({
        pattern: phrase.pattern,
        category: phrase.category,
        order: phrase.order,
        replacementGuidance: phrase.replacementGuidance,
        replacementExample: phrase.replacementExample,
        matchedText: m[0],
        startIndex,
        endIndex,
        paragraphIndex,
      });
      if (!re.global) {
        break;
      }
    }
  }

  matches.sort((a, b) => a.startIndex - b.startIndex || a.order - b.order);
  return matches;
}

export type SlopParagraphCounts = {
  total: number;
  /** Paragraphs with at least one slop match. */
  flagged: number;
  /** Paragraphs with zero matches. */
  clean: number;
};

export function countSlopParagraphs(
  text: string,
  matches: SlopMatch[],
): SlopParagraphCounts {
  const bounds = slopScanParagraphBounds(text);
  const total = bounds.length;
  if (total === 0) {
    return { total: 0, flagged: 0, clean: 0 };
  }
  const bad = new Set<number>();
  for (const x of matches) {
    bad.add(x.paragraphIndex);
  }
  const flagged = bad.size;
  return {
    total,
    flagged,
    clean: total - flagged,
  };
}

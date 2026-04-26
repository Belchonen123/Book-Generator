/**
 * Extract the last ~`targetWords` words of prose while preserving paragraph
 * breaks (`\n\n`), for voice-continuity context.
 */
function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function extractTrailingProse(content: string, targetWords: number): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const totalWords = countWords(trimmed);
  if (totalWords <= targetWords) return trimmed;

  const paragraphs = trimmed.split(/\n\s*\n/);

  const result: string[] = [];
  let wordCount = 0;
  let firstParaIndexIncluded = Number.POSITIVE_INFINITY;

  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const para = paragraphs[i]?.trim() ?? "";
    if (!para) continue;
    const paraWords = countWords(para);
    if (
      wordCount > 0 &&
      wordCount + paraWords > targetWords * 1.3
    ) {
      break;
    }
    result.unshift(para);
    firstParaIndexIncluded = Math.min(firstParaIndexIncluded, i);
    wordCount += paraWords;
    if (wordCount >= targetWords) break;
  }

  if (result.length === 0) {
    const w = trimmed.split(/\s+/).filter(Boolean);
    return `…${w.slice(-targetWords).join(" ")}`;
  }

  if (wordCount > targetWords * 1.5 && result.length > 0) {
    const firstWords = result[0].split(/\s+/).filter(Boolean);
    const allowedFromFirst = Math.max(
      50,
      firstWords.length - (wordCount - targetWords),
    );
    result[0] = `…${firstWords.slice(-allowedFromFirst).join(" ")}`;
  }

  let out = result.join("\n\n");
  if (firstParaIndexIncluded > 0 && !out.startsWith("…")) {
    out = `…${out}`;
  }
  return out;
}

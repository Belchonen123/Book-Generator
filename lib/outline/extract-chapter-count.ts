/**
 * Picks a user-intended chapter count from a brief (and optional interview transcript)
 * for outline generation. Tiered to avoid matching incidental prose ("50 chapters
 * of Tehillim by heart") over structured or ChapterAI-style hints.
 */
export function extractRequestedChapterCount(brief: string): number | null {
  const structured: RegExp[] = [
    /"chapter_count"\s*:\s*(\d{1,3})/,
    /\bchapter_count\s*[:=]\s*(\d{1,3})/i,
    /(?:^|\n)\s*Chapter count\s*:\s*(\d{1,3})\b/im,
    /(?:^|\n)\s*Estimated length\s*:\s*(\d{1,3})\s*chapters?\b/im,
    /(?:^|\n)\s*chapters:\s*(\d{1,3})\b/im,
  ];

  const compiled: RegExp[] = [
    /\b(\d{1,3})\s*chapters?\s*[·•][^\n]{0,40}\bwords?\b/i,
  ];

  const lineStart: RegExp[] = [/(?:^|\n)\s*(\d{1,3})\s*chapters?\b/i];

  for (const tier of [structured, compiled, lineStart]) {
    for (const re of tier) {
      const m = brief.match(re);
      if (m?.[1]) {
        const n = Number.parseInt(m[1], 10);
        if (n >= 1 && n <= 40) {
          return n;
        }
      }
    }
  }
  return null;
}

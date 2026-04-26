/** Matches server + BeatsMap: non-empty blocks split on double newlines. */
export function countParagraphsInChapterText(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

const DEFAULT_MAX = 2500;

/**
 * Splits long plain text for ElevenLabs TTS (~2500 chars, prefer word boundaries).
 */
export function chunkTextForTts(text: string, maxChars: number = DEFAULT_MAX): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= maxChars) return [t];
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxChars, t.length);
    if (end < t.length) {
      const space = t.lastIndexOf(" ", end);
      if (space > i + 200) {
        end = space;
      }
    }
    const part = t.slice(i, end).trim();
    if (part) out.push(part);
    i = end;
  }
  return out;
}

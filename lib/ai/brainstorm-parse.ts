const NUMBERED_LINE = /^\s*\d+[.)\]]\s+(.+?)\s*$/;

/** Pull numbered lines from raw brainstorm stream text (`1. …`, `2) …`, etc.). */
export function parseNumberedLines(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = NUMBERED_LINE.exec(line);
    if (m) {
      out.push(m[1].trim());
    }
  }
  return out;
}

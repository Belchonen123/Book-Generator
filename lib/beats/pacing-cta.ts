import type { NarrativeBeat } from "@/lib/beats/schema";
import { countParagraphsInChapterText } from "@/lib/beats/paragraphs";

/**
 * Suggest 0–1 actionable pacing tips per chapter (fiction beat map).
 * Heuristic only — not a substitute for a human pass.
 */
export function pacingCallToAction(
  chapterNumber: number,
  content: string,
  beats: NarrativeBeat[],
): string | null {
  const totalP = countParagraphsInChapterText(content);
  if (totalP < 3 || beats.length === 0) return null;

  const maxT = Math.max(...beats.map((b) => b.tension));
  const hasPeak =
    beats.some(
      (b) =>
        (b.type === "climax" || b.type === "setback") && b.tension >= 7,
    ) || maxT >= 8;

  if (hasPeak) return null;

  const midpointPara = Math.min(totalP, Math.max(1, Math.floor(totalP * 0.45)));
  return `Chapter ${chapterNumber} has no clear tension peak — consider adding a setback or turning point near paragraph ${midpointPara}.`;
}

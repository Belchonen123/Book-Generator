import { parseRefinedIdeaFromDb, refinedIdeaToBriefLabelledText } from "@/lib/refined-idea/parse";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Json } from "@/types/database.types";

/**
 * Turn the structured `refined_idea` JSONB into a labelled multi-line brief
 * block suitable for feeding into any meta-prompt (cover, metadata, blurb).
 *
 * Invalid JSON is logged in {@link parseRefinedIdeaFromDb}; returns a minimal
 * title/genre stub if no brief is present.
 */
export function buildBriefContext(
  refinedIdea: Json | null,
  bookTitle: string,
  bookGenre: string,
  logContext: string = "buildBriefContext",
): string {
  const fallback = `Title: ${sanitizeText(bookTitle.trim() || "Untitled")}\nGenre: ${sanitizeText(bookGenre.trim() || "General")}\nNo further brief on file.`;
  const p = parseRefinedIdeaFromDb(refinedIdea, logContext, { logFailure: true });
  if (p.ok && p.data) {
    const text = refinedIdeaToBriefLabelledText(p.data).trim();
    if (text) {
      return text;
    }
  }
  return fallback;
}

/**
 * Short, human-readable digest of outline sections for blurb grounding.
 * Keeps the first ~12 chapters (more than enough for back-cover copy) and
 * truncates each description so the total stays well under 4K chars.
 */
export function buildOutlineDigest(sections: unknown): string {
  if (!Array.isArray(sections) || sections.length === 0) return "";

  const entries = sections
    .slice(0, 12)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const s = raw as Record<string, unknown>;
      const num = typeof s.number === "number" ? s.number : null;
      const title = typeof s.title === "string" ? s.title.trim() : "";
      const descRaw = typeof s.description === "string" ? s.description.trim() : "";
      const desc = descRaw.length > 260 ? `${descRaw.slice(0, 260)}…` : descRaw;
      if (!title && !desc) return null;
      const label = num ? `Ch. ${num}` : "Ch.";
      return `${label} — ${title || "Untitled"}: ${desc}`;
    })
    .filter((s): s is string => Boolean(s));

  return entries.join("\n");
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { refinedIdeaToPlainSummary } from "@/lib/refined-idea/parse";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database, Json } from "@/types/database.types";

type OutlineSection = {
  title?: string;
  description?: string;
};

function firstLineOf(text: string, max = 200): string {
  const t = text.trim();
  if (!t) return "";
  const line = t.split(/\n/)[0] ?? "";
  const cut = line.length > max ? `${line.slice(0, max).trimEnd()}…` : line;
  return cut;
}

function parseOutlineFirstLines(sections: Json | null | undefined): string {
  if (sections == null) return "";
  if (!Array.isArray(sections)) return "";
  const lines: string[] = [];
  for (const raw of sections) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as OutlineSection;
    const title = typeof s.title === "string" ? s.title.trim() : "Chapter";
    const desc = typeof s.description === "string" ? s.description.trim() : "";
    if (title || desc) {
      lines.push(`- ${title}: ${firstLineOf(desc, 120)}`);
    }
  }
  return lines.length > 0 ? lines.join("\n") : "";
}

/**
 * For books in a series (excluding `excludeBookId`), in series_order, build recap
 * of premise + first line of each outline section.
 */
export async function buildPreviouslyInSeriesText(
  supabase: SupabaseClient<Database>,
  seriesId: string,
  userId: string,
  /** Current book; prior books = lower series_order */
  currentSeriesOrder: number,
  excludeBookId: string,
): Promise<string> {
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, refined_idea, series_order")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .lt("series_order", currentSeriesOrder)
    .order("series_order", { ascending: true });

  if (error || !books?.length) {
    return "";
  }

  const parts: string[] = [];
  for (const b of books) {
    if (b.id === excludeBookId) continue;
    const { data: outline } = await supabase
      .from("outlines")
      .select("sections")
      .eq("book_id", b.id)
      .maybeSingle();

    const title = b.title?.trim() || "Untitled";
    const pm = refinedIdeaToPlainSummary(
      b.refined_idea,
      "previously.series-book",
      500,
      { bookId: b.id },
    );
    const premise = pm ? firstLineOf(sanitizeText(pm), 500) : "";
    const outlineLines = parseOutlineFirstLines(outline?.sections as Json);
    const block = [`**${sanitizeText(title)}**`];
    if (premise) block.push(`Premise: ${premise}`);
    if (outlineLines) {
      block.push("Outline (first line per chapter):");
      block.push(outlineLines);
    }
    parts.push(block.join("\n"));
  }

  return parts.join("\n\n---\n\n");
}

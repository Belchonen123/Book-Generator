import type { Json } from "@/types/database.types";

/**
 * Turn `outlines.sections` JSON into a compact string for KDP listing context.
 */
export function summarizeOutlineSections(sections: Json): string {
  if (!Array.isArray(sections) || sections.length === 0) {
    return "";
  }
  const lines: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    const row = sections[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Untitled";
    const description = typeof o.description === "string" ? o.description : "";
    const n = typeof o.number === "number" ? o.number : i + 1;
    const tl = o.tension_level;
    const tension =
      typeof tl === "number" && tl >= 1 && tl <= 10 ? ` [tension ${Math.round(tl)}/10]` : "";
    const rt = o.reader_takeaway;
    const takeaway =
      typeof rt === "string" && rt.trim() ? ` [takeaway: ${rt.trim()}]` : "";
    lines.push(
      `Chapter ${n}: ${title}${tension}${takeaway}${description ? ` — ${description}` : ""}`,
    );
  }
  return lines.join("\n");
}

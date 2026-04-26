import { parseRefinedIdeaValue } from "@/lib/refined-idea/parse";
import type { RefinedIdeaBrief } from "@/lib/refined-idea/schema";
import type { Json } from "@/types/database.types";

/**
 * Arc / contract fields from idea refinement (see `RefinedIdeaBrief` + legacy aliases).
 * Used in chapter `bookContext` and outline user prompts.
 */
export type ReaderArcFields = {
  emotional_contract: string;
  arc_shape: string;
  reader_before_state: string;
  reader_after_state: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Accept `reader_*` and legacy `before_state` / `after_state` keys. */
export function pickReaderArcFieldsFromBrief(b: RefinedIdeaBrief): ReaderArcFields {
  const o = b as unknown as Record<string, unknown>;
  return {
    emotional_contract: str(b.emotional_contract),
    arc_shape: str(b.arc_shape),
    reader_before_state: str(b.reader_before_state) || str(o.before_state),
    reader_after_state: str(b.reader_after_state) || str(o.after_state),
  };
}

/** Lines for prompt injection (empty strings omitted). */
export function formatReaderArcLinesFromFields(r: ReaderArcFields): string[] {
  const lines: string[] = [];
  if (r.emotional_contract) {
    lines.push(
      `EMOTIONAL CONTRACT (what reader must feel in body): ${r.emotional_contract}`,
    );
  }
  if (r.arc_shape) {
    lines.push(`ARC SHAPE (reader belief start → end): ${r.arc_shape}`);
  }
  if (r.reader_before_state && r.reader_after_state) {
    lines.push(`READER TRANSFORMATION: ${r.reader_before_state} → ${r.reader_after_state}`);
  } else if (r.reader_before_state) {
    lines.push(`READER STARTING STATE: ${r.reader_before_state}`);
  } else if (r.reader_after_state) {
    lines.push(`READER END STATE (book): ${r.reader_after_state}`);
  }
  return lines;
}

export function formatReaderArcContextLines(b: RefinedIdeaBrief | null | undefined): string[] {
  if (!b) return [];
  return formatReaderArcLinesFromFields(pickReaderArcFieldsFromBrief(b));
}

export function formatReaderArcContextLinesFromJson(
  refined: Json | null,
): string[] {
  const p = parseRefinedIdeaValue(refined);
  if (!p.success || !p.data) return [];
  return formatReaderArcContextLines(p.data);
}

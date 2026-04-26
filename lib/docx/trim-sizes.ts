/**
 * Trim-size definitions for DOCX compilation.
 *
 * Isolated from `compiler.ts` so that client components (e.g. the trim-size
 * picker) can import the options without pulling in the compiler module,
 * which depends on server-only modules like `@/lib/supabase/server`.
 */

/** Supported print/ebook trim sizes. Default is US Letter (8.5 x 11). */
export const TRIM_SIZES = [
  "us-letter",
  "us-trade",
  "digest",
  "executive",
  "a4",
  "a5",
  "pocket",
] as const;

export type TrimSize = (typeof TRIM_SIZES)[number];

export type TrimSpec = {
  readonly label: string;
  readonly widthIn: number;
  readonly heightIn: number;
  /** Page margins in inches. */
  readonly margin: { top: number; bottom: number; left: number; right: number };
  /** Body text size in half-points (22 = 11 pt). */
  readonly bodyHalfPt: number;
  /** Chapter-title size in half-points. */
  readonly chapterTitleHalfPt: number;
  /** Cover title size in half-points. */
  readonly coverTitleHalfPt: number;
  /** Drop-cap first-letter size in half-points. */
  readonly dropCapHalfPt: number;
};

export const TRIM_SPECS: Record<TrimSize, TrimSpec> = {
  "us-letter": {
    label: "US Letter (8.5 x 11 in)",
    widthIn: 8.5,
    heightIn: 11,
    margin: { top: 1, bottom: 1, left: 1, right: 1 },
    bodyHalfPt: 24,
    chapterTitleHalfPt: 56,
    coverTitleHalfPt: 96,
    dropCapHalfPt: 88,
  },
  "us-trade": {
    label: "US Trade (6 x 9 in)",
    widthIn: 6,
    heightIn: 9,
    margin: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.5 },
    bodyHalfPt: 22,
    chapterTitleHalfPt: 40,
    coverTitleHalfPt: 68,
    dropCapHalfPt: 72,
  },
  digest: {
    label: "Digest (5.5 x 8.5 in)",
    widthIn: 5.5,
    heightIn: 8.5,
    margin: { top: 0.7, bottom: 0.7, left: 0.7, right: 0.5 },
    bodyHalfPt: 22,
    chapterTitleHalfPt: 38,
    coverTitleHalfPt: 64,
    dropCapHalfPt: 68,
  },
  executive: {
    label: "Executive (7 x 10 in)",
    widthIn: 7,
    heightIn: 10,
    margin: { top: 0.9, bottom: 0.9, left: 0.9, right: 0.7 },
    bodyHalfPt: 24,
    chapterTitleHalfPt: 48,
    coverTitleHalfPt: 80,
    dropCapHalfPt: 80,
  },
  a4: {
    label: "A4 (210 x 297 mm)",
    widthIn: 8.27,
    heightIn: 11.69,
    margin: { top: 1, bottom: 1, left: 1, right: 1 },
    bodyHalfPt: 24,
    chapterTitleHalfPt: 56,
    coverTitleHalfPt: 96,
    dropCapHalfPt: 88,
  },
  a5: {
    label: "A5 (148 x 210 mm)",
    widthIn: 5.83,
    heightIn: 8.27,
    margin: { top: 0.7, bottom: 0.7, left: 0.7, right: 0.5 },
    bodyHalfPt: 22,
    chapterTitleHalfPt: 38,
    coverTitleHalfPt: 64,
    dropCapHalfPt: 68,
  },
  pocket: {
    label: "Mass Market (4.25 x 6.87 in)",
    widthIn: 4.25,
    heightIn: 6.87,
    margin: { top: 0.55, bottom: 0.55, left: 0.55, right: 0.4 },
    bodyHalfPt: 20,
    chapterTitleHalfPt: 32,
    coverTitleHalfPt: 52,
    dropCapHalfPt: 60,
  },
};

/** Human-readable metadata for the trim-size picker in the UI. */
export const TRIM_SIZE_OPTIONS: ReadonlyArray<{
  id: TrimSize;
  label: string;
  widthIn: number;
  heightIn: number;
  description: string;
}> = TRIM_SIZES.map((id) => {
  const spec = TRIM_SPECS[id];
  const description = (() => {
    switch (id) {
      case "us-letter":
        return "Non-fiction, workbooks, photo books, business guides.";
      case "us-trade":
        return "Most common novel and memoir size on Amazon KDP.";
      case "digest":
        return "Poetry, devotionals, short fiction — a handheld classic.";
      case "executive":
        return "Textbooks, journals, academic works.";
      case "a4":
        return "European standard — reports, non-fiction, large print.";
      case "a5":
        return "European trade paperback — novels, novellas.";
      case "pocket":
        return "Mass-market paperback — thrillers, romance, travel.";
    }
  })();
  return {
    id,
    label: spec.label,
    widthIn: spec.widthIn,
    heightIn: spec.heightIn,
    description,
  };
});

/** Resolve an arbitrary input string into a valid `TrimSize` (defaults to `us-letter`). */
export function resolveTrimSize(input?: string | null): TrimSize {
  if (!input) return "us-letter";
  const match = TRIM_SIZES.find((t) => t === input);
  return match ?? "us-letter";
}

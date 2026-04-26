/**
 * Series-context tier for the generation context assembler (Prompt 16.4).
 *
 * Prompt 5's assembler already stacks project meta → style → codex →
 * prior chapter summaries → recent prose. When a book belongs to a series,
 * the model also needs:
 *
 *   1. The series itself — name, tagline, genre, description. The "what
 *      kind of saga is this" anchor.
 *   2. "Previously in series" — the cached {@link summarizeBookForSeries}
 *      output (series_plot_summary + series_end_state_dossier) for every
 *      PRIOR book (series_order < current). This is cheap because the
 *      summary is stored on `books` and just needs loading.
 *   3. Arcs currently in motion — unresolved narrative threads touching
 *      this or earlier books, so the model doesn't accidentally resolve
 *      an arc that's meant to carry through the trilogy.
 *
 * This block is DIFFERENT from `lib/series/continuity.ts` — continuity.ts
 * builds a single prose paragraph that gets stuffed into the legacy
 * system-suffix slot. `buildSeriesContextBlock` produces a structured XML
 * tier that gets its own token budget, its own trimming rules, and its
 * own `seriesContextBlock` field in the assembler's output so routes can
 * splice it precisely (between style and codex per Prompt 16.4).
 *
 * Budget enforcement (per-sub-block ceilings, then trim strategy):
 *   - description         ≤ 300 tokens
 *   - each prior book     ≤ 400 tokens (already ~400 words in practice)
 *   - each active arc     ≤ 300 tokens
 *   - total               ≤ tokenBudget (caller picks, 2000 is the default)
 *
 * When total > budget:
 *   1. Drop the OLDEST prior books first (most distant from the current
 *      book — the closest book is usually the most plot-relevant).
 *   2. Drop arcs with status='setup' (the non-urgent ones).
 *   3. Compress remaining book summaries by trimming the tail.
 *   4. Finally, truncate the description.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database } from "@/types/database.types";

/**
 * Keep token estimation local in this module to avoid a circular import with
 * `context-assembler` (which also imports from this file).
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/* ------------------------------------------------------------------ */
/*   Public types                                                     */
/* ------------------------------------------------------------------ */

export type BuildSeriesContextBlockArgs = {
  supabase: SupabaseClient<Database>;
  seriesId: string;
  currentBookId: string;
  /**
   * `books.series_order` of the current book (1-indexed). Used to filter
   * "prior books" (strictly lower series_order).
   */
  currentBookPosition: number;
  /** Hard ceiling for the whole block. Default: 2,000 tokens. */
  tokenBudget?: number;
  /**
   * User id — tunneled through so RLS doesn't need `auth.uid()` to be
   * set. Required for `series` / `books` reads; `series_arcs` is
   * series-scoped and inherits ownership via `series.user_id` so we
   * don't need to re-scope there.
   */
  userId: string;
};

export type SeriesContextInput = {
  seriesId: string;
  currentBookPosition: number;
  userId: string;
};

export function buildSeriesContextInputForBook(
  book: { series_id: string | null; series_order: number | null | undefined },
  userId: string,
): SeriesContextInput | undefined {
  return book.series_id && typeof book.series_order === "number"
    ? {
        seriesId: book.series_id,
        currentBookPosition: book.series_order,
        userId,
      }
    : undefined;
}

export type BuildSeriesContextBlockResult = {
  block: string;
  tokensUsed: number;
  blocksIncluded: string[];
  blocksTrimmed: string[];
  meta: {
    priorBooksAvailable: number;
    priorBooksIncluded: number;
    arcsAvailable: number;
    arcsIncluded: number;
    missingSummaries: number;
  };
};

/* ------------------------------------------------------------------ */
/*   Budgets                                                          */
/* ------------------------------------------------------------------ */

export const DEFAULT_SERIES_CONTEXT_TOKEN_BUDGET = 2_000;

const SUB_BUDGETS = {
  description: 300,
  perBook: 400,
  perArc: 300,
} as const;

/* ------------------------------------------------------------------ */
/*   Helpers                                                          */
/* ------------------------------------------------------------------ */

function trimToTokens(text: string, maxTokens: number): string {
  if (!text) return "";
  if (maxTokens <= 0) return "";
  const est = estimateTokens(text);
  if (est <= maxTokens) return text;
  /* estimateTokens ≈ ceil(len/4). Invert with a small safety margin so
   * we don't land exactly on the ceiling and round back up. */
  const targetChars = Math.max(0, maxTokens * 4 - 8);
  return `${text.slice(0, targetChars).trimEnd()}…`;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlAttr(value: string | null | undefined): string {
  if (!value) return "";
  return xmlEscape(value.trim());
}

/* ------------------------------------------------------------------ */
/*   Data shapes                                                      */
/* ------------------------------------------------------------------ */

type SeriesRow = {
  id: string;
  name: string;
  description: string | null;
  tagline: string | null;
  genre: string | null;
};

type PriorBookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  series_order: number | null;
  series_plot_summary: string | null;
  series_end_state_dossier: string | null;
  series_summary_generated_at: string | null;
};

type ArcRow = {
  id: string;
  name: string;
  description_md: string | null;
  arc_type: string | null;
  status: string;
  starts_book_id: string | null;
  ends_book_id: string | null;
};

/* ------------------------------------------------------------------ */
/*   Renderers                                                        */
/* ------------------------------------------------------------------ */

function renderPriorBook(book: PriorBookRow, tokenCap: number): string {
  const title = sanitizeText(book.title?.trim() || "Untitled");
  const subtitle = book.subtitle?.trim()
    ? ` subtitle="${xmlAttr(sanitizeText(book.subtitle))}"`
    : "";
  const summary = (book.series_plot_summary ?? "").trim();
  const dossier = (book.series_end_state_dossier ?? "").trim();

  /* Prefer the prose summary; append the dossier only if we still have
   * headroom. The dossier is optional — plot_summary is the canonical
   * "what happened" recap. */
  let body: string;
  if (!summary && !dossier) {
    body = "[No summary yet; generate from the series Books tab.]";
  } else if (summary && dossier) {
    const combined = `${summary}\n\n## End-of-book state\n${dossier}`;
    body = sanitizeText(trimToTokens(combined, tokenCap));
  } else {
    body = sanitizeText(trimToTokens(summary || dossier, tokenCap));
  }

  return (
    `<book position="${book.series_order ?? "?"}" title="${xmlAttr(title)}"${subtitle}>\n` +
    `${body}\n` +
    `</book>`
  );
}

function renderArc(
  arc: ArcRow,
  beatLines: string[],
  tokenCap: number,
): string {
  const desc = (arc.description_md ?? "").trim();
  const sanitizedDesc = desc ? sanitizeText(desc) : "";
  const beats = beatLines.length > 0 ? beatLines.join("\n") : "";
  const combined = [sanitizedDesc, beats ? `Key beats so far:\n${beats}` : ""]
    .filter(Boolean)
    .join("\n\n");
  const body = trimToTokens(combined, tokenCap) || "[no description]";
  const typeAttr = arc.arc_type
    ? ` type="${xmlAttr(sanitizeText(arc.arc_type))}"`
    : "";
  return (
    `<arc name="${xmlAttr(sanitizeText(arc.name))}"${typeAttr} status="${xmlAttr(arc.status)}">\n` +
    `${body}\n` +
    `</arc>`
  );
}

/* ------------------------------------------------------------------ */
/*   Public API                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build the `<series>…</series>` XML block the chapter prompt can splice
 * between the style block and the codex block.
 *
 * Returns an empty block when the book isn't in a series, the series can't
 * be loaded, or there's nothing substantive to include. Callers can check
 * `result.block === ""` and skip the tier entirely.
 */
export async function buildSeriesContextBlock(
  args: BuildSeriesContextBlockArgs,
): Promise<BuildSeriesContextBlockResult> {
  const budget = args.tokenBudget ?? DEFAULT_SERIES_CONTEXT_TOKEN_BUDGET;
  const blocksIncluded: string[] = [];
  const blocksTrimmed: string[] = [];
  const meta = {
    priorBooksAvailable: 0,
    priorBooksIncluded: 0,
    arcsAvailable: 0,
    arcsIncluded: 0,
    missingSummaries: 0,
  };

  /* -- 1. Series metadata -------------------------------------------- */
  const { data: series, error: seriesErr } = await args.supabase
    .from("series")
    .select("id, name, description, tagline, genre")
    .eq("id", args.seriesId)
    .eq("user_id", args.userId)
    .maybeSingle<SeriesRow>();
  if (seriesErr || !series) {
    return {
      block: "",
      tokensUsed: 0,
      blocksIncluded,
      blocksTrimmed,
      meta,
    };
  }

  /* -- 2. Prior books (position < current) --------------------------- */
  const { data: priorRaw } = await args.supabase
    .from("books")
    .select(
      "id, title, subtitle, series_order, series_plot_summary, series_end_state_dossier, series_summary_generated_at",
    )
    .eq("user_id", args.userId)
    .eq("series_id", args.seriesId)
    .lt("series_order", args.currentBookPosition)
    .order("series_order", { ascending: true });
  const priorBooks = (priorRaw ?? []) as PriorBookRow[];
  meta.priorBooksAvailable = priorBooks.length;
  meta.missingSummaries = priorBooks.filter(
    (b) => !b.series_summary_generated_at,
  ).length;

  /* Count total books in the series for the top-level attribute. The
   * matching COUNT is cheap — RLS already scoped us to the user. */
  const { count: totalBooksCount } = await args.supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId)
    .eq("series_id", args.seriesId);
  const totalBooks = totalBooksCount ?? priorBooks.length + 1;

  /* -- 3. Arcs touching current-or-earlier books --------------------- */
  const { data: arcsRaw } = await args.supabase
    .from("series_arcs")
    .select(
      "id, name, description_md, arc_type, status, starts_book_id, ends_book_id",
    )
    .eq("series_id", args.seriesId)
    .in("status", ["setup", "developing", "climax"]);
  const allArcs = (arcsRaw ?? []) as ArcRow[];

  /* Filter arcs to those that touch the current book or a prior book. */
  const priorBookIds = priorBooks.map((p) => p.id);
  const relevantBookIds = new Set([args.currentBookId, ...priorBookIds]);

  const { data: beatsRaw } =
    allArcs.length > 0
      ? await args.supabase
          .from("series_arc_beats")
          .select("id, arc_id, book_id, description, position, beat_type")
          .in(
            "arc_id",
            allArcs.map((a) => a.id),
          )
      : { data: [] as Array<{ id: string; arc_id: string; book_id: string | null; description: string; position: number; beat_type: string | null }> };
  const beats = beatsRaw ?? [];

  const beatsByArc = new Map<string, typeof beats>();
  for (const beat of beats) {
    const list = beatsByArc.get(beat.arc_id) ?? [];
    list.push(beat);
    beatsByArc.set(beat.arc_id, list);
  }

  const arcs = allArcs.filter((a) => {
    if (a.starts_book_id && relevantBookIds.has(a.starts_book_id)) return true;
    if (a.ends_book_id && relevantBookIds.has(a.ends_book_id)) return true;
    const arcBeats = beatsByArc.get(a.id) ?? [];
    return arcBeats.some(
      (b) => b.book_id && relevantBookIds.has(b.book_id),
    );
  });
  meta.arcsAvailable = arcs.length;

  /* -- 4. Rendering with per-section budgets ------------------------- */
  const seriesName = sanitizeText(series.name);
  const openTag = `<series name="${xmlAttr(seriesName)}" current_book="${args.currentBookPosition} of ${totalBooks}"${series.tagline ? ` tagline="${xmlAttr(sanitizeText(series.tagline))}"` : ""}${series.genre ? ` genre="${xmlAttr(sanitizeText(series.genre))}"` : ""}>`;
  const closeTag = "</series>";

  /* Description */
  const rawDescription = (series.description ?? "").trim();
  const description = rawDescription
    ? trimToTokens(sanitizeText(rawDescription), SUB_BUDGETS.description)
    : "";
  if (description && description !== rawDescription) {
    blocksTrimmed.push("description");
  }
  const descriptionXml = description
    ? `<description>${description}</description>`
    : "";

  /* Prior books — render in chronological order. Oldest first in the
   * output (reader-friendly), but when trimming we drop the OLDEST first
   * since the most recent prior book is usually the closest in plot
   * terms to the current one. */
  const bookRows = priorBooks.map((b) => ({
    book: b,
    xml: renderPriorBook(b, SUB_BUDGETS.perBook),
  }));

  /* Arcs — trim status='setup' first when budget runs tight. */
  const arcEntries = arcs.map((a) => {
    const arcBeats = (beatsByArc.get(a.id) ?? [])
      .filter((beat) => beat.book_id && relevantBookIds.has(beat.book_id))
      .sort((x, y) => x.position - y.position);
    const lines = arcBeats
      .slice(0, 6)
      .map((beat) => `- ${sanitizeText(beat.description.trim().slice(0, 200))}`);
    return {
      arc: a,
      xml: renderArc(a, lines, SUB_BUDGETS.perArc),
    };
  });

  /* Attempt assembly; if over budget, trim in documented priority. */
  const assemble = (
    includedBooks: typeof bookRows,
    includedArcs: typeof arcEntries,
    desc: string,
  ): string => {
    const prevBlock =
      includedBooks.length > 0
        ? `<previously_in_series>\n${includedBooks.map((r) => r.xml).join("\n")}\n</previously_in_series>`
        : "";
    const arcsBlock =
      includedArcs.length > 0
        ? `<active_arcs>\n${includedArcs.map((r) => r.xml).join("\n")}\n</active_arcs>`
        : "";
    const descXml = desc ? `<description>${desc}</description>` : "";
    const body = [descXml, prevBlock, arcsBlock]
      .filter(Boolean)
      .join("\n");
    return body ? `${openTag}\n${body}\n${closeTag}` : "";
  };

  let includedBooks = [...bookRows];
  let includedArcs = [...arcEntries];
  let finalDescription = description;
  let rendered = assemble(includedBooks, includedArcs, finalDescription);

  /* Trim pass 1: drop oldest prior books. */
  while (estimateTokens(rendered) > budget && includedBooks.length > 0) {
    includedBooks.shift();
    if (!blocksTrimmed.includes("priorBooks")) blocksTrimmed.push("priorBooks");
    rendered = assemble(includedBooks, includedArcs, finalDescription);
  }

  /* Trim pass 2: drop setup-status arcs, then any remaining arcs. */
  if (estimateTokens(rendered) > budget) {
    includedArcs = includedArcs.filter((e) => e.arc.status !== "setup");
    if (!blocksTrimmed.includes("arcs")) blocksTrimmed.push("arcs");
    rendered = assemble(includedBooks, includedArcs, finalDescription);
    while (estimateTokens(rendered) > budget && includedArcs.length > 0) {
      includedArcs.pop();
      rendered = assemble(includedBooks, includedArcs, finalDescription);
    }
  }

  /* Trim pass 3: re-compress remaining book summaries. */
  if (estimateTokens(rendered) > budget && includedBooks.length > 0) {
    const squeezed = Math.max(
      120,
      Math.floor(SUB_BUDGETS.perBook / 2),
    );
    includedBooks = includedBooks.map(({ book }) => ({
      book,
      xml: renderPriorBook(book, squeezed),
    }));
    if (!blocksTrimmed.includes("priorBooks")) blocksTrimmed.push("priorBooks");
    rendered = assemble(includedBooks, includedArcs, finalDescription);
  }

  /* Trim pass 4: truncate the description. */
  if (estimateTokens(rendered) > budget && finalDescription) {
    finalDescription = trimToTokens(
      finalDescription,
      Math.max(80, Math.floor(SUB_BUDGETS.description / 2)),
    );
    if (!blocksTrimmed.includes("description"))
      blocksTrimmed.push("description");
    rendered = assemble(includedBooks, includedArcs, finalDescription);
  }

  /* If still over budget (extreme edge — pathologically long arcs), drop
   * the description entirely to keep the structural frame. */
  if (estimateTokens(rendered) > budget) {
    finalDescription = "";
    if (!blocksTrimmed.includes("description"))
      blocksTrimmed.push("description");
    rendered = assemble(includedBooks, includedArcs, "");
  }

  /* Drop everything for the no-content case so callers can skip the tier. */
  if (!rendered) {
    return {
      block: "",
      tokensUsed: 0,
      blocksIncluded,
      blocksTrimmed,
      meta,
    };
  }

  if (descriptionXml && finalDescription) blocksIncluded.push("description");
  if (includedBooks.length > 0) blocksIncluded.push("previously_in_series");
  if (includedArcs.length > 0) blocksIncluded.push("active_arcs");

  meta.priorBooksIncluded = includedBooks.length;
  meta.arcsIncluded = includedArcs.length;

  /* Observability: match the format used by other context builders so ops
   * dashboards can filter on `[series-context]`. Never throw from a
   * logger — generation must keep running even if console is broken. */
  try {
    console.info("[series-context]", {
      seriesId: args.seriesId,
      currentBookId: args.currentBookId,
      currentBookPosition: args.currentBookPosition,
      blocksIncluded,
      blocksTrimmed,
      tokensUsed: estimateTokens(rendered),
      tokenBudget: budget,
      ...meta,
    });
  } catch {
    /* swallow */
  }

  return {
    block: `\n\n${rendered}`,
    tokensUsed: estimateTokens(rendered),
    blocksIncluded,
    blocksTrimmed,
    meta,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildSeriesWritingContinuityPrompt } from "@/lib/ai/prompt-templates";
import { refinedIdeaToPlainSummary } from "@/lib/refined-idea/parse";
import type { SeriesContextMeta } from "@/lib/series/observability";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database, Json } from "@/types/database.types";

export type SeriesMeta = {
  id: string;
  name: string;
  shared_world_notes: string | null;
  shared_character_bible: unknown;
};

type PriorBook = {
  id: string;
  title: string;
  refined_idea: Json | null;
  series_order: number | null;
};

/**
 * Public result of the chapter-prompt continuity builder. The prompt text
 * is what the model sees; the meta is what observability logs.
 */
export type SeriesContinuityChapterResult = {
  text: string;
  meta: SeriesContextMeta;
};

/**
 * Fetches prior books in the same series (lower series_order), plus series name.
 */
export async function loadSeriesMetaAndPriorBooks(
  supabase: SupabaseClient<Database>,
  bookId: string,
  userId: string,
): Promise<{
  currentOrder: number;
  bookNumberInSeries: number;
  series: SeriesMeta | null;
  priorBooks: PriorBook[];
} | null> {
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, series_id, series_order, title, refined_idea")
    .eq("id", bookId)
    .eq("user_id", userId)
    .single();

  if (bookError || !book || !book.series_id || book.series_order == null) {
    return null;
  }

  const { data: series, error: seriesError } = await supabase
    .from("series")
    .select("id, name, shared_world_notes, shared_character_bible")
    .eq("id", book.series_id)
    .eq("user_id", userId)
    .single();

  if (seriesError || !series) {
    return null;
  }

  const { data: siblings } = await supabase
    .from("books")
    .select("id, title, refined_idea, series_order")
    .eq("user_id", userId)
    .eq("series_id", book.series_id)
    .order("series_order", { ascending: true });

  const ordered = (siblings ?? [])
    .filter((r) => r.series_order != null)
    .sort(
      (a, b) => (a.series_order ?? 0) - (b.series_order ?? 0),
    ) as PriorBook[];
  const prior = ordered.filter(
    (b) => (b.series_order ?? 0) < (book.series_order ?? 0),
  ) as PriorBook[];
  const idx = ordered.findIndex((b) => b.id === bookId);
  const bookNumberInSeries = idx >= 0 ? idx + 1 : 1;

  return {
    currentOrder: book.series_order,
    bookNumberInSeries,
    series: {
      id: series.id,
      name: series.name,
      shared_world_notes: series.shared_world_notes,
      shared_character_bible: series.shared_character_bible,
    },
    priorBooks: prior,
  };
}

async function lastChapterExcerpt(
  supabase: SupabaseClient<Database>,
  bookId: string,
  maxChars: number,
): Promise<string> {
  const { data: row } = await supabase
    .from("chapters")
    .select("content")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const raw = row?.content?.trim() ?? "";
  if (!raw) return "";
  const tail = raw.length <= maxChars ? raw : raw.slice(-maxChars);
  return sanitizeText(tail);
}

/**
 * Prose block for system prompt: list prior volumes + last-chapter carryover.
 *
 * Returns both the rendered markdown (what the model sees) and structured
 * meta (what the observability logger captures — counts, arc ids, codex
 * ids). Callers that only need the text can read `result.text`.
 */
export async function buildSeriesContinuityForChapterPrompt(
  supabase: SupabaseClient<Database>,
  bookId: string,
  userId: string,
): Promise<SeriesContinuityChapterResult | null> {
  const ctx = await loadSeriesMetaAndPriorBooks(supabase, bookId, userId);
  if (!ctx) return null;

  const n = Math.max(1, ctx.bookNumberInSeries);
  const head =
    `This is book ${n} in the series “${sanitizeText(ctx.series!.name)}”. ` +
    `Maintain character voice, continuity, and world rules that match earlier volumes.`;

  const worldText = ctx.series?.shared_world_notes?.trim() ?? "";
  const world =
    worldText.length > 0
      ? `\n\n## Series world (author notes)\n${sanitizeText(worldText)}`
      : "";

  const bookLines: string[] = [];
  for (const pb of ctx.priorBooks) {
    const t = pb.title?.trim() || "Untitled";
    const line = refinedIdeaToPlainSummary(
      pb.refined_idea,
      "continuity.prior-book-premise",
      8_000,
      { bookId: pb.id },
    );
    const premise = line ? sanitizeText(line) : "—";
    const tail = await lastChapterExcerpt(supabase, pb.id, 500);
    bookLines.push(
      `- **${sanitizeText(t)}** — ${premise}` +
        (tail ? `\n  Last page carryover (final ~${500} characters of the closing chapter): ${tail}` : ""),
    );
  }

  const list =
    bookLines.length > 0
      ? `\n## Earlier books in this series (titles + premises + closing carryover)\n${bookLines.join("\n\n")}`
      : "";

  const codex = await buildSeriesCodexBlock(supabase, {
    seriesId: ctx.series!.id,
    userId,
    currentBookId: bookId,
  });

  const prog = await buildSeriesProgressionBlock(supabase, {
    seriesId: ctx.series!.id,
    userId,
    currentBookId: bookId,
    priorBookIds: ctx.priorBooks.map((p) => p.id),
  });

  const arcs = await buildActiveArcsBlock(supabase, {
    seriesId: ctx.series!.id,
    currentBookId: bookId,
  });

  const text = `${head}${world}${list}${arcs.text}${codex.text}${prog.text}`;

  const meta: SeriesContextMeta = {
    blocksUsed: {
      head: true,
      series_world: world.length > 0,
      prior_books_list: bookLines.length > 0,
      series_codex: codex.text.length > 0,
      progressions: prog.text.length > 0,
      arcs_in_motion: arcs.text.length > 0,
    },
    priorBooksCount: ctx.priorBooks.length,
    progressionsCount: prog.count,
    codexEntriesCount: codex.entryIds.length,
    arcIds: arcs.arcIds,
    codexEntryIds: codex.entryIds,
    priorBookIds: ctx.priorBooks.map((p) => p.id),
  };

  return { text, meta };
}

/**
 * Arcs currently in 'developing' or 'climax' status that touch the current
 * book (either start/end on it, or have at least one beat attached to it).
 * Renders a short markdown block the model can use to avoid prematurely
 * resolving a running arc — pairs with `renderSeriesContinuityFragment()` in the
 * chapter system prompt.
 */
async function buildActiveArcsBlock(
  supabase: SupabaseClient<Database>,
  opts: { seriesId: string; currentBookId: string },
): Promise<{ text: string; arcIds: string[] }> {
  // Ownership on series_arcs is inherited via series_id → series.user_id;
  // RLS enforces access so we only need the series filter here.
  const { data: arcs } = await supabase
    .from("series_arcs")
    .select(
      "id, name, description_md, arc_type, status, starts_book_id, ends_book_id",
    )
    .eq("series_id", opts.seriesId)
    .in("status", ["developing", "climax"]);
  if (!arcs?.length) return { text: "", arcIds: [] };

  // Find arcs that touch this book via beats — an arc may span 4 books and
  // only be "in-motion" here. We only need arc ids, not beat contents.
  const { data: beats } = await supabase
    .from("series_arc_beats")
    .select("arc_id")
    .eq("book_id", opts.currentBookId)
    .in(
      "arc_id",
      arcs.map((a) => a.id),
    );
  const touched = new Set((beats ?? []).map((b) => b.arc_id));

  const relevant = arcs.filter(
    (a) =>
      a.starts_book_id === opts.currentBookId ||
      a.ends_book_id === opts.currentBookId ||
      touched.has(a.id),
  );
  if (!relevant.length) return { text: "", arcIds: [] };

  const lines = relevant.map((a) => {
    const kind = a.arc_type ? ` _(${sanitizeText(a.arc_type)})_` : "";
    const desc =
      a.description_md?.trim() != null
        ? `: ${sanitizeText(a.description_md.trim().slice(0, 240))}`
        : "";
    return `- **${sanitizeText(a.name)}**${kind} [${a.status}]${desc}`;
  });

  return {
    text: `\n\n## Arcs in motion touching this book (do not resolve unless asked)\n${lines.join("\n")}`,
    arcIds: relevant.map((a) => a.id),
  };
}

/**
 * Fetches series-scoped codex entries and merges per-book overlays for the
 * current book. Shared-scope entries are included too.
 *
 * The returned block lists canonical facts the AI must treat as established
 * when writing the *current* book.
 */
async function buildSeriesCodexBlock(
  supabase: SupabaseClient<Database>,
  opts: { seriesId: string; userId: string; currentBookId: string },
): Promise<{ text: string; entryIds: string[] }> {
  const { data: entries } = await supabase
    .from("codex_entries")
    .select(
      "id, entry_type, name, aliases, summary, description_md, scope, custom_fields",
    )
    .eq("user_id", opts.userId)
    .eq("series_id", opts.seriesId)
    .in("scope", ["series", "shared"]);

  if (!entries?.length) return { text: "", entryIds: [] };

  const ids = entries.map((e) => e.id);
  const { data: overlays } = await supabase
    .from("codex_entry_overlays")
    .select("codex_entry_id, description_override, field_overrides")
    .eq("book_id", opts.currentBookId)
    .in("codex_entry_id", ids);

  const overlayByEntry = new Map(
    (overlays ?? []).map((o) => [o.codex_entry_id, o] as const),
  );

  const grouped = new Map<string, string[]>();
  for (const e of entries) {
    const ov = overlayByEntry.get(e.id);
    const desc =
      (ov?.description_override?.trim() ?? "") ||
      (e.description_md?.trim() ?? "") ||
      (e.summary?.trim() ?? "");
    const aliasList = (e.aliases ?? []).filter(Boolean);
    const aliasSuffix = aliasList.length
      ? ` _(also: ${aliasList.map(sanitizeText).join(", ")})_`
      : "";
    const label = `- **${sanitizeText(e.name)}**${aliasSuffix}${
      desc ? `: ${sanitizeText(desc)}` : ""
    }${ov ? " _(per-book variation applies)_" : ""}`;
    const bucket = e.entry_type || "other";
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push(label);
  }

  const order = [
    "character",
    "location",
    "faction",
    "object",
    "lore",
    "subplot",
    "custom",
  ];
  const sections: string[] = [];
  for (const key of order) {
    const rows = grouped.get(key);
    if (!rows?.length) continue;
    sections.push(
      `### ${key.charAt(0).toUpperCase()}${key.slice(1)}s\n${rows.join("\n")}`,
    );
  }
  for (const [key, rows] of Array.from(grouped.entries())) {
    if (order.includes(key)) continue;
    sections.push(
      `### ${key.charAt(0).toUpperCase()}${key.slice(1)}\n${rows.join("\n")}`,
    );
  }

  if (!sections.length) return { text: "", entryIds: ids };
  return {
    text: `\n\n## Series codex (canonical — do not contradict)\n${sections.join("\n\n")}`,
    entryIds: ids,
  };
}

/**
 * Lists codex progressions from *prior* books only, so the AI treats them as
 * established history when generating the current book. Progressions logged
 * in the current book are intentionally excluded — they may still be drafts.
 */
async function buildSeriesProgressionBlock(
  supabase: SupabaseClient<Database>,
  opts: {
    seriesId: string;
    userId: string;
    currentBookId: string;
    priorBookIds: string[];
  },
): Promise<{ text: string; count: number }> {
  if (opts.priorBookIds.length === 0) return { text: "", count: 0 };

  const { data: entries } = await supabase
    .from("codex_entries")
    .select("id, name")
    .eq("user_id", opts.userId)
    .eq("series_id", opts.seriesId);

  if (!entries?.length) return { text: "", count: 0 };
  const nameById = new Map(entries.map((e) => [e.id, e.name] as const));

  const { data: progs } = await supabase
    .from("codex_progressions")
    .select("codex_entry_id, book_id, event_type, description, created_at")
    .in("book_id", opts.priorBookIds)
    .in("codex_entry_id", Array.from(nameById.keys()))
    .order("created_at", { ascending: true })
    .limit(200);

  if (!progs?.length) return { text: "", count: 0 };

  const { data: books } = await supabase
    .from("books")
    .select("id, title, series_order")
    .in("id", opts.priorBookIds);
  const bookMeta = new Map(
    (books ?? []).map((b) => [b.id, b] as const),
  );

  const lines = progs.map((p) => {
    const name = nameById.get(p.codex_entry_id) ?? "Unknown";
    const bk = bookMeta.get(p.book_id);
    const prefix = bk
      ? `Book ${bk.series_order ?? "?"} (${sanitizeText(bk.title ?? "Untitled")})`
      : "Earlier book";
    return `- ${prefix} — **${sanitizeText(name)}** (${sanitizeText(
      p.event_type,
    )}): ${sanitizeText(p.description)}`;
  });

  return {
    text: `\n\n## Established events from prior books (do not contradict)\n${lines.join("\n")}`,
    count: progs.length,
  };
}

/**
 * Shorter list for outline (titles + one-line premises).
 */
export function buildSeriesContinuityForOutlinePrompt(ctx: {
  bookNumberInSeries: number;
  seriesName: string;
  priorBooks: PriorBook[];
}): string {
  const n = Math.max(1, ctx.bookNumberInSeries);
  const books = ctx.priorBooks
    .map((pb) => {
      const t = pb.title?.trim() || "Untitled";
      const line = refinedIdeaToPlainSummary(
        pb.refined_idea,
        "continuity.outline-prior-premise",
        4_000,
        { bookId: pb.id },
      );
      const p = line ? sanitizeText(line) : "—";
      return `Book: ${sanitizeText(t)} — ${p}`;
    })
    .join("\n");
  return buildSeriesWritingContinuityPrompt({
    bookNumberInSeries: n,
    seriesName: ctx.seriesName,
    priorBooksText: books,
  });
}

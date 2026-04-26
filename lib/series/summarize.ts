/**
 * Prior-book summarization for series context (Prompt 16 § 278-292).
 *
 * When a book in a series is finished, we compress its full text into a
 * structured "here is what just happened" payload that later books can
 * draw from without the model having to re-read the whole manuscript.
 *
 * Output shape (single JSON call):
 *   {
 *     plot_summary: string            // ~400 words of prose
 *     end_state_dossier: string       // markdown "what the reader knows"
 *     open_arcs: string[]             // threads still hanging at end
 *     world_state_changes: string[]   // canon deltas (rules/world)
 *     character_states: [{ entry_id, name, state }]
 *   }
 *
 * Persistence strategy:
 *  - plot_summary         → books.series_plot_summary
 *  - end_state_dossier    → books.series_end_state_dossier
 *  - open_arcs +          → books.series_summary_data (JSONB blob, audit)
 *    world_state_changes
 *  - character_states     → codex_progressions rows with
 *                           event_type = 'book_end_state' per character,
 *                           replacing any prior book_end_state rows for
 *                           that entry on this book
 *
 * We ONLY persist character_states for codex entries that are series-scoped
 * (or shared-scoped). Book-scoped entries are by definition local to one
 * book so a cross-book end-state doesn't help continuity into the next.
 *
 * The module never throws — every error path returns a discriminated
 * `{ status: "error" | "skipped" | "ok" }` so the caller (server action,
 * auto-trigger) can log and keep going without breaking the user flow.
 */
import { createHash } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { SERIES_BOOK_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { getOpenAI, isOpenAIConfigError } from "@/lib/openai/client";
import { logSeriesAiGeneration } from "@/lib/series/observability";
import { refinedIdeaToPlainSummary } from "@/lib/refined-idea/parse";
import { logServerError } from "@/lib/utils/errors";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database, Json } from "@/types/database.types";

/** Cap on chapter-content we feed the summarizer so 150k-word books still fit. */
const MAX_TOTAL_CHAPTER_CHARS = 120_000;

/** Cheap model; plot synopsis is well within gpt-4o-mini's ability. */
const SUMMARIZER_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = SERIES_BOOK_SUMMARY_SYSTEM_PROMPT;

export type CharacterStateOutput = {
  entry_id: string;
  name: string;
  state: string;
};

export type SummarizeBookForSeriesResult =
  | {
      status: "ok";
      plotSummaryWords: number;
      characterStatesPersisted: number;
      openArcsCount: number;
      worldChangesCount: number;
    }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

type SupabaseDb = SupabaseClient<Database>;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/**
 * Stable hash of the chapter set that would feed the summarizer. Used by
 * {@link refreshSummaryIfStale} to decide whether a cached summary is still
 * valid: if the author edited Chapter 11 of Book 1 after we summarized it,
 * Chapter 11's `updated_at` shifts, the hash changes, and the next context
 * assembly regenerates the recap instead of quietly serving a stale one.
 *
 * We keep the hash cheap — just `(chapter_id, updated_at)` pairs sorted
 * deterministically. Adding/removing chapters changes the id set; edits
 * change the updated_at. That's enough signal without paying to read the
 * full content on every staleness check. Chapters with no content summary
 * (ai_summary/outline_summary/content all empty) are excluded because the
 * summarizer skips them too — their presence shouldn't invalidate a
 * summary that already covers the substantive chapters.
 */
type ChapterForHash = {
  id: string;
  updated_at: string | null;
  ai_summary: string | null;
  outline_summary: string | null;
  content: string | null;
};

export function computeChapterCorpusHash(
  chapters: ReadonlyArray<ChapterForHash>,
): string {
  const substantive = chapters.filter((c) => {
    const body =
      (c.ai_summary && c.ai_summary.trim()) ||
      (c.outline_summary && c.outline_summary.trim()) ||
      (c.content && c.content.trim()) ||
      "";
    return body.length > 0;
  });
  if (substantive.length === 0) return "empty";
  const parts = substantive
    .map((c) => `${c.id}:${c.updated_at ?? ""}`)
    .sort();
  return createHash("sha256")
    .update(parts.join("\n"), "utf8")
    .digest("hex")
    .slice(0, 24);
}

/** Strip fence wrappers (```json … ```) if present, then parse. */
function parseLooseJson(raw: string): unknown | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : raw.trim();
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

type ParsedOutput = {
  plot_summary: string;
  end_state_dossier: string;
  open_arcs: string[];
  world_state_changes: string[];
  character_states: CharacterStateOutput[];
};

function coerceParsed(raw: unknown): ParsedOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const plot = typeof o.plot_summary === "string" ? o.plot_summary.trim() : "";
  if (!plot) return null;
  const dossier =
    typeof o.end_state_dossier === "string" ? o.end_state_dossier.trim() : "";
  const arcs = Array.isArray(o.open_arcs)
    ? (o.open_arcs.filter((x) => typeof x === "string") as string[])
    : [];
  const worldChanges = Array.isArray(o.world_state_changes)
    ? (o.world_state_changes.filter((x) => typeof x === "string") as string[])
    : [];
  const charStates: CharacterStateOutput[] = [];
  if (Array.isArray(o.character_states)) {
    for (const row of o.character_states) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.entry_id === "string" ? r.entry_id : "";
      const name = typeof r.name === "string" ? r.name : "";
      const state = typeof r.state === "string" ? r.state.trim() : "";
      if (id && state) charStates.push({ entry_id: id, name, state });
    }
  }
  return {
    plot_summary: plot,
    end_state_dossier: dossier,
    open_arcs: arcs,
    world_state_changes: worldChanges,
    character_states: charStates,
  };
}

/**
 * Join the manuscript into one string the model can reason over. We prefer
 * `ai_summary` when present (cheaper context), fall back to
 * `outline_summary`, and only drop to raw `content` for chapters that have
 * neither. Chapter order is preserved.
 */
function buildChapterCorpus(
  chapters: ReadonlyArray<{
    chapter_number: number;
    title: string;
    ai_summary: string | null;
    outline_summary: string | null;
    content: string | null;
  }>,
): string {
  const pieces: string[] = [];
  let totalChars = 0;
  for (const ch of chapters) {
    const title = sanitizeText(ch.title?.trim() || "Untitled");
    const body =
      (ch.ai_summary && ch.ai_summary.trim()) ||
      (ch.outline_summary && ch.outline_summary.trim()) ||
      (ch.content && ch.content.trim()) ||
      "";
    if (!body) continue;
    const sanitized = sanitizeText(body);
    const block = `## Chapter ${ch.chapter_number}: ${title}\n${sanitized}`;
    /* Keep blocks intact — if adding this one overflows, stop. The remaining
     * chapters almost always sit at the end of the book, so losing them is
     * the worst case for a recap. Author can re-run after trimming if they
     * hit this ceiling. */
    if (totalChars + block.length > MAX_TOTAL_CHAPTER_CHARS) break;
    pieces.push(block);
    totalChars += block.length;
  }
  return pieces.join("\n\n");
}

/**
 * Produce + persist the end-of-book summary for `bookId`. `userId` should
 * be the book owner (the caller's auth check already ran). Safe to call
 * twice — the second call replaces prior-generation artifacts.
 */
export async function summarizeBookForSeries(
  supabase: SupabaseDb,
  bookId: string,
  userId: string,
): Promise<SummarizeBookForSeriesResult> {
  try {
    /* -- Fetch book + confirm it's in a series --------------------------- */
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select(
        "id, user_id, title, subtitle, refined_idea, genre, series_id, series_order",
      )
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (bookErr) {
      logServerError("summarizeBookForSeries.book-fetch", bookErr);
      return { status: "error", reason: "book_fetch_failed" };
    }
    if (!book) return { status: "skipped", reason: "not_found" };
    if (!book.series_id) return { status: "skipped", reason: "not_in_series" };

    /* -- Load chapters in reading order --------------------------------- */
    const { data: chapters, error: chErr } = await supabase
      .from("chapters")
      .select(
        "id, chapter_number, title, ai_summary, outline_summary, content, updated_at",
      )
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true });
    if (chErr) {
      logServerError("summarizeBookForSeries.chapters", chErr);
      return { status: "error", reason: "chapters_fetch_failed" };
    }
    if (!chapters || chapters.length === 0) {
      return { status: "skipped", reason: "no_chapters" };
    }

    const corpus = buildChapterCorpus(chapters);
    if (!corpus || corpus.length < 500) {
      return { status: "skipped", reason: "manuscript_too_short" };
    }

    /* -- Load series-scoped codex characters so the model can attach
     *    end-state snapshots to real entry_ids. Non-character types are
     *    included too — "location" and "faction" end-states are useful. */
    const { data: codexRows } = await supabase
      .from("codex_entries")
      .select("id, entry_type, name, aliases")
      .eq("series_id", book.series_id)
      .in("scope", ["series", "shared"]);
    const knownIds = new Set((codexRows ?? []).map((e) => e.id));
    const codexList = (codexRows ?? [])
      .map(
        (e) =>
          `- id: ${e.id} | ${e.entry_type}: ${e.name}${
            e.aliases?.length ? ` (aka ${e.aliases.join(", ")})` : ""
          }`,
      )
      .join("\n");

    /* -- User-turn: frame + cast list + chapter corpus ------------------ */
    const frame = [
      `BOOK: "${sanitizeText(book.title || "Untitled")}"${
        book.subtitle ? ` — ${sanitizeText(book.subtitle)}` : ""
      }`,
      book.genre ? `GENRE: ${sanitizeText(book.genre)}` : "",
      book.series_order != null ? `POSITION: Book ${book.series_order} in series` : "",
      (() => {
        const p = refinedIdeaToPlainSummary(
          book.refined_idea,
          "series.summarize.frame",
          600,
          { bookId: book.id },
        );
        return p ? `PREMISE: ${sanitizeText(p)}` : "";
      })(),
    ]
      .filter(Boolean)
      .join("\n");

    const castBlock = codexList
      ? `KNOWN SERIES ENTITIES (use these ids verbatim in character_states.entry_id; skip any not listed):\n${codexList}`
      : "KNOWN SERIES ENTITIES: (none — leave character_states as an empty array.)";

    const userMessage = `${frame}\n\n${castBlock}\n\nMANUSCRIPT (chapter summaries / content, in reading order):\n\n${corpus}`;

    /* -- Call OpenAI ---------------------------------------------------- */
    let raw: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: SUMMARIZER_MODEL,
        temperature: 0.2,
        max_tokens: 3_500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? "";
    } catch (e) {
      if (isOpenAIConfigError(e)) {
        return { status: "error", reason: "openai_not_configured" };
      }
      logServerError("summarizeBookForSeries.openai", e);
      return { status: "error", reason: "openai_failed" };
    }

    const parsed = coerceParsed(parseLooseJson(raw));
    if (!parsed) {
      logServerError(
        "summarizeBookForSeries.parse",
        new Error(`Invalid JSON: ${raw.slice(0, 200)}`),
      );
      return { status: "error", reason: "parse_failed" };
    }

    /* -- Persist book-level fields -------------------------------------- */
    const summaryData: Json = {
      open_arcs: parsed.open_arcs,
      world_state_changes: parsed.world_state_changes,
      /* character_states mirrored here for audit; the canonical rows sit
       * in codex_progressions (see below). */
      character_states: parsed.character_states as unknown as Json,
    };
    const sourceHash = computeChapterCorpusHash(chapters);
    const { error: bookUpdErr } = await supabase
      .from("books")
      .update({
        series_plot_summary: parsed.plot_summary,
        series_end_state_dossier: parsed.end_state_dossier,
        series_summary_data: summaryData,
        series_summary_generated_at: new Date().toISOString(),
        series_summary_source_hash: sourceHash,
      })
      .eq("id", bookId);
    if (bookUpdErr) {
      logServerError("summarizeBookForSeries.book-update", bookUpdErr);
      return { status: "error", reason: "book_update_failed" };
    }

    /* -- Persist character_states as book_end_state progressions --------
     * Replace any prior book_end_state rows for this book so a regen is
     * idempotent. Skip entry_ids the model invented — they'd fail the FK
     * anyway, but filtering upfront keeps the error log clean.
     */
    const validStates = parsed.character_states.filter((s) =>
      knownIds.has(s.entry_id),
    );

    const { error: delErr } = await supabase
      .from("codex_progressions")
      .delete()
      .eq("book_id", bookId)
      .eq("event_type", "book_end_state");
    if (delErr) {
      /* Non-fatal: stale book_end_state rows may remain but the book-level
       * summary already persisted. Log and continue. */
      logServerError("summarizeBookForSeries.progressions-clear", delErr);
    }

    let persistedStates = 0;
    if (validStates.length > 0) {
      const rows = validStates.map((s) => ({
        codex_entry_id: s.entry_id,
        book_id: bookId,
        event_type: "book_end_state",
        description: s.state.slice(0, 2_000),
      }));
      const { error: insErr } = await supabase
        .from("codex_progressions")
        .insert(rows);
      if (insErr) {
        logServerError("summarizeBookForSeries.progressions-insert", insErr);
        /* Non-fatal; book-level summary is already saved. */
      } else {
        persistedStates = rows.length;
      }
    }

    /* Prompt 16 § 362-371: observability for the series-scoped summary
     * pass. Captures which codex ids the model saw (cast list) and the
     * shape of the output, so we can debug a user complaint like "my
     * Book 2 dossier forgot Dmitri's arc". */
    void logSeriesAiGeneration(supabase, {
      userId,
      seriesId: book.series_id,
      bookId,
      operation: "series_summarize",
      model: SUMMARIZER_MODEL,
      context: {
        blocksUsed: {
          series_codex: (codexRows?.length ?? 0) > 0,
        },
        priorBooksCount: 0,
        progressionsCount: persistedStates,
        codexEntriesCount: codexRows?.length ?? 0,
        arcIds: [],
        codexEntryIds: (codexRows ?? []).map((e) => e.id),
        priorBookIds: [],
      },
      metadata: {
        chapter_count: chapters.length,
        corpus_chars: corpus.length,
        plot_summary_words: countWords(parsed.plot_summary),
        open_arcs_count: parsed.open_arcs.length,
        world_changes_count: parsed.world_state_changes.length,
        character_states_persisted: persistedStates,
      },
    });

    return {
      status: "ok",
      plotSummaryWords: countWords(parsed.plot_summary),
      characterStatesPersisted: persistedStates,
      openArcsCount: parsed.open_arcs.length,
      worldChangesCount: parsed.world_state_changes.length,
    };
  } catch (e) {
    logServerError("summarizeBookForSeries.unexpected", e);
    return { status: "error", reason: "unexpected" };
  }
}

/**
 * If `books.series_summary_source_hash` no longer matches the current
 * chapter set, regenerate the summary and return true. Otherwise leave the
 * cached payload alone and return false.
 *
 * Called from two places:
 *   1. Server components that render a series book — we poke this on load
 *      so authors who edited a prior book after completing it don't keep
 *      reading stale "previously in series" context for chapter 2.
 *   2. Operational tools / cron ("refresh every stale summary nightly").
 *
 * Fails silently — a bad OpenAI call or a missing hash just returns false;
 * the caller already had a cached summary (or nothing) and neither path
 * is broken by a no-op.
 */
export async function refreshSummaryIfStale(
  supabase: SupabaseDb,
  bookId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select(
        "id, user_id, series_id, series_summary_source_hash, series_summary_generated_at",
      )
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (bookErr || !book || !book.series_id) return false;

    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, ai_summary, outline_summary, content, updated_at")
      .eq("book_id", bookId);
    if (!chapters || chapters.length === 0) return false;

    const currentHash = computeChapterCorpusHash(chapters);
    const stored = book.series_summary_source_hash;

    /* Never-generated summaries don't trigger a refresh here — that's what
     * the "Summarize for series" button / status=complete trigger is for.
     * This helper only *refreshes* an existing summary when the manuscript
     * has changed underneath it. */
    if (!book.series_summary_generated_at) return false;

    if (stored && stored === currentHash) return false;

    const res = await summarizeBookForSeries(supabase, bookId, userId);
    return res.status === "ok";
  } catch (e) {
    logServerError("refreshSummaryIfStale.unexpected", e);
    return false;
  }
}

/**
 * Fire-and-forget refresh of stale summaries for every prior book in the
 * series of `bookId`. Safe to call on every chapter-page load — the hash
 * check is cheap, and only summaries whose source manuscripts have
 * actually changed get regenerated. Returns the list of book ids that
 * were refreshed (empty when nothing was stale, so the caller can log).
 *
 * Intended caller: server components that render a book in a series.
 * Pattern:
 *   ```ts
 *   void refreshStalePriorBookSummaries(supabase, bookId, user.id);
 *   ```
 */
export async function refreshStalePriorBookSummaries(
  supabase: SupabaseDb,
  bookId: string,
  userId: string,
): Promise<string[]> {
  try {
    const { data: book } = await supabase
      .from("books")
      .select("id, series_id, series_order")
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!book?.series_id || typeof book.series_order !== "number") {
      return [];
    }
    const { data: priorBooks } = await supabase
      .from("books")
      .select("id")
      .eq("user_id", userId)
      .eq("series_id", book.series_id)
      .lt("series_order", book.series_order);
    if (!priorBooks || priorBooks.length === 0) return [];

    const refreshed: string[] = [];
    for (const pb of priorBooks) {
      const did = await refreshSummaryIfStale(supabase, pb.id, userId);
      if (did) refreshed.push(pb.id);
    }
    return refreshed;
  } catch (e) {
    logServerError("refreshStalePriorBookSummaries.unexpected", e);
    return [];
  }
}

/**
 * Cheap hash-only variant: compute the hash the caller *would* generate
 * right now and compare to what's stored. Used by UI loaders that want a
 * "stale / fresh / none" badge without paying for a regeneration.
 */
export async function computeSummaryStaleness(
  supabase: SupabaseDb,
  bookId: string,
): Promise<"none" | "fresh" | "stale"> {
  try {
    const { data: book } = await supabase
      .from("books")
      .select(
        "id, series_summary_source_hash, series_summary_generated_at",
      )
      .eq("id", bookId)
      .maybeSingle();
    if (!book) return "none";
    if (!book.series_summary_generated_at) return "none";

    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, ai_summary, outline_summary, content, updated_at")
      .eq("book_id", bookId);
    if (!chapters || chapters.length === 0) return "none";

    const currentHash = computeChapterCorpusHash(chapters);
    const stored = book.series_summary_source_hash;
    if (!stored) return "stale";
    return stored === currentHash ? "fresh" : "stale";
  } catch {
    return "none";
  }
}

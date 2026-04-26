/**
 * Codex prompt-injection block.
 *
 * Given a project (book) id and a small slice of text the AI is about to
 * work on, `buildCodexBlock` fetches the project's codex entries, runs the
 * name/alias matcher over the text, and emits an XML `<worldbook>` block the
 * route can append to its system prompt.
 *
 * Policy:
 *  - `ai_scope = 'always'` → always included
 *  - `ai_scope = 'on_match'` → included only when the matcher finds the
 *    entry's name or aliases in `textContext`
 *  - `ai_scope = 'never'` → excluded from auto-injection (still visible in
 *    the codex UI, still paintable as an editor underline — just not fed
 *    to the model)
 *
 * Token budget: default 3,000. If the rendered block exceeds the budget we
 * rank entries by (ai_scope='always' first, then by match count desc, then
 * alphabetical), render each in turn, and append a one-liner stub for the
 * ones that don't fit. This keeps a model-blind long tail from starving the
 * highest-signal entries when a scene references a dozen characters.
 *
 * Appended to the system prompt AFTER `buildStyleExamplesBlock` — codex is
 * structural, style is stylistic; putting style closest to the user turn
 * keeps the voice anchor dominant while still anchoring facts earlier.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildCodexMatcher,
  summarizeMatches,
  type CodexMatchableEntry,
  type CodexMatchSummary,
} from "@/lib/codex/matcher";
import type {
  CodexEntryAiScopeDb,
  CodexEntryScopeDb,
  CodexEntryTypeDb,
  Database,
  Json,
} from "@/types/database.types";

export const CODEX_DEFAULT_TOKEN_BUDGET = 3_000;

/**
 * Roughly one token per 4 characters — mirrors the heuristic already used in
 * refine-idea/generate-chapter so budget math stays consistent across
 * routes. Real tokenization would need the GPT tokenizer as a dep; that's
 * overkill for a soft budget.
 */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

type CodexEntryRow = {
  id: string;
  scope?: CodexEntryScopeDb;
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  description_md: string;
  summary: string | null;
  custom_fields: Json;
  ai_scope: CodexEntryAiScopeDb;
};

/**
 * Per-entry progression snippet rendered inside an entry's XML body. Kept
 * pre-sorted (earliest → latest) so the model reads progressions in
 * chronological order the same way a reader would.
 */
type ProgressionSnippet = {
  entryId: string;
  bookOrder: number | null;
  bookTitle: string;
  chapterNumber: number | null;
  eventType: string;
  description: string;
};

export type BuildCodexBlockResult = {
  /** The rendered `<worldbook>…</worldbook>` block, or "" if empty. */
  block: string;
  /** Entry IDs matched by text scan before ai_scope/budget filtering. */
  matchedEntryIds: string[];
  /** Count of unique matched entries from `scanText(textContext)`. */
  matchedEntryCount: number;
  /** IDs of entries whose full body was rendered in the block. */
  entriesIncluded: string[];
  /** IDs of entries that matched-in but got dropped to a stub by the budget. */
  entriesTrimmed: string[];
  /** Approximate token count of `block` (estimateTokens heuristic). */
  tokensUsed: number;
};

export type BuildCodexBlockOptions = {
  /**
   * Override for the default token budget. Routes that already spend a lot
   * on context (generate-chapter) may want to bump this up; short routes
   * (refine-idea) can trim.
   */
  tokenBudget?: number;
  /**
   * When set, overrides the DB lookup. Useful for tests, and for callers
   * that already have the entries in memory (e.g. the editor integration
   * would rather reuse its in-memory list than pay a fresh roundtrip).
   */
  entriesOverride?: ReadonlyArray<CodexEntryRow>;
  /**
   * Current chapter number inside the book. When provided, progressions
   * logged against the *current* book are filtered to chapter_number
   * strictly less than this value — preventing "future chapter" events from
   * leaking into a chapter that hasn't reached them yet. Progressions from
   * prior books in the series are always included.
   */
  currentChapterNumber?: number;
  /**
   * Opt out of series merge + progression injection. Useful for tests and
   * for callers that manage their own series context (none today, but it
   * keeps the merge opt-out explicit).
   */
  includeSeries?: boolean;
  /**
   * Entry IDs the author explicitly requested for this generation.
   * These are force-included regardless of ai_scope/match status.
   */
  forceIncludeEntryIds?: ReadonlyArray<string>;
};

/**
 * Escape characters that would otherwise terminate or corrupt an XML-like
 * attribute or body. We use the cheapest possible subset — the block is
 * read by an LLM, not a strict parser, so we just need to prevent stray
 * quotes/angles from splintering the structure.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeBody(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Readable, stable JSON rendering for the custom_fields sub-section. */
function stringifyCustomFields(custom: Json): string[] {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
    return [];
  }
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(custom as Record<string, Json>)) {
    if (raw === null || raw === undefined || raw === "") continue;
    const label = key.replace(/_/g, " ");
    let rendered: string;
    if (Array.isArray(raw)) {
      rendered = raw
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(", ");
    } else if (typeof raw === "object") {
      rendered = JSON.stringify(raw);
    } else {
      rendered = String(raw);
    }
    if (!rendered.trim()) continue;
    lines.push(`  ${label}: ${rendered}`);
  }
  return lines;
}

/**
 * Apply a per-book overlay to a series-scoped codex entry. Per the spec's
 * PROMPT INJECTION CHANGES section:
 *   - overlay.field_overrides overrides custom_fields keys (shallow merge)
 *   - overlay.description_override, if present, replaces description_md
 * Anything unspecified falls through to the base entry.
 */
function applyOverlay(
  entry: CodexEntryRow,
  overlay: {
    description_override: string | null;
    field_overrides: Json;
  } | null,
): CodexEntryRow {
  if (!overlay) return entry;
  const baseCustom =
    entry.custom_fields && typeof entry.custom_fields === "object" && !Array.isArray(entry.custom_fields)
      ? (entry.custom_fields as Record<string, Json>)
      : {};
  const overCustom =
    overlay.field_overrides && typeof overlay.field_overrides === "object" && !Array.isArray(overlay.field_overrides)
      ? (overlay.field_overrides as Record<string, Json>)
      : {};
  return {
    ...entry,
    description_md:
      overlay.description_override?.trim() ?? entry.description_md,
    custom_fields: { ...baseCustom, ...overCustom } as Json,
  };
}

function renderProgressions(progs: ProgressionSnippet[]): string {
  if (progs.length === 0) return "";
  return progs
    .map((p) => {
      const bookLabel = p.bookOrder != null ? `Book ${p.bookOrder}` : p.bookTitle;
      const chapterLabel = p.chapterNumber != null ? `, Ch ${p.chapterNumber}` : "";
      const body = `${bookLabel}${chapterLabel}: ${p.description}`;
      return `    <progression>${escapeBody(body)}</progression>`;
    })
    .join("\n");
}

function renderEntry(
  entry: CodexEntryRow,
  opts: {
    trimmed: boolean;
    descriptionCharLimit: number;
    progressions?: ProgressionSnippet[];
  },
): string {
  const tag = entry.entry_type;
  const idAttr = ` id="${escapeAttr(entry.id)}"`;
  const aliasAttr =
    entry.aliases.length > 0
      ? ` aliases="${escapeAttr(entry.aliases.join(", "))}"`
      : "";
  const nameAttr = ` name="${escapeAttr(entry.name)}"`;

  if (opts.trimmed) {
    return `  <${tag}${idAttr}${nameAttr}${aliasAttr}>[trimmed: see codex for full entry]</${tag}>`;
  }

  const body: string[] = [];
  if (entry.summary && entry.summary.trim().length > 0) {
    body.push(`  ${entry.summary.trim()}`);
  }
  if (entry.description_md && entry.description_md.trim().length > 0) {
    const desc = entry.description_md.trim();
    const truncated =
      desc.length > opts.descriptionCharLimit
        ? `${desc.slice(0, opts.descriptionCharLimit)}…`
        : desc;
    body.push(`  ${truncated}`);
  }
  body.push(...stringifyCustomFields(entry.custom_fields));

  const escapedBody = body
    .map((line) => escapeBody(line))
    .join("\n")
    .trim();

  const progressionsBlock = renderProgressions(opts.progressions ?? []);

  if (!escapedBody && !progressionsBlock) {
    return `  <${tag}${idAttr}${nameAttr}${aliasAttr}/>`;
  }

  const innerLines: string[] = [];
  if (escapedBody) innerLines.push(`  ${escapedBody.replace(/\n/g, "\n  ")}`);
  if (progressionsBlock) innerLines.push(progressionsBlock);

  return `  <${tag}${idAttr}${nameAttr}${aliasAttr}>\n${innerLines.join("\n")}\n  </${tag}>`;
}

function toMatchableEntries(
  entries: ReadonlyArray<CodexEntryRow>,
): CodexMatchableEntry[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    aliases: e.aliases ?? [],
  }));
}

/**
 * Score entries for inclusion/ordering. `ai_scope='always'` always wins the
 * tiebreaker over `on_match`; inside each group we sort by match count
 * desc, then alphabetically for deterministic output.
 */
function rankEntries(
  candidates: ReadonlyArray<CodexEntryRow>,
  matchSummaries: Map<string, CodexMatchSummary>,
  forcedEntryIds: ReadonlySet<string>,
): CodexEntryRow[] {
  return [...candidates].sort((a, b) => {
    const forcedA = forcedEntryIds.has(a.id) ? 1 : 0;
    const forcedB = forcedEntryIds.has(b.id) ? 1 : 0;
    if (forcedA !== forcedB) return forcedB - forcedA;
    const alwaysA = a.ai_scope === "always" ? 1 : 0;
    const alwaysB = b.ai_scope === "always" ? 1 : 0;
    if (alwaysA !== alwaysB) return alwaysB - alwaysA;
    const matchA = matchSummaries.get(a.id)?.matchCount ?? 0;
    const matchB = matchSummaries.get(b.id)?.matchCount ?? 0;
    if (matchA !== matchB) return matchB - matchA;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Pull recent progressions for each included entry, honoring the spec's
 * time-cone: PRIOR books in the series, plus current-book progressions
 * whose chapter_number is strictly less than `currentChapterNumber` (when
 * provided). We fetch all qualifying rows then take the 5 most recent per
 * entry, ordered earliest → latest so the model reads them as a timeline.
 */
async function fetchRecentProgressionsPerEntry(
  supabase: SupabaseClient<Database>,
  opts: {
    bookId: string;
    seriesId: string | null;
    entryIds: string[];
    currentChapterNumber?: number;
  },
): Promise<Map<string, ProgressionSnippet[]>> {
  const out = new Map<string, ProgressionSnippet[]>();
  if (!opts.seriesId || opts.entryIds.length === 0) return out;

  // All books in the series, so we can label progressions with their reading
  // order and filter out books AFTER the current one.
  const { data: books } = await supabase
    .from("books")
    .select("id, title, series_order")
    .eq("series_id", opts.seriesId);
  const bookMeta = new Map(
    (books ?? []).map(
      (b) =>
        [
          b.id,
          {
            title: b.title ?? "Untitled",
            order: b.series_order ?? null,
          },
        ] as const,
    ),
  );
  const currentOrder = bookMeta.get(opts.bookId)?.order ?? null;

  // A progression qualifies if:
  //   - its book is in this series AND has a lower series_order than current
  //   - OR it's on the current book AND (no chapter filter, OR its chapter's
  //     number is < currentChapterNumber)
  // We fetch the union then filter in memory — keeps the query simple.
  const { data: progs } = await supabase
    .from("codex_progressions")
    .select(
      "codex_entry_id, book_id, chapter_id, event_type, description, created_at",
    )
    .in("codex_entry_id", opts.entryIds)
    .in("book_id", Array.from(bookMeta.keys()))
    .order("created_at", { ascending: true });

  if (!progs?.length) return out;

  // Resolve chapter_number for any current-book progressions that need the
  // chapter filter. Batched in one query.
  const currentBookChapterIds = progs
    .filter((p) => p.book_id === opts.bookId && p.chapter_id)
    .map((p) => p.chapter_id!) as string[];
  const chapterNumberById = new Map<string, number>();
  if (currentBookChapterIds.length > 0 && opts.currentChapterNumber != null) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, chapter_number")
      .in("id", Array.from(new Set(currentBookChapterIds)));
    for (const c of chapters ?? []) {
      chapterNumberById.set(c.id, c.chapter_number);
    }
  }

  for (const p of progs) {
    const meta = bookMeta.get(p.book_id);
    if (!meta) continue;
    if (p.book_id === opts.bookId) {
      // Current book — apply chapter filter if we have one.
      if (opts.currentChapterNumber != null) {
        const chNum = p.chapter_id ? chapterNumberById.get(p.chapter_id) : null;
        if (chNum == null || chNum >= opts.currentChapterNumber) continue;
      }
    } else {
      // Other book in series — must be prior in reading order.
      if (
        currentOrder != null &&
        meta.order != null &&
        meta.order >= currentOrder
      )
        continue;
    }
    const snippet: ProgressionSnippet = {
      entryId: p.codex_entry_id,
      bookOrder: meta.order,
      bookTitle: meta.title,
      chapterNumber: p.chapter_id
        ? chapterNumberById.get(p.chapter_id) ?? null
        : null,
      eventType: p.event_type,
      description: p.description,
    };
    const list = out.get(p.codex_entry_id) ?? [];
    list.push(snippet);
    out.set(p.codex_entry_id, list);
  }

  // Keep only the last 5 per entry, preserving chronological order.
  for (const [id, list] of Array.from(out.entries())) {
    if (list.length > 5) out.set(id, list.slice(-5));
  }
  return out;
}

export async function buildCodexBlock(
  supabase: SupabaseClient<Database>,
  bookId: string,
  textContext: string,
  options: BuildCodexBlockOptions = {},
): Promise<BuildCodexBlockResult> {
  const tokenBudget = options.tokenBudget ?? CODEX_DEFAULT_TOKEN_BUDGET;
  const includeSeries = options.includeSeries !== false;
  const forcedEntryIds = new Set(options.forceIncludeEntryIds ?? []);

  // Resolve the current book's series_id once — we need it both for the
  // series entry fetch and for the progressions query.
  let seriesId: string | null = null;
  if (includeSeries && !options.entriesOverride) {
    const { data: bookRow } = await supabase
      .from("books")
      .select("series_id")
      .eq("id", bookId)
      .maybeSingle();
    seriesId = bookRow?.series_id ?? null;
  }

  let entries: ReadonlyArray<CodexEntryRow>;
  if (options.entriesOverride) {
    entries = options.entriesOverride;
  } else {
    const { data: projectEntries, error } = await supabase
      .from("codex_entries")
      .select(
        "id, scope, entry_type, name, aliases, description_md, summary, custom_fields, ai_scope",
      )
      .eq("book_id", bookId)
      .eq("scope", "project")
      .order("ai_scope", { ascending: false })
      .order("name", { ascending: true });
    if (error || !projectEntries) {
      /* Fail open: a codex-lookup error shouldn't kill the whole prompt. We
       * return an empty block and leave it to the caller's server logger
       * to record the failure. */
      return {
        block: "",
        matchedEntryIds: [],
        matchedEntryCount: 0,
        entriesIncluded: [],
        entriesTrimmed: [],
        tokensUsed: 0,
      };
    }

    let merged: CodexEntryRow[] = projectEntries as CodexEntryRow[];

    // Series merge: pull series-scoped (and shared-scope) entries for this
    // series, then apply the current book's overlays. Per spec, overlays let
    // series-scoped canon diverge for a specific book without forking the
    // entry — e.g. "Faiga is 12 in this book, 28 in book 3" lives on the
    // overlay, not the canonical entry.
    if (includeSeries && seriesId) {
      const seriesP = supabase
        .from("codex_entries")
        .select(
          "id, scope, entry_type, name, aliases, description_md, summary, custom_fields, ai_scope",
        )
        .eq("series_id", seriesId)
        .eq("scope", "series");
      const sharedP = supabase
        .from("codex_entries")
        .select(
          "id, scope, entry_type, name, aliases, description_md, summary, custom_fields, ai_scope",
        )
        .eq("scope", "shared");
      const [seriesRes, sharedRes] = await Promise.all([seriesP, sharedP]);

      const seriesRows = [
        ...((seriesRes.data ?? []) as CodexEntryRow[]),
        ...((sharedRes.data ?? []) as CodexEntryRow[]),
      ];
      if (seriesRows.length > 0) {
        const overlayTargetIds = seriesRows
          .filter((r) => r.scope === "series")
          .map((r) => r.id);
        const { data: overlayRows } = overlayTargetIds.length > 0
          ? await supabase
              .from("codex_entry_overlays")
              .select("codex_entry_id, description_override, field_overrides")
              .eq("book_id", bookId)
              .in("codex_entry_id", overlayTargetIds)
          : { data: [] as Array<{
            codex_entry_id: string;
            description_override: string | null;
            field_overrides: Json | null;
          }> };
        const overlayByEntry = new Map(
          (overlayRows ?? []).map(
            (o) => [o.codex_entry_id, o] as const,
          ),
        );
        const applied = seriesRows.map((e) =>
          applyOverlay(e, overlayByEntry.get(e.id) ?? null),
        );
        // De-dupe: a project-scoped entry with the same id as a series one
        // (shouldn't happen but defensive) wins, since project scope is more
        // specific. Map by id to preserve uniqueness.
        const byId = new Map<string, CodexEntryRow>();
        for (const e of applied) byId.set(e.id, e);
        for (const e of merged) byId.set(e.id, e);
        merged = Array.from(byId.values());
      }
    }

    entries = merged;
  }

  if (entries.length === 0) {
    return {
      block: "",
      matchedEntryIds: [],
      matchedEntryCount: 0,
      entriesIncluded: [],
      entriesTrimmed: [],
      tokensUsed: 0,
    };
  }

  const matcher = buildCodexMatcher(toMatchableEntries(entries));
  const matches = matcher.scanText(textContext ?? "");
  const summaryList = summarizeMatches(matches);
  const matchedEntryIds = summaryList.map((s) => s.entryId);
  const summaryById = new Map(summaryList.map((s) => [s.entryId, s]));

  const toInclude = entries.filter((e) => {
    if (forcedEntryIds.has(e.id)) return true;
    if (e.ai_scope === "never") return false;
    if (e.ai_scope === "always") return true;
    return summaryById.has(e.id);
  });

  if (toInclude.length === 0) {
    return {
      block: "",
      matchedEntryIds,
      matchedEntryCount: matchedEntryIds.length,
      entriesIncluded: [],
      entriesTrimmed: [],
      tokensUsed: 0,
    };
  }

  const ranked = rankEntries(toInclude, summaryById, forcedEntryIds);

  /* Adaptive per-entry description cap — if the codex is small, give each
   * entry more room; if it's large, tighten up. Everyone still subject to
   * the global budget below. */
  const perEntryDescCap =
    ranked.length <= 4 ? 800 : ranked.length <= 12 ? 500 : 300;

  // Progressions: fetch last 5 per included entry with the spec's
  // no-future-spoilers filter (prior books, OR current book's earlier
  // chapters when currentChapterNumber is known).
  const progressionsByEntry = includeSeries && !options.entriesOverride
    ? await fetchRecentProgressionsPerEntry(supabase, {
        bookId,
        seriesId,
        entryIds: ranked.map((e) => e.id),
        currentChapterNumber: options.currentChapterNumber,
      })
    : new Map<string, ProgressionSnippet[]>();

  const header = "<worldbook>";
  const footer = "</worldbook>";
  const headerTokens = estimateTokens(header) + estimateTokens(footer);

  const includedIds: string[] = [];
  const trimmedIds: string[] = [];
  const renderedLines: string[] = [];

  let usedTokens = headerTokens;

  for (const entry of ranked) {
    const progs = progressionsByEntry.get(entry.id) ?? [];
    const rendered = renderEntry(entry, {
      trimmed: false,
      descriptionCharLimit: perEntryDescCap,
      progressions: progs,
    });
    const cost = estimateTokens(rendered);
    if (usedTokens + cost <= tokenBudget) {
      renderedLines.push(rendered);
      includedIds.push(entry.id);
      usedTokens += cost;
      continue;
    }

    /* Over budget — retry without progressions before falling back to a
     * stub, since the entry definition itself is more valuable than the
     * event list. Then stub as a last resort. */
    const noProg = renderEntry(entry, {
      trimmed: false,
      descriptionCharLimit: perEntryDescCap,
    });
    const noProgCost = estimateTokens(noProg);
    if (usedTokens + noProgCost <= tokenBudget) {
      renderedLines.push(noProg);
      includedIds.push(entry.id);
      usedTokens += noProgCost;
      continue;
    }

    const stub = renderEntry(entry, {
      trimmed: true,
      descriptionCharLimit: perEntryDescCap,
    });
    const stubCost = estimateTokens(stub);
    if (usedTokens + stubCost > tokenBudget) {
      break;
    }
    renderedLines.push(stub);
    trimmedIds.push(entry.id);
    usedTokens += stubCost;
  }

  if (renderedLines.length === 0) {
    return {
      block: "",
      matchedEntryIds,
      matchedEntryCount: matchedEntryIds.length,
      entriesIncluded: [],
      entriesTrimmed: [],
      tokensUsed: 0,
    };
  }

  const block = `\n\n${header}\n${renderedLines.join("\n")}\n${footer}`;

  /* Info-level audit log when codex context runs against a series book (spec
   * 16.3 requires this so authors can reason about *why* the model knows what
   * it knows). We deliberately log IDs rather than names to keep log lines
   * bounded regardless of custom field bloat; a developer who needs the full
   * payload can re-run the builder with `options.entriesOverride` locally. */
  if (includeSeries && seriesId) {
    const progEntries = Array.from(progressionsByEntry.keys());
    const progCount = Array.from(progressionsByEntry.values()).reduce(
      (n, list) => n + list.length,
      0,
    );
    // eslint-disable-next-line no-console
    console.info("[codex] series block built", {
      bookId,
      seriesId,
      currentChapterNumber: options.currentChapterNumber ?? null,
      entriesIncluded: includedIds,
      entriesTrimmed: trimmedIds,
      progressionEntries: progEntries,
      progressionCount: progCount,
      forcedEntryIds: Array.from(forcedEntryIds),
      tokensUsed: estimateTokens(block),
    });
  }

  return {
    block,
    matchedEntryIds,
    matchedEntryCount: matchedEntryIds.length,
    entriesIncluded: includedIds,
    entriesTrimmed: trimmedIds,
    tokensUsed: estimateTokens(block),
  };
}

/**
 * Convenience wrapper: accepts an already-built system prompt and returns it
 * with the codex block appended (or unchanged when the block is empty).
 * Callers who want to splice between style_examples and codex use this.
 */
export async function withCodexBlock(
  supabase: SupabaseClient<Database>,
  bookId: string,
  textContext: string,
  systemPrompt: string,
  options?: BuildCodexBlockOptions,
): Promise<string> {
  const { block } = await buildCodexBlock(
    supabase,
    bookId,
    textContext,
    options,
  );
  return block.length > 0 ? `${systemPrompt}${block}` : systemPrompt;
}

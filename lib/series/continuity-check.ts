/**
 * Background continuity (plot-hole) detection for fiction books.
 *
 * Spec: Prompt 16 § 294-305.
 * "When generating a chapter in Book 3 that mentions 'Faiga remembered the
 *  day Dmitri taught her to fix the thruster,' run a background check:
 *  - Fetch progressions for Dmitri and Faiga
 *  - Ask a cheap model: 'Given these prior events, is the following
 *    statement consistent? [current generation]. Return either OK or a
 *    JSON object explaining the contradiction.'
 *  - If flagged, surface a non-blocking warning in the editor"
 *
 * Pipeline (one call to `runContinuityCheckForChapter`):
 *   1. Skip unless `books.continuity_checks_enabled` is true.
 *   2. Detect canonical codex entries whose name / alias appears in the
 *      chapter text (case-insensitive word-boundary match). For series
 *      books this includes series/shared + project scope; for standalone
 *      books it includes project scope.
 *   3. For those entities, fetch their `codex_progressions` that happened
 *      earlier in the reading order (prior books in the series by
 *      `series_order` when applicable, plus earlier chapters of the
 *      current book).
 *   4. Ask gpt-4o-mini to compare passages in the chapter against those
 *      progressions and emit any contradictions as structured JSON.
 *   5. Replace the chapter's `status='active'` warnings with the fresh
 *      batch (regeneration-safe: dismissed/resolved warnings are never
 *      touched so the user doesn't have to dismiss the same thing twice).
 *
 * Never throws — every path returns a discriminated status so the caller
 * (detached from the generate-chapter response) can log and move on.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { SERIES_CONTINUITY_CHECK_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { getOpenAI, isOpenAIConfigError } from "@/lib/openai/client";
import { logSeriesAiGeneration } from "@/lib/series/observability";
import { logServerError } from "@/lib/utils/errors";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database, Json } from "@/types/database.types";

type SupabaseDb = SupabaseClient<Database>;

/** Cheap model; the task is a narrow classification, not generation. */
const CONTINUITY_MODEL = "gpt-4o-mini";

/** Max chars of chapter text we hand the model — keeps cost bounded. */
const MAX_CHAPTER_CHARS = 30_000;

/** Max progressions we attach per entity (recency-biased). */
const MAX_PROGRESSIONS_PER_ENTITY = 20;

/** Max number of detected entities we actually ship to the model. */
const MAX_ENTITIES_PER_RUN = 12;

const SYSTEM_PROMPT = SERIES_CONTINUITY_CHECK_SYSTEM_PROMPT;

type ModelWarning = {
  excerpt: string;
  issue: string;
  suggestion: string | null;
  entity_names: string[];
};

type CodexEntryRow = {
  id: string;
  name: string;
  aliases: string[];
  entry_type: string;
  summary: string | null;
  description_md: string | null;
  custom_fields: Json;
};

type ProgressionRow = {
  id: string;
  codex_entry_id: string;
  book_id: string;
  chapter_id: string | null;
  event_type: string;
  description: string;
};

export type RunContinuityCheckResult =
  | {
      status: "ok";
      warningsDetected: number;
      entitiesScanned: number;
    }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

function renderCustomFields(custom: Json): string[] {
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
    lines.push(`${label}: ${sanitizeText(rendered)}`);
  }
  return lines;
}

function hasAnyCanon(entry: CodexEntryRow): boolean {
  if (entry.summary?.trim()) return true;
  if (entry.description_md?.trim()) return true;
  return renderCustomFields(entry.custom_fields).length > 0;
}

/* ------------------------------------------------------------------ */
/*  Entity detection                                                   */
/* ------------------------------------------------------------------ */

/** Escape regex metacharacters in a name / alias for safe dynamic use. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Case-insensitive whole-word search. A name mentioned in `text` at least
 * once counts as "mentioned" — we don't weight by frequency here, we just
 * want to know who is on-stage so we can attach their history.
 */
export function detectMentionedEntities(
  text: string,
  entries: ReadonlyArray<CodexEntryRow>,
): CodexEntryRow[] {
  if (!text || entries.length === 0) return [];
  const hay = text.toLowerCase();
  const out: CodexEntryRow[] = [];
  for (const e of entries) {
    const candidates = [e.name, ...(e.aliases ?? [])]
      .map((s) => s?.trim())
      .filter((s): s is string => !!s && s.length >= 2);
    for (const raw of candidates) {
      const needle = raw.toLowerCase();
      /* Fast substring test first — avoids compiling a regex for every
       * entity when the text obviously doesn't contain the name. */
      if (!hay.includes(needle)) continue;
      /* Confirm word-boundary match so "Al" doesn't match "Algorithm". */
      const pattern = new RegExp(`\\b${escapeRegex(raw)}\\b`, "i");
      if (pattern.test(text)) {
        out.push(e);
        break;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Progression lookup                                                 */
/* ------------------------------------------------------------------ */

/**
 * Fetch progressions for the given entities, scoped to reading order —
 * prior books (lower `series_order`) in this series + earlier chapters of
 * the current book. Mirrors the filter used in
 * `lib/ai/codex-context.ts::fetchRecentProgressionsPerEntry` so the
 * continuity check sees the same history the author's codex surfaces.
 */
async function fetchPriorProgressions(
  supabase: SupabaseDb,
  opts: {
    seriesId: string | null;
    currentBookId: string;
    currentBookOrder: number | null;
    currentChapterNumber: number | null;
    entryIds: string[];
  },
): Promise<ProgressionRow[]> {
  if (opts.entryIds.length === 0) return [];

  /* Prior books in this series = same series_id, lower series_order. */
  const priorBookIds: string[] = [];
  if (opts.seriesId && opts.currentBookOrder != null) {
    const { data: priorBooks } = await supabase
      .from("books")
      .select("id")
      .eq("series_id", opts.seriesId)
      .lt("series_order", opts.currentBookOrder);
    for (const b of priorBooks ?? []) priorBookIds.push(b.id);
  }

  const rows: ProgressionRow[] = [];

  if (priorBookIds.length > 0) {
    const { data: priorProgs } = await supabase
      .from("codex_progressions")
      .select(
        "id, codex_entry_id, book_id, chapter_id, event_type, description",
      )
      .in("codex_entry_id", opts.entryIds)
      .in("book_id", priorBookIds)
      .order("created_at", { ascending: true });
    for (const p of priorProgs ?? []) rows.push(p);
  }

  /* Earlier chapters of the CURRENT book. codex_progressions.chapter_id is
   * nullable; filter by chapter number via a join on chapters. */
  if (opts.currentChapterNumber != null && opts.currentChapterNumber > 1) {
    const { data: earlierChapters } = await supabase
      .from("chapters")
      .select("id")
      .eq("book_id", opts.currentBookId)
      .lt("chapter_number", opts.currentChapterNumber);
    const earlierIds = (earlierChapters ?? []).map((r) => r.id);
    if (earlierIds.length > 0) {
      const { data: sameBookProgs } = await supabase
        .from("codex_progressions")
        .select(
          "id, codex_entry_id, book_id, chapter_id, event_type, description",
        )
        .in("codex_entry_id", opts.entryIds)
        .eq("book_id", opts.currentBookId)
        .in("chapter_id", earlierIds)
        .order("created_at", { ascending: true });
      for (const p of sameBookProgs ?? []) rows.push(p);
    }
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Model call                                                         */
/* ------------------------------------------------------------------ */

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

function coerceWarnings(raw: unknown): ModelWarning[] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.warnings)) return [];
  const out: ModelWarning[] = [];
  for (const row of o.warnings) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const excerpt = typeof r.excerpt === "string" ? r.excerpt.trim() : "";
    const issue = typeof r.issue === "string" ? r.issue.trim() : "";
    if (!excerpt || !issue) continue;
    const suggestion =
      typeof r.suggestion === "string" && r.suggestion.trim().length > 0
        ? r.suggestion.trim()
        : null;
    const names: string[] = Array.isArray(r.entity_names)
      ? (r.entity_names.filter((x) => typeof x === "string") as string[])
      : [];
    out.push({ excerpt: excerpt.slice(0, 200), issue, suggestion, entity_names: names });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

export type RunContinuityCheckOptions = {
  /* Optional: override the text to analyze (defaults to the chapter's
   * persisted content). Lets the caller reuse in-memory output from the
   * generator before the transaction commits. */
  chapterContentOverride?: string;
};

export async function runContinuityCheckForChapter(
  supabase: SupabaseDb,
  args: {
    bookId: string;
    chapterId: string;
    userId: string;
  },
  options: RunContinuityCheckOptions = {},
): Promise<RunContinuityCheckResult> {
  try {
    /* -- 1. Guardrails --------------------------------------------------- */
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select(
        "id, user_id, series_id, series_order, book_type",
      )
      .eq("id", args.bookId)
      .eq("user_id", args.userId)
      .maybeSingle();
    if (bookErr) {
      logServerError("continuity-check.book-fetch", bookErr);
      return { status: "error", reason: "book_fetch_failed" };
    }
    if (!book) return { status: "skipped", reason: "book_not_found" };

    let continuityChecksEnabled = true;
    const { data: continuityToggle, error: continuityToggleErr } = await supabase
      .from("books")
      .select("continuity_checks_enabled")
      .eq("id", args.bookId)
      .eq("user_id", args.userId)
      .maybeSingle();
    if (continuityToggleErr) {
      const missingColumn =
        continuityToggleErr.code === "42703" &&
        String(continuityToggleErr.message ?? "").includes("continuity_checks_enabled");
      if (!missingColumn) {
        logServerError("continuity-check.toggle-fetch", continuityToggleErr);
        return { status: "error", reason: "toggle_fetch_failed" };
      }
    } else if (continuityToggle) {
      continuityChecksEnabled = continuityToggle.continuity_checks_enabled;
    }

    if (!continuityChecksEnabled) {
      return { status: "skipped", reason: "disabled_by_book" };
    }
    if (book.book_type === "non_fiction") {
      return { status: "skipped", reason: "non_fiction" };
    }

    /* -- 2. Chapter --------------------------------------------------- */
    const { data: chapter, error: chErr } = await supabase
      .from("chapters")
      .select("id, book_id, chapter_number, title, content")
      .eq("id", args.chapterId)
      .eq("book_id", args.bookId)
      .maybeSingle();
    if (chErr) {
      logServerError("continuity-check.chapter-fetch", chErr);
      return { status: "error", reason: "chapter_fetch_failed" };
    }
    if (!chapter) return { status: "skipped", reason: "chapter_not_found" };

    const rawText =
      options.chapterContentOverride?.trim() || chapter.content?.trim() || "";
    if (rawText.length < 400) {
      /* Too short to contain a non-trivial contradiction; also avoids
       * wasting tokens on placeholder rows. */
      return { status: "skipped", reason: "chapter_too_short" };
    }
    const text =
      rawText.length > MAX_CHAPTER_CHARS
        ? rawText.slice(0, MAX_CHAPTER_CHARS)
        : rawText;

    /* -- 3. Codex entries + detect mentions ----------------------------- */
    let codexRows: CodexEntryRow[] = [];
    if (book.series_id) {
      const [seriesRes, projectRes] = await Promise.all([
        supabase
          .from("codex_entries")
          .select(
            "id, name, aliases, entry_type, summary, description_md, custom_fields",
          )
          .eq("series_id", book.series_id)
          .in("scope", ["series", "shared"]),
        supabase
          .from("codex_entries")
          .select(
            "id, name, aliases, entry_type, summary, description_md, custom_fields",
          )
          .eq("book_id", args.bookId)
          .eq("scope", "project"),
      ]);
      if (seriesRes.error || projectRes.error) {
        logServerError(
          "continuity-check.codex-fetch",
          seriesRes.error ?? projectRes.error,
        );
        return { status: "error", reason: "codex_fetch_failed" };
      }
      const byId = new Map<string, CodexEntryRow>();
      for (const row of (seriesRes.data ?? []) as CodexEntryRow[]) {
        byId.set(row.id, row);
      }
      for (const row of (projectRes.data ?? []) as CodexEntryRow[]) {
        byId.set(row.id, row);
      }
      codexRows = Array.from(byId.values());
    } else {
      const { data: projectRows, error: projectErr } = await supabase
        .from("codex_entries")
        .select(
          "id, name, aliases, entry_type, summary, description_md, custom_fields",
        )
        .eq("book_id", args.bookId)
        .eq("scope", "project");
      if (projectErr) {
        logServerError("continuity-check.codex-fetch", projectErr);
        return { status: "error", reason: "codex_fetch_failed" };
      }
      codexRows = (projectRows ?? []) as CodexEntryRow[];
    }
    const mentioned = detectMentionedEntities(text, codexRows).slice(
      0,
      MAX_ENTITIES_PER_RUN,
    );
    if (mentioned.length === 0) {
      /* No codex entities referenced — nothing to contradict. We
       * still clear stale active warnings so a passage that used to trip
       * the check but no longer does doesn't linger. */
      await clearActiveWarnings(supabase, args.chapterId);
      return { status: "skipped", reason: "no_entities_mentioned" };
    }

    /* -- 4. Progressions for those entities ----------------------------- */
    const progressions = await fetchPriorProgressions(supabase, {
      seriesId: book.series_id,
      currentBookId: args.bookId,
      currentBookOrder: book.series_order,
      currentChapterNumber: chapter.chapter_number,
      entryIds: mentioned.map((e) => e.id),
    });
    if (progressions.length === 0 && mentioned.every((e) => !hasAnyCanon(e))) {
      /* No prior canon to contradict; skip but clear stale warnings. */
      await clearActiveWarnings(supabase, args.chapterId);
      return { status: "skipped", reason: "no_prior_progressions" };
    }

    /* -- 5. Build the user turn ----------------------------------------- */
    const byEntity = new Map<string, ProgressionRow[]>();
    for (const p of progressions) {
      const arr = byEntity.get(p.codex_entry_id) ?? [];
      if (arr.length < MAX_PROGRESSIONS_PER_ENTITY) arr.push(p);
      byEntity.set(p.codex_entry_id, arr);
    }

    const castBlock = mentioned
      .map((e) => {
        const progs = byEntity.get(e.id) ?? [];
        const progLines = progs
          .map(
            (p) =>
              `  - [${p.event_type}] ${sanitizeText(p.description).slice(0, 400)}`,
          )
          .join("\n");
        const aliases =
          e.aliases?.length > 0 ? ` (aka ${e.aliases.join(", ")})` : "";
        const summary = e.summary?.trim()
          ? `\n  Summary: ${sanitizeText(e.summary.trim())}`
          : "";
        const desc = e.description_md?.trim()
          ? `\n  Description:\n${sanitizeText(e.description_md.trim())
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n")
              .slice(0, 2000)}`
          : "";
        const customLines = renderCustomFields(e.custom_fields);
        const customBlock = customLines.length > 0
          ? `\n  Canonical fields:\n${customLines.map((l) => `    ${l}`).join("\n")}`
          : "";
        return `### ${e.entry_type}: ${sanitizeText(e.name)}${aliases}${summary}${desc}${customBlock}\n  Prior events:\n${
          progLines || "    (no prior progressions tracked)"
        }`;
      })
      .join("\n\n");

    const userBlock = `## Prior canon (progressions from earlier in the series / earlier chapters)\n${castBlock}\n\n## Current chapter draft\nChapter ${chapter.chapter_number}${
      chapter.title ? ` — ${sanitizeText(chapter.title)}` : ""
    }\n\n${sanitizeText(text)}`;

    /* -- 6. Call the model --------------------------------------------- */
    let raw: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: CONTINUITY_MODEL,
        temperature: 0.1,
        max_tokens: 1_200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userBlock },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? "";
    } catch (e) {
      if (isOpenAIConfigError(e)) {
        return { status: "error", reason: "openai_not_configured" };
      }
      logServerError("continuity-check.openai", e);
      return { status: "error", reason: "openai_failed" };
    }

    const warnings = coerceWarnings(parseLooseJson(raw));
    if (warnings == null) {
      logServerError(
        "continuity-check.parse",
        new Error(`Invalid JSON: ${raw.slice(0, 200)}`),
      );
      return { status: "error", reason: "parse_failed" };
    }

    /* -- 7. Persist: clear active, insert new --------------------------- */
    await clearActiveWarnings(supabase, args.chapterId);

    /* Attach codex_entry_ids by matching entity_names back to the cast. */
    const nameToId = new Map<string, string>();
    for (const e of mentioned) {
      nameToId.set(e.name.toLowerCase(), e.id);
      for (const a of e.aliases ?? []) nameToId.set(a.toLowerCase(), e.id);
    }

    const rows = warnings
      .filter((w) => text.toLowerCase().includes(w.excerpt.toLowerCase().slice(0, 40)))
      .map((w) => {
        const ids = new Set<string>();
        for (const n of w.entity_names) {
          const id = nameToId.get(n.toLowerCase());
          if (id) ids.add(id);
        }
        return {
          book_id: args.bookId,
          chapter_id: args.chapterId,
          excerpt: w.excerpt,
          issue: w.issue,
          suggestion: w.suggestion,
          codex_entry_ids: Array.from(ids),
          status: "active" as const,
          model_output: {
            excerpt: w.excerpt,
            issue: w.issue,
            suggestion: w.suggestion,
            entity_names: w.entity_names,
          } as unknown as Json,
        };
      });

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from("continuity_warnings")
        .insert(rows);
      if (insErr) {
        logServerError("continuity-check.insert", insErr);
        return { status: "error", reason: "insert_failed" };
      }
    }

    /* Prompt 16 § 362-371: observability. Capture what the cheap
     * continuity model was shown — mentioned entities (codex ids) and
     * the prior progressions that framed the classification. Helps
     * diagnose false positives / missed contradictions. */
    const progressionBookIds = Array.from(
      new Set(progressions.map((p) => p.book_id)),
    );
    if (book.series_id) {
      void logSeriesAiGeneration(supabase, {
        userId: args.userId,
        seriesId: book.series_id,
        bookId: args.bookId,
        chapterId: args.chapterId,
        operation: "continuity_check",
        model: CONTINUITY_MODEL,
        context: {
          blocksUsed: {
            series_codex: true,
            progressions: progressions.length > 0,
          },
          priorBooksCount: progressionBookIds.length,
          progressionsCount: progressions.length,
          codexEntriesCount: mentioned.length,
          arcIds: [],
          codexEntryIds: mentioned.map((e) => e.id),
          priorBookIds: progressionBookIds,
        },
        metadata: {
          warnings_detected: rows.length,
          entities_scanned: mentioned.length,
          chapter_number: chapter.chapter_number,
          hasDescriptions: mentioned.filter((e) => e.description_md?.trim()).length,
        },
      });
    } else {
      console.info("[continuity-check] standalone", {
        bookId: args.bookId,
        chapterId: args.chapterId,
        warningsDetected: rows.length,
        entitiesScanned: mentioned.length,
        progressionsCount: progressions.length,
        hasDescriptions: mentioned.filter((e) => e.description_md?.trim()).length,
      });
    }

    return {
      status: "ok",
      warningsDetected: rows.length,
      entitiesScanned: mentioned.length,
    };
  } catch (e) {
    logServerError("continuity-check.unexpected", e);
    return { status: "error", reason: "unexpected" };
  }
}

/**
 * Drop every `status='active'` warning for a chapter. Dismissed/resolved
 * rows are preserved so the editor keeps audit history and the user
 * doesn't have to re-dismiss false positives after every regeneration.
 */
async function clearActiveWarnings(
  supabase: SupabaseDb,
  chapterId: string,
): Promise<void> {
  const { error } = await supabase
    .from("continuity_warnings")
    .delete()
    .eq("chapter_id", chapterId)
    .eq("status", "active");
  if (error) {
    logServerError("continuity-check.clear-active", error);
  }
}

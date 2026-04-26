/**
 * Auto-summarization for chapter context.
 *
 * Every AI generation that consumes prior chapters needs a compact,
 * consistent summary — raw prose blows through the token budget after
 * three or four chapters. This module owns:
 *
 *  - `summarizeChapter(chapterId)` — fetches content, calls a cheap
 *    model, stores the result in `chapters.ai_summary`.
 *  - `isSummaryStale(...)` — pure helper used both by the summarizer
 *    itself and by the enqueue path, so a fresh save that already has
 *    an up-to-date summary short-circuits without a DB write.
 *
 * Server-action wrappers (for calling from client components) live in
 * `./auto-summarize-actions.ts` because Next's `"use server"` directive
 * requires every export of that file to be an async server action.
 *
 * The staleness detector stores `${wordCount}:${sha256Short}` in
 * `ai_summary_hash`, so we can tell both:
 *   1. whether the content has changed at all (hash comparison)
 *   2. by how much, in word-count terms (delta vs. stored word count)
 * without needing a second column.
 */
import { createHash } from "crypto";

import { getOpenAI } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";
import { sanitizeText } from "@/lib/utils/sanitize";

/** Word-count floor below which a summary is not worth the API call. */
export const MIN_WORDS_FOR_SUMMARY = 200;

/** Regenerate when |newWords - sourceWords| / sourceWords > 10%. */
export const STALE_WORD_COUNT_DELTA = 0.1;

/** Model used for summarization. Cheap + plenty good enough for paragraph-level. */
const SUMMARIZER_MODEL = "gpt-4o-mini";

const SUMMARIZER_SYSTEM_PROMPT =
  "You summarize fiction chapters for context passing. Produce a single " +
  "paragraph (max 120 words) covering: what happens, who is present, " +
  "what changes by end of chapter, and any named entities introduced. " +
  "Third person, past tense, neutral voice. No commentary.";

/** Soft cap on how much content we hand the summarizer — long chapters still fit. */
const MAX_SUMMARIZER_INPUT_CHARS = 60_000;
const MAX_CAST_HINT_ENTRIES = 15;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

/** `${wordCount}:${sha256Short}` — survives round-trip parse. */
function formatHash(wordCount: number, contentSha: string): string {
  return `${wordCount}:${contentSha}`;
}

function parseHash(
  raw: string | null,
): { wordCount: number; sha: string } | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx < 0) return null;
  const wc = Number(raw.slice(0, idx));
  const sha = raw.slice(idx + 1);
  if (!Number.isFinite(wc) || wc < 0 || !sha) return null;
  return { wordCount: wc, sha };
}

/** True when the stored summary is missing, hash-mismatched, or word-delta > 10%. */
export function isSummaryStale(params: {
  currentContent: string | null;
  storedSummary: string | null;
  storedHash: string | null;
}): boolean {
  const content = params.currentContent?.trim() ?? "";
  if (!content) return false;
  const words = countWords(content);
  if (words < MIN_WORDS_FOR_SUMMARY) return false;
  if (!params.storedSummary || params.storedSummary.trim().length === 0) {
    return true;
  }
  const parsed = parseHash(params.storedHash);
  if (!parsed) return true;
  if (parsed.sha === hashContent(content)) {
    return false;
  }
  const base = Math.max(parsed.wordCount, 1);
  const delta = Math.abs(words - parsed.wordCount) / base;
  return delta > STALE_WORD_COUNT_DELTA;
}

export type SummarizeChapterResult =
  | { status: "ok"; summary: string; hash: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

/**
 * Run the summarizer for ONE chapter. Safe to call from the request
 * handler that just persisted content, or from a detached Promise.
 *
 * Never throws — returns a discriminated status so the caller can log
 * instead of bubbling an error into the user's save flow.
 */
export async function summarizeChapter(
  chapterId: string,
): Promise<SummarizeChapterResult> {
  try {
    const supabase = await createClient();

    const { data: chapter, error: fetchErr } = await supabase
      .from("chapters")
      .select("id, book_id, content, ai_summary, ai_summary_hash")
      .eq("id", chapterId)
      .maybeSingle();

    if (fetchErr) {
      logServerError("auto-summarize.fetch", fetchErr);
      return { status: "error", reason: "fetch_failed" };
    }
    if (!chapter) {
      return { status: "skipped", reason: "not_found" };
    }

    const content = (chapter.content ?? "").trim();
    if (!content) {
      return { status: "skipped", reason: "empty_content" };
    }

    const words = countWords(content);
    if (words < MIN_WORDS_FOR_SUMMARY) {
      return { status: "skipped", reason: "too_short" };
    }

    if (
      !isSummaryStale({
        currentContent: content,
        storedSummary: chapter.ai_summary,
        storedHash: chapter.ai_summary_hash,
      })
    ) {
      return { status: "skipped", reason: "up_to_date" };
    }

    const sanitized = sanitizeText(content).slice(0, MAX_SUMMARIZER_INPUT_CHARS);
    const loweredChapter = sanitized.toLowerCase();
    let castHintBlock = "";
    try {
      const { data: bookRow, error: bookErr } = await supabase
        .from("books")
        .select("series_id")
        .eq("id", chapter.book_id)
        .maybeSingle();
      if (bookErr) {
        logServerError("auto-summarize.cast.book", bookErr);
      } else {
        const { data: projectRows, error: projectErr } = await supabase
          .from("codex_entries")
          .select("id, name, entry_type, aliases")
          .eq("book_id", chapter.book_id)
          .eq("scope", "project");
        if (projectErr) {
          logServerError("auto-summarize.cast.project", projectErr);
        }
        const project = (projectRows ?? []) as Array<{
          id: string;
          name: string;
          entry_type: string | null;
          aliases: string[] | null;
        }>;
        let merged = [...project];
        if (bookRow?.series_id) {
          const { data: seriesRows, error: seriesErr } = await supabase
            .from("codex_entries")
            .select("id, name, entry_type, aliases")
            .eq("series_id", bookRow.series_id)
            .in("scope", ["series", "shared"])
            .neq("ai_scope", "never");
          if (seriesErr) {
            logServerError("auto-summarize.cast.series", seriesErr);
          } else {
            const byId = new Map<string, (typeof merged)[number]>();
            for (const row of merged) byId.set(row.id, row);
            for (const row of (seriesRows ?? []) as typeof merged) {
              if (!byId.has(row.id)) byId.set(row.id, row);
            }
            merged = Array.from(byId.values());
          }
        }
        const castRows = merged
          .filter((r) => {
            const name = sanitizeText(r.name ?? "").trim();
            return name.length > 0 && loweredChapter.includes(name.toLowerCase());
          })
          .slice(0, MAX_CAST_HINT_ENTRIES);
        if (castRows.length > 0) {
          const lines = castRows.map((row) => {
            const canonical = sanitizeText((row.name ?? "").trim());
            const type = sanitizeText((row.entry_type ?? "entry").trim());
            const aliases = (row.aliases ?? [])
              .map((a) => sanitizeText(a).trim())
              .filter(Boolean)
              .slice(0, 3);
            const aliasPart = aliases.length > 0 ? ` — aka ${aliases.join(", ")}` : "";
            return `- ${canonical} (${type})${aliasPart}`;
          });
          castHintBlock =
            "Cast present in this chapter (use canonical names):\n" +
            lines.join("\n");
        }
      }
    } catch (e) {
      logServerError("auto-summarize.cast", e);
    }

    let summary: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: SUMMARIZER_MODEL,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
          {
            role: "user",
            content: castHintBlock ? `${castHintBlock}\n\n${sanitized}` : sanitized,
          },
        ],
      });
      summary = (completion.choices[0]?.message?.content ?? "").trim();
    } catch (e) {
      logServerError("auto-summarize.openai", e);
      return { status: "error", reason: "openai_failed" };
    }

    if (!summary) {
      return { status: "error", reason: "empty_summary" };
    }

    const hash = formatHash(words, hashContent(content));

    const { error: updateErr } = await supabase
      .from("chapters")
      .update({
        ai_summary: summary,
        ai_summary_hash: hash,
        ai_summary_updated_at: new Date().toISOString(),
      })
      .eq("id", chapterId);

    if (updateErr) {
      logServerError("auto-summarize.update", updateErr);
      return { status: "error", reason: "update_failed" };
    }

    return { status: "ok", summary, hash };
  } catch (e) {
    logServerError("auto-summarize.unexpected", e);
    return { status: "error", reason: "unexpected" };
  }
}

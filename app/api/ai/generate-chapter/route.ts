/**
 * Full-chapter generation streams markdown through the model router. The client
 * consumes the Vercel data stream format (`readDataStream` / `useChapter`).
 */
import { StreamingTextResponse, formatStreamPart } from "ai";

import { snapshotChapter } from "@/lib/book/revisions";
import { characterBibleToPromptText } from "@/lib/ai/character-bible-prompt";
import { buildCodexBlock } from "@/lib/ai/codex-context";
import { generateWithFailover } from "@/lib/ai/model-router";
import { buildGenerateChapterPipeline } from "@/lib/ai/pipeline";
import { extractTrailingProse } from "@/lib/prose/trailing";
import { summarizeChapter } from "@/lib/ai/auto-summarize";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { buildSeriesContinuityForChapterPrompt } from "@/lib/series/continuity";
import { runContinuityCheckForChapter } from "@/lib/series/continuity-check";
import {
  emptySeriesContextMeta,
  logSeriesAiGeneration,
  type SeriesContextMeta,
} from "@/lib/series/observability";
import { createClient } from "@/lib/supabase/server";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { ChapterRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import {
  parseRefinedIdeaFromDb,
  refinedIdeaToPositioningBlock,
} from "@/lib/refined-idea/parse";
import {
  formatReaderArcLinesFromFields,
  pickReaderArcFieldsFromBrief,
  type ReaderArcFields,
} from "@/lib/refined-idea/reader-arc";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const streamProtocolEncoder = new TextEncoder();

/** Data-protocol hint for the client: DB revert may not have run; refresh. */
function encodeDataRevertStuckHint(): Uint8Array {
  return streamProtocolEncoder.encode(
    formatStreamPart("data", [
      { chapterai: "revert_may_have_failed" } as { chapterai: string },
    ]) + "\n",
  );
}

/** Data-protocol hint for the client: no codex terms auto-matched. */
function encodeDataCodexNoAutoMatchHint(): Uint8Array {
  return streamProtocolEncoder.encode(
    formatStreamPart("data", [{ chapterai: "codex_no_auto_match" } as { chapterai: string }]) +
      "\n",
  );
}

type RevertToPendingResult = { ok: true } | { ok: false; error: unknown };

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function inferChapterTargetWords(genre: string | null): number {
  if (!genre) return 2500;
  const g = genre.toLowerCase();
  const nonfictionHints = [
    "nonfiction",
    "non-fiction",
    "memoir",
    "biography",
    "self-help",
    "business",
    "history",
    "essay",
    "reference",
    "technical",
    "how-to",
    "how to",
    "guide",
    "philosophy",
    "science",
    "cookbook",
    "travel",
    "journalism",
    "textbook",
  ];
  const fictionHints = [
    "fiction",
    "novel",
    "fantasy",
    "sci-fi",
    "scifi",
    "science fiction",
    "romance",
    "thriller",
    "mystery",
    "horror",
    "literary",
    "young adult",
    "ya ",
    "drama",
    "adventure",
    "speculative",
    "magic",
    "paranormal",
    "historical fiction",
    "crime",
    "urban fantasy",
    "dystopian",
  ];
  if (nonfictionHints.some((h) => g.includes(h))) return 2000;
  if (fictionHints.some((h) => g.includes(h))) return 3000;
  return 2500;
}

function formatForbiddenMovesForPrompt(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join("; ");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

type BriefCraftFields = ReaderArcFields & {
  voice_anchor: string;
  authorial_stance: string;
  cultural_texture: string;
  forbidden_moves: string;
};

function extractBriefCraftFromRefined(refined: Json | null): BriefCraftFields {
  const empty: BriefCraftFields = {
    voice_anchor: "",
    authorial_stance: "",
    cultural_texture: "",
    forbidden_moves: "",
    emotional_contract: "",
    arc_shape: "",
    reader_before_state: "",
    reader_after_state: "",
  };
  const p = parseRefinedIdeaFromDb(
    refined,
    "generate-chapter.brief-craft",
    { logFailure: true },
  );
  if (!p.ok || !p.data) {
    return empty;
  }
  const b = p.data;
  const arc = pickReaderArcFieldsFromBrief(b);
  return {
    voice_anchor: typeof b.voice_anchor === "string" ? b.voice_anchor.trim() : "",
    authorial_stance: typeof b.authorial_stance === "string" ? b.authorial_stance.trim() : "",
    cultural_texture: typeof b.cultural_texture === "string" ? b.cultural_texture.trim() : "",
    forbidden_moves: formatForbiddenMovesForPrompt(b.forbidden_moves),
    ...arc,
  };
}

/**
 * Picks the outline row whose `number` matches this chapter. No positional
 * fallback: non-sequential or missing numbers must not map to the wrong section.
 */
function pickOutlineSectionForChapter(
  sections: Json | null | undefined,
  chapterNumber: number,
): Record<string, unknown> | null {
  if (!Array.isArray(sections)) {
    return null;
  }
  for (const row of sections) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    if (typeof o.number === "number" && o.number === chapterNumber) {
      return o;
    }
  }
  return null;
}

function strField(o: Record<string, unknown> | null, key: string): string {
  if (!o) {
    return "";
  }
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

function codexIdArrayField(o: Record<string, unknown> | null, key: string): string[] {
  if (!o) return [];
  const v = o[key];
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

const OUTLINE_CODEX_TEXT_MAX_CHARS = 12_000;

function collectStringLeaves(value: unknown, out: string[], seen: Set<string>): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringLeaves(item, out, seen);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    collectStringLeaves(nested, out, seen);
  }
}

/**
 * Build a broad text window from the current outline section so codex entries
 * mentioned in structured fields (not just `outline_summary`) can auto-match.
 */
function buildOutlineSectionCodexText(
  outlineSection: Record<string, unknown> | null,
): string {
  if (!outlineSection) return "";
  const lines: string[] = [];
  const seen = new Set<string>();
  collectStringLeaves(outlineSection, lines, seen);
  const joined = lines.join("\n");
  if (!joined) return "";
  return joined.length <= OUTLINE_CODEX_TEXT_MAX_CHARS
    ? joined
    : joined.slice(0, OUTLINE_CODEX_TEXT_MAX_CHARS);
}

function buildBookContext(params: {
  title: string;
  genre: string | null;
  tone: string | null;
  refinedIdea: Json | null;
  chapterOutline: string | null;
  chapterTitle: string;
  authorNotes: string | null;
  bookType: BookTypeDb;
  briefCraft: BriefCraftFields;
  outlineSection: Record<string, unknown> | null;
}): string {
  const title = sanitizeText(params.title.trim() || "Untitled");
  const genre = params.genre ? sanitizeText(params.genre) : null;
  const tone = params.tone ? sanitizeText(params.tone) : null;
  const block = refinedIdeaToPositioningBlock(
    params.refinedIdea,
    "generate-chapter.build-book-context",
  );
  const refined = block ? sanitizeText(block) : null;
  const chapterTitle = sanitizeText(params.chapterTitle.trim() || "Untitled");
  const outlineRaw =
    params.chapterOutline?.trim() ||
    "No outline summary supplied; infer from book context.";
  const outline = sanitizeText(outlineRaw);
  const authorNotes = params.authorNotes?.trim()
    ? sanitizeText(params.authorNotes.trim()).slice(0, 4_000)
    : null;

  const s = params.outlineSection;
  const isNonFiction = params.bookType === "non_fiction";

  const craftBlockLines: string[] = isNonFiction
    ? [
        "CURRENT CHAPTER CRAFT TARGETS (from outline):",
        `Opening hook move: ${
          strField(s, "opening_hook_move") || "(not set — infer from outline text below)"
        }`,
        `Signature example to anchor the chapter: ${
          strField(s, "signature_example") || "(not set)"
        }`,
        `Ending must bridge to: ${
          strField(s, "bridges_to_next") || "(not set)"
        }`,
        "",
      ]
    : [
        "CURRENT CHAPTER CRAFT TARGETS (from outline):",
        `Opening move: ${
          strField(s, "opening_psychological_move") || "(not set — infer from outline text below)"
        }`,
        `Signature detail to include: ${
          strField(s, "signature_chapter_detail") || "(not set)"
        }`,
        `Ending must open: ${
          strField(s, "ending_opens_what") || "(not set)"
        }`,
        "",
      ];

  const bc = params.briefCraft;
  const voiceBlockLines = [
    `VOICE ANCHOR (match this prose style): ${
      bc.voice_anchor || "(not set in brief — infer from full brief below)"
    }`,
    `AUTHORIAL STANCE: ${bc.authorial_stance || "(not set)"}`,
    `CULTURAL TEXTURE (use these words without explaining them): ${
      bc.cultural_texture || "(not set)"
    }`,
    `FORBIDDEN MOVES: ${bc.forbidden_moves || "(none listed)"}`,
    "",
  ];

  const readerArcLines = formatReaderArcLinesFromFields({
    emotional_contract: bc.emotional_contract,
    arc_shape: bc.arc_shape,
    reader_before_state: bc.reader_before_state,
    reader_after_state: bc.reader_after_state,
  });
  const readerArcSection =
    readerArcLines.length > 0 ? [...readerArcLines, ""] : [];

  const lines = [
    ...craftBlockLines,
    ...voiceBlockLines,
    ...readerArcSection,
    `Book title: ${title}`,
    genre ? `Genre: ${genre}` : null,
    tone ? `Tone: ${tone}` : null,
    refined ? `Refined brief / positioning:\n${refined}` : null,
    "",
    `Current chapter: ${chapterTitle}`,
    `Chapter outline (follow closely):\n${outline}`,
    authorNotes
      ? `\nAuthor steering notes (these take precedence when they conflict with the outline; obey them unless they violate the book's tone or continuity):\n${authorNotes}`
      : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function summarizePriorChapter(row: {
  title: string;
  outline_summary: string | null;
  content: string | null;
}): string {
  const title = sanitizeText(row.title.trim() || "Untitled");
  const outline = row.outline_summary?.trim();
  if (outline) {
    return `### ${title}\n${sanitizeText(outline)}`;
  }
  const body = row.content?.trim();
  if (body) {
    const excerpt = sanitizeText(body.slice(0, 1200));
    return `### ${title}\nSummary (excerpt from manuscript): ${excerpt}${body.length > 1200 ? "…" : ""}`;
  }
  return `### ${title}\n(No outline or draft text on file.)`;
}

export async function POST(request: Request) {
  let chapterIdForRevert: string | null = null;
  let bookIdForRevert: string | null = null;
  let shouldRevertOnStreamError = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = ChapterRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const {
      bookId,
      chapterId,
      regenerateForOutline,
      selectedCodexEntryIds,
    } = parsed.data;
    chapterIdForRevert = chapterId;
    bookIdForRevert = bookId;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "generate-chapter");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, tone, refined_idea, book_type, character_bible, series_id, series_order, style_examples, style_instructions",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("generate-chapter.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "generate-chapter.profile-create",
          new Error(
            `${ensured.error}${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` | ${ensured.hint}` : ""}`,
          ),
        );
        return apiJsonError(
          `Could not initialize profile.${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` ${ensured.hint}` : ""}`,
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      profile = { subscription_tier: "free" };
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select(
        "id, book_id, title, outline_summary, author_notes, chapter_number, status, target_word_count",
      )
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (
      profile.subscription_tier === "free" &&
      chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
    ) {
      return apiJsonError(
        `Free plan includes AI generation for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro to generate chapter ${chapter.chapter_number} and beyond.`,
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    if (book.series_id && profile.subscription_tier !== "pro") {
      return apiJsonError(
        "Series-linked books are a Pro feature.",
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { data: priorRows, error: priorError } = await supabase
      .from("chapters")
      .select(
        "chapter_number, title, outline_summary, content, status, ai_summary",
      )
      .eq("book_id", bookId)
      .lt("chapter_number", chapter.chapter_number)
      .in("status", ["draft", "edited", "approved"])
      .order("chapter_number", { ascending: true });

    if (priorError) {
      logServerError("generate-chapter.prior-chapters", priorError);
      return apiJsonError(
        "Could not load prior chapters.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const { data: outlineRow, error: outlineError } = await supabase
      .from("outlines")
      .select("sections")
      .eq("book_id", bookId)
      .maybeSingle();

    if (outlineError) {
      logServerError("generate-chapter.outline", outlineError);
    }

    const priorSummaries = (priorRows ?? []).map(summarizePriorChapter);

    /* Last ~500 words of the chapter IMMEDIATELY before this one —
     * models need the actual prose, not just a summary, to pick up the
     * in-progress voice, scene grammar, and sentence rhythm. Summaries
     * give structural continuity (who / what / where); the tail prose
     * gives textural continuity. `ai_summary` is preferred for the
     * summary-per-chapter block when present; we fall back to
     * outline_summary (which `summarizePriorChapter` already does). */
    const immediatelyPrior = priorRows?.[priorRows.length - 1];
    const precedingProse = immediatelyPrior?.content
      ? extractTrailingProse(immediatelyPrior.content, 500)
      : "";

    const targetWords =
      chapter.target_word_count && chapter.target_word_count > 0
        ? chapter.target_word_count
        : inferChapterTargetWords(book.genre);

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;
    const briefCraft = extractBriefCraftFromRefined(book.refined_idea);
    const outlineSections = outlineRow?.sections ?? null;
    const outlineSection = pickOutlineSectionForChapter(
      outlineSections,
      chapter.chapter_number,
    );
    const outlineForcedCodexEntryIds = codexIdArrayField(
      outlineSection,
      "forced_codex_entry_ids",
    );
    const outlineCodexText = buildOutlineSectionCodexText(outlineSection);
    const autoForcedFromOutlineMentions = outlineCodexText
      ? (
          await buildCodexBlock(supabase, bookId, outlineCodexText, {
            tokenBudget: 1,
            currentChapterNumber: chapter.chapter_number,
          })
        ).matchedEntryIds
      : [];
    const mergedForcedCodexEntryIds = Array.from(
      new Set([
        ...(selectedCodexEntryIds ?? []),
        ...outlineForcedCodexEntryIds,
        ...autoForcedFromOutlineMentions,
      ]),
    );
    if (
      outlineSection === null &&
      Array.isArray(outlineSections) &&
      outlineSections.length > 0
    ) {
      console.warn(
        "[generate-chapter] No outline section matched chapter number; craft fields use (not set) fallbacks. " +
          JSON.stringify({
            bookId,
            chapterId: chapter.id,
            chapterNumber: chapter.chapter_number,
            sectionCount: outlineSections.length,
          }),
      );
    }

    const bookContext = buildBookContext({
      title: book.title,
      genre: book.genre,
      tone: book.tone,
      refinedIdea: book.refined_idea,
      chapterOutline: chapter.outline_summary,
      chapterTitle: chapter.title,
      authorNotes: chapter.author_notes,
      bookType,
      briefCraft,
      outlineSection,
    });
    const characterBibleText = characterBibleToPromptText(book.character_bible, {
      bookId,
    });

    const isInSeries = !!book.series_id;
    const seriesContinuityResult = isInSeries
      ? await buildSeriesContinuityForChapterPrompt(supabase, bookId, user.id)
      : null;
    const seriesContinuity = seriesContinuityResult?.text ?? null;
    const seriesContinuityMeta: SeriesContextMeta =
      seriesContinuityResult?.meta ?? emptySeriesContextMeta();

    const voiceAnchor =
      briefCraft.voice_anchor.trim().length > 0 ? briefCraft.voice_anchor : null;

    const codexAuthorNotes = chapter.author_notes?.trim()
      ? sanitizeText(chapter.author_notes.trim()).slice(0, 4_000)
      : "";
    const codexTextContext = [
      chapter.title,
      chapter.outline_summary ?? "",
      outlineCodexText,
      codexAuthorNotes,
      priorSummaries.join("\n"),
    ]
      .filter((s) => !!s)
      .join("\n");

    const priorChapters = (priorRows ?? []).flatMap((r) => {
      const summary = r.ai_summary?.trim() || r.outline_summary?.trim() || "";
      if (!summary) return [];
      return [
        {
          chapterNumber: r.chapter_number,
          title: r.title,
          summary,
        },
      ];
    });

    const { systemPrompt, userMessage, codexMatchedEntryCount } =
      await buildGenerateChapterPipeline({
      supabase,
      userId: user.id,
      projectId: bookId,
      chapterId,
      chapterNumber: chapter.chapter_number,
      chapterTitle: chapter.title,
      targetWords,
      bookType,
      bookContext,
      priorSummaries,
      characterBibleText,
      voiceAnchor,
      isInSeries,
      seriesContinuity,
      seriesContext:
        book.series_id && typeof book.series_order === "number"
          ? {
              seriesId: book.series_id,
              currentBookPosition: book.series_order,
            }
          : undefined,
      book: {
        title: book.title,
        genre: book.genre,
        refined_idea: book.refined_idea,
        style_examples: book.style_examples,
        style_instructions: book.style_instructions,
      },
      outlineSummary: chapter.outline_summary,
      authorNotes: chapter.author_notes,
      codexTextContext,
      forcedCodexEntryIds: mergedForcedCodexEntryIds,
      precedingProse,
      priorChapters,
    });
    const shouldNotifyCodexNoAutoMatch =
      mergedForcedCodexEntryIds.length === 0 &&
      codexMatchedEntryCount === 0;

    const { error: statusError } = await supabase
      .from("chapters")
      .update({ status: "generating" })
      .eq("id", chapterId)
      .eq("book_id", bookId);

    if (statusError) {
      logServerError("generate-chapter.status-update", statusError);
      return apiJsonError(
        "Could not start generation.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    shouldRevertOnStreamError = true;

    const encoder = new TextEncoder();

    let streamNotifyController: ReadableStreamDefaultController<Uint8Array> | null =
      null;

    const revertChapterToPending = async (): Promise<RevertToPendingResult> => {
      try {
        const sb = await createClient();
        const { error } = await sb
          .from("chapters")
          .update({ status: "pending" })
          .eq("id", chapterId)
          .eq("book_id", bookId);
        if (error) {
          logServerError("generate-chapter.revert-to-pending", error, {
            severity: "critical",
          });
          return { ok: false, error };
        }
        return { ok: true };
      } catch (e) {
        logServerError("generate-chapter.revert-to-pending-exception", e, {
          severity: "critical",
        });
        return { ok: false, error: e };
      }
    };

    const notifyStreamIfRevertFailed = async (rev: RevertToPendingResult) => {
      if (rev.ok) {
        return;
      }
      const c = streamNotifyController;
      if (!c) {
        return;
      }
      try {
        c.enqueue(encodeDataRevertStuckHint());
      } catch {
        /* stream may be closed */
      }
    };

    /** Reverts the chapter to `pending` and, on failure, sends a data-protocol hint. */
    const revertGenerationAndHint = async () => {
      const r = await revertChapterToPending();
      await notifyStreamIfRevertFailed(r);
      return r;
    };

    const encodeStreamError = (err: unknown): Uint8Array => {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "The writing assistant is temporarily unavailable.";
      return encoder.encode(formatStreamPart("error", msg) + "\n");
    };

    /**
     * Start the HTTP response immediately so the client does not sit in "pending"
     * with no headers until the model provider accepts the connection (which can take long
     * and triggers "Failed to fetch" on some networks / proxies / dev setups).
     */
    const piped = new ReadableStream<Uint8Array>({
      start(controller) {
        streamNotifyController = controller;
        if (shouldNotifyCodexNoAutoMatch) {
          controller.enqueue(encodeDataCodexNoAutoMatchHint());
        }
        void (async () => {
          let modelUsedForUsage = "";
          try {
            const streamResult = await generateWithFailover({
              primary: "openai",
              system: systemPrompt,
              prompt: userMessage,
              stream: true,
              temperature: 0.8,
              maxTokens: 16_384,
              route: "/api/ai/generate-chapter",
              userId: user.id,
            });
            const outStream = streamResult.stream;
            const finalResult = streamResult.finalResult;
            if (!outStream || !finalResult) {
              throw new Error("The writing assistant did not return a stream.");
            }

            const reader = outStream.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                if (value) {
                  controller.enqueue(value);
                }
              }

              const completion = await finalResult;
              modelUsedForUsage = completion.model_used;
              let contentPersisted = false;
              try {
                const sb = await createClient();
                const trimmed = completion.text.trim();
                if (!trimmed) {
                  await revertGenerationAndHint();
                  controller.close();
                  return;
                }

                const words = countWords(trimmed);

                const { data: freshChapter, error: freshErr } = await sb
                  .from("chapters")
                  .select("generation_count")
                  .eq("id", chapterId)
                  .eq("book_id", bookId)
                  .single();

                  if (freshErr || !freshChapter) {
                    await revertGenerationAndHint();
                    controller.close();
                    return;
                  }

                  /* Pre-update count is only for revision labels; the actual counter is
                   * incremented atomically in persist_chapter_generation (no read-then-write race). */
                  const priorGen = freshChapter.generation_count ?? 0;
                  const labelNext = priorGen + 1;
                  const snapshotSource = regenerateForOutline
                    ? "regenerate_for_outline"
                    : labelNext > 1
                      ? "regenerate"
                      : "generation";

                  const snap = await snapshotChapter(sb, {
                    chapterId,
                    userId: user.id,
                    source: snapshotSource,
                  });
                  if (!snap.ok && snap.code !== "empty") {
                    logServerError(
                      "generate-chapter.snapshot",
                      new Error(snap.error ?? "snapshot failed"),
                    );
                    await revertGenerationAndHint();
                    controller.close();
                    return;
                  }

                  const { data: persistRows, error: persistError } = await sb.rpc(
                    "persist_chapter_generation",
                    {
                      p_chapter_id: chapterId,
                      p_book_id: bookId,
                      p_content: trimmed,
                      p_word_count: words,
                      p_source: snapshotSource,
                    },
                  );

                  if (persistError) {
                    logServerError("generate-chapter.persist_chapter_generation", persistError);
                    await revertGenerationAndHint();
                    controller.close();
                    return;
                  }

                  const persistRow = persistRows?.[0];
                  if (!persistRow) {
                    logServerError(
                      "generate-chapter.persist_chapter_generation",
                      new Error("RPC returned no row"),
                    );
                    await revertGenerationAndHint();
                    controller.close();
                    return;
                  }

                  contentPersisted = true;

                const tokensUsed =
                  completion.input_tokens + completion.output_tokens ||
                  estimateTokensFromText(systemPrompt) +
                    estimateTokensFromText(userMessage) +
                    estimateTokensFromText(trimmed);

                  await sb.from("api_usage").insert({
                    user_id: user.id,
                    route: "/api/ai/generate-chapter",
                    tokens_used: tokensUsed,
                    model: modelUsedForUsage,
                  });

                  await trackEvent(user, "chapter_generated", bookId, {
                    chapterId,
                    words,
                    generation_count: persistRow.generation_count,
                    book_total_words: persistRow.book_total_words,
                  });

                  /* Prompt 16 § 362-371: series observability. Capture the
                   * series context fragments that were injected into this
                   * chapter's system prompt so we can debug continuity
                   * regressions later. Self-gated on series membership;
                   * never throws (logger swallows its own errors). */
                  if (book.series_id) {
                    void logSeriesAiGeneration(sb, {
                      userId: user.id,
                      seriesId: book.series_id,
                      bookId,
                      chapterId,
                      operation: "chapter_generation",
                      model: modelUsedForUsage || null,
                      context: seriesContinuityMeta,
                      metadata: {
                        words,
                        tokens_used: tokensUsed,
                        chapter_number: chapter.chapter_number,
                      },
                    });
                  }

                  /* Refresh the chapter summary so the NEXT chapter's
                   * context assembly immediately benefits from this
                   * draft. Detached: summarization is a separate API
                   * call and we don't want it on the generation
                   * response's hot path. */
                  void summarizeChapter(chapterId).catch((err) => {
                    logServerError("generate-chapter.summarize", err);
                  });

                  /* Prompt 16 § 294-305: background continuity /
                   * plot-hole check. Safe to call unconditionally — the
                   * helper self-gates on series membership + the book's
                   * continuity_checks_enabled flag + book_type=fiction.
                   * Pass the freshly-generated text as an override so we
                   * don't race on the just-written DB row. Detached so
                   * a slow AI call never blocks the author's response. */
                  void runContinuityCheckForChapter(
                    sb,
                    { bookId, chapterId, userId: user.id },
                    { chapterContentOverride: trimmed },
                  ).catch((err) => {
                    logServerError("generate-chapter.continuity", err);
                  });
              } catch (e) {
                logServerError("generate-chapter.onFinal-persist", e);
                if (!contentPersisted) {
                  await revertGenerationAndHint();
                }
              }
              controller.close();
            } catch (pipeErr) {
              logServerError("generate-chapter.stream-pipe", pipeErr);
              await revertGenerationAndHint();
              try {
                controller.enqueue(encodeStreamError(pipeErr));
              } catch {
                /* controller may be closed */
              }
              try {
                controller.close();
              } catch {
                /* ignore */
              }
            } finally {
              reader.releaseLock();
            }
          } catch (e) {
            logServerError("generate-chapter.model-router", e);
            await revertGenerationAndHint();
            try {
              controller.enqueue(encodeStreamError(e));
            } catch {
              /* ignore */
            }
            try {
              controller.close();
            } catch {
              /* ignore */
            }
          }
        })();
      },
    });

    return new StreamingTextResponse(piped, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    logServerError("generate-chapter", e);
    if (shouldRevertOnStreamError && chapterIdForRevert && bookIdForRevert) {
      try {
        const sb = await createClient();
        const { error: revertError } = await sb
          .from("chapters")
          .update({ status: "pending" })
          .eq("id", chapterIdForRevert)
          .eq("book_id", bookIdForRevert);
        if (revertError) {
          logServerError(
            `generate-chapter.fatal-revert chapter=${chapterIdForRevert} book=${bookIdForRevert}`,
            revertError,
            { severity: "critical" },
          );
        }
      } catch (revertErr) {
        logServerError("generate-chapter.fatal-revert-exception", revertErr, {
          severity: "critical",
        });
      }
    }
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

/**
 * Automatic context assembler for every prose-generating AI call.
 *
 * Before this existed, each route hand-rolled its own prompt assembly:
 *  - route-specific base system prompt
 *  - `buildStyleExamplesBlock(...)` append
 *  - `withCodexBlock(...)` append
 *  - ad-hoc "recent prose" / "prior chapter summaries" stitched into the
 *    user message (or omitted entirely, leading to the AI contradicting
 *    itself after chapter 3)
 *
 * That hand-rolled path was fragile: every new cross-cutting context
 * block (codex, style) meant touching six routes, and nothing enforced a
 * total-token budget, so a project with a 5k-word style_examples + a
 * 40-chapter book would silently build a 15k-token prompt and either
 * truncate at the model boundary or burn cash on a wasted round-trip.
 *
 * `buildGenerationContext` centralizes the assembly. Each route passes:
 *   - `baseSystemPrompt` — the route-specific "you are X" anchor
 *   - the `taskType` + free-form text windows describing what the user
 *     is trying to generate right now
 *
 * The assembler produces:
 *   - `systemPrompt` — baseSystemPrompt + styleBlock + codexBlock, in
 *     that order (style closest to the user turn wins attention, codex
 *     sits in between as structural fact grounding)
 *   - `chapterSummaries` — prior chapter summaries concatenated, ready
 *     to be woven into the user message
 *   - `recentProse` — the last ~1,500 words of the CURRENT chapter (if
 *     any) — for inline-command / chapter-assist this is the preceding
 *     prose the author already wrote, for generate-chapter it's the end
 *     of the previous chapter (caller passes `precedingProse` in that
 *     case)
 *   - `tokensUsed`, `blocksIncluded`, `trimmedBlocks`,
 *     `budgetUtilization` — observability so ops can debug "why did the
 *     AI contradict chapter 1's ending" without guessing
 *
 * BUDGETING (hard priority ladder — higher stays when things get tight):
 *   1. Project meta (genre/pov/tense/title/premise) — always included,
 *      ~200 tokens. Carried inside `baseSystemPrompt`.
 *   2. Style examples — up to 1,500 tokens. Trim from the tail.
 *   3. Codex — up to 3,000 tokens. `buildCodexBlock` self-budgets.
 *   4. Prior chapter summaries — up to 2,500 tokens. Drop oldest first.
 *   5. Recent prose — up to 2,000 tokens. Trim from the head (keep the
 *      end of the chapter, since that's the point the generation picks
 *      up from).
 *
 * If the sum still exceeds `tokenBudget`, blocks are TRIMMED in reverse
 * priority order (recent prose first, then summaries, then codex).
 *
 * NOTE: this is a context aggregator, not a full prompt replacement.
 * Each route still owns its `userMessage` shape — the assembler just
 * gives it a consistent systemPrompt plus the supporting text blocks to
 * splice in wherever makes sense for the task.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCodexBlock } from "@/lib/ai/codex-context";
import {
  buildSeriesContextBlock,
  DEFAULT_SERIES_CONTEXT_TOKEN_BUDGET,
} from "@/lib/ai/series-context";
import {
  buildStyleExamplesBlock,
  type StyleExamplesInput,
} from "@/lib/openai/style-examples";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database } from "@/types/database.types";

/* ------------------------------------------------------------------ */
/*   Budgets                                                          */
/* ------------------------------------------------------------------ */

export const DEFAULT_TOKEN_BUDGET = 10_000;

const BLOCK_BUDGETS = {
  style: 1_500,
  seriesContext: DEFAULT_SERIES_CONTEXT_TOKEN_BUDGET,
  codex: 3_000,
  summaries: 2_500,
  recentProse: 2_000,
} as const;

/** Last-1,500-words rule; 1 word ≈ 1.3 tokens so the cap is generous. */
const RECENT_PROSE_WORD_CAP = 1_500;

/** Keep summaries readable — don't silently cut them in the middle of a word. */
const SUMMARY_SAFETY_MARGIN_TOKENS = 32;

/* ------------------------------------------------------------------ */
/*   Types                                                            */
/* ------------------------------------------------------------------ */

export type GenerationTaskType =
  | "chapter-gen"
  | "inline-command"
  | "expand-outline"
  | "chapter-assist"
  | "refine-idea"
  | "generate-outline"
  | "chat"
  | "scene-beat"
  | "other";

export type PriorChapterSummaryInput = {
  chapterNumber: number;
  title: string;
  summary: string;
};

export type ProjectMetaForTemplate = {
  title?: string | null;
  genre?: string | null;
  pov?: string | null;
  tense?: string | null;
  premise?: string | null;
};

export type ChapterMetaForTemplate = {
  number?: number | null;
  title?: string | null;
  beat?: string | null;
};

/** The canonical variable dict fed to the Prompt Template Editor resolver. */
export type GenerationVariables = {
  "project.title": string;
  "project.genre": string;
  "project.pov": string;
  "project.tense": string;
  "project.premise": string;
  "chapter.number": string;
  "chapter.title": string;
  "chapter.beat": string;
  codex: string;
  style_examples: string;
  style_instructions: string;
  recent_prose: string;
  prior_summaries: string;
  /**
   * `<series>` block from {@link buildSeriesContextBlock} — empty string
   * when the book isn't in a series or `seriesContextInput` was omitted.
   */
  series_context: string;
  series_continuity: string;
  selection: string;
  preceding_context: string;
  following_context: string;
  user_instruction: string;
};

export type BuildGenerationContextOptions = {
  /** Supabase client scoped to the current user (RLS enforced on reads). */
  supabase: SupabaseClient<Database>;
  /** The book / project this generation belongs to. */
  projectId: string;
  /** The chapter being generated (for pulling recent prose, summaries). */
  currentChapterId?: string | null;
  /** The outline item / beat being expanded. Reserved for future shaping. */
  currentBeat?: string | null;
  /** Passage selected in the editor (inline-command). */
  selectionText?: string | null;
  /**
   * Raw text BEFORE the generation point. For inline-command this is the
   * ~500 words above the selection; for generate-chapter this is the
   * end of the prior chapter (callers typically pass the last ~500
   * words). When present, takes priority over auto-derived recent prose.
   */
  precedingProse?: string | null;
  /** Raw text after the generation point. Optional. */
  followingProse?: string | null;
  /** Which route is calling. Shapes logging, not prompt content. */
  taskType: GenerationTaskType;
  /** Hard ceiling for the assembled blocks, excluding the user message. */
  tokenBudget?: number;
  /**
   * Route-specific base system prompt (includes project meta, genre,
   * POV, tense, etc.). The assembler appends style + codex after it.
   */
  baseSystemPrompt: string;
  /** Style-examples fields already fetched from `books`. */
  styleInput: StyleExamplesInput;
  /**
   * Pre-fetched prior chapter summaries. If omitted AND currentChapterId
   * is set, the assembler fetches them itself. Callers that already
   * joined `chapters` (generate-chapter) can skip the extra roundtrip.
   */
  priorChapters?: ReadonlyArray<PriorChapterSummaryInput>;
  /**
   * Skip the DB lookup for recent prose (e.g. in tests). When unset and
   * `currentChapterId` is given, the assembler pulls it from `chapters`.
   */
  currentChapterContent?: string | null;
  /**
   * Explicit override for the codex text window that drives matching.
   * Defaults to a concatenation of the selection / preceding / following
   * / current-beat strings plus the current chapter's title.
   */
  codexTextOverride?: string;
  /**
   * Codex entry ids explicitly selected by the author for this run. These
   * ids are force-included in the codex block even when they do not match
   * the current text context.
   */
  forcedCodexEntryIds?: ReadonlyArray<string>;
  /**
   * Current chapter number, forwarded to `buildCodexBlock` so
   * series-aware progression lookups filter out future-chapter events
   * from the current book. Only meaningful for generate-chapter.
   */
  currentChapterNumber?: number;
  /**
   * Optional block to splice AFTER the style block but BEFORE the codex
   * block. Used by generate-chapter to keep the series-continuity
   * paragraph adjacent to the codex worldbook (the two canonical-fact
   * blocks read as one contiguous reference region that way).
   *
   * Legacy path: callers pass pre-rendered markdown here. Prefer
   * {@link seriesContextInput} for new code — it owns its own token
   * budget, trims proactively, and renders a structured `<series>` tier.
   * When both are set, `seriesContextInput` is rendered FIRST and the
   * `systemSuffixAfterStyle` string is appended below it.
   */
  systemSuffixAfterStyle?: string;
  /**
   * Series continuity text in paragraph form. This feeds the
   * `{series_continuity}` template variable even when the resolved template
   * path is used (where fallback suffix text is not automatically present).
   *
   * Legacy compatibility: if omitted, variables fallback to
   * `systemSuffixAfterStyle`.
   */
  seriesContinuityText?: string;
  /**
   * When provided, the assembler builds a dedicated
   * `seriesContextBlock` tier (series metadata + prior book summaries +
   * active arcs) and inserts it between the style block and the codex
   * block. Omit for books that aren't part of a series.
   *
   * The tier is token-budgeted separately from codex/summaries/recent
   * prose (Prompt 16.4 § CONTEXT ASSEMBLER EXTENSIONS).
   */
  seriesContextInput?: {
    seriesId: string;
    currentBookPosition: number;
    /** Auth scope for RLS-bound reads on `series` / `books`. */
    userId: string;
    /** Override the default 2k budget. */
    tokenBudget?: number;
  };
  /**
   * Project metadata surfaced to the Prompt Template Editor as
   * `{project.title}`, `{project.genre}`, etc. The assembler only uses
   * these to populate the returned `variables` dict — it does NOT weave
   * them back into the `systemPrompt` output (that responsibility lives
   * on the route's baseSystemPrompt).
   */
  projectMeta?: ProjectMetaForTemplate;
  /** Chapter metadata surfaced as `{chapter.number}` / `{chapter.title}` / `{chapter.beat}`. */
  chapterMeta?: ChapterMetaForTemplate;
  /**
   * Free-form author prompt (inline-command command, chapter-assist
   * message, expand-outline guidance). Passed through to the template
   * resolver as `{user_instruction}`.
   */
  userInstruction?: string | null;
};

export type GenerationContextBlocks = {
  systemPrompt: string;
  styleBlock: string;
  /**
   * The `<series>` XML block when `seriesContextInput` was provided and
   * the book belongs to a series, otherwise an empty string. Always
   * spliced into `systemPrompt` between style and codex.
   */
  seriesContextBlock: string;
  codexBlock: string;
  chapterSummaries: string;
  recentProse: string;
};

export type GenerationContextObservability = {
  blocksIncluded: string[];
  blocksTrimmed: string[];
  tokenBudget: number;
  tokensUsed: number;
  tokensPerBlock: Record<string, number>;
  budgetUtilization: number;
  codexMatchedEntryIds: string[];
  codexMatchedEntryCount: number;
};

export type GenerationContext = GenerationContextBlocks &
  GenerationContextObservability & {
    /**
     * Mustache variable dict for the Prompt Template Editor's
     * `resolveTemplate`. Populated from the assembled blocks above +
     * `projectMeta` / `chapterMeta` / `userInstruction` on the options.
     *
     * Routes that use the template editor read from `variables`; routes
     * that still want the ad-hoc concatenated prompt keep using
     * `systemPrompt`. Both stay consistent.
     */
    variables: GenerationVariables;
  };

/* ------------------------------------------------------------------ */
/*   Token accounting                                                 */
/* ------------------------------------------------------------------ */

/**
 * ~4 chars per token — same heuristic every other module in this repo
 * uses (refine-idea, generate-chapter, buildCodexBlock). A real
 * tokenizer would be more accurate but would pull in tiktoken for every
 * edge invocation; the budget is soft by design.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function tailWords(text: string, wordCap: number): string {
  if (!text || wordCap <= 0) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= wordCap) return text.trim();
  return words.slice(words.length - wordCap).join(" ");
}

/* ------------------------------------------------------------------ */
/*   Block builders                                                   */
/* ------------------------------------------------------------------ */

/** Render prior chapter summaries into a budget-respecting markdown block. */
function renderChapterSummaries(
  priors: ReadonlyArray<PriorChapterSummaryInput>,
  maxTokens: number,
): { block: string; tokensUsed: number; entriesIncluded: number; droppedOldest: number } {
  if (priors.length === 0) {
    return { block: "", tokensUsed: 0, entriesIncluded: 0, droppedOldest: 0 };
  }
  /* Newest summaries are the most useful for continuity (most recent
   * events, latest character status). When the budget is tight we drop
   * from the OLDEST end. */
  const ordered = [...priors].sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );

  const rendered = ordered.map((row) => {
    const title = sanitizeText(row.title.trim() || "Untitled");
    const body = sanitizeText(row.summary.trim());
    return `### Chapter ${row.chapterNumber}: ${title}\n${body}`;
  });

  const fits: string[] = [];
  let usedTokens = 0;
  let startIndex = 0;

  /* Work forward from the newest and prepend-backward, so the final
   * order is chronological while "drop oldest first" is the trimming
   * rule. */
  for (let i = rendered.length - 1; i >= 0; i--) {
    const piece = rendered[i];
    const cost = estimateTokens(piece) + 4; // separator headroom
    if (usedTokens + cost > maxTokens - SUMMARY_SAFETY_MARGIN_TOKENS) {
      startIndex = i + 1;
      break;
    }
    fits.unshift(piece);
    usedTokens += cost;
  }

  if (fits.length === 0) {
    return { block: "", tokensUsed: 0, entriesIncluded: 0, droppedOldest: priors.length };
  }

  const block = fits.join("\n\n");
  return {
    block,
    tokensUsed: estimateTokens(block),
    entriesIncluded: fits.length,
    droppedOldest: Math.max(0, startIndex),
  };
}

/** Keep the TAIL of the prose — that's what the model is continuing from. */
function renderRecentProse(raw: string, maxTokens: number): { block: string; tokensUsed: number } {
  const trimmed = tailWords(raw, RECENT_PROSE_WORD_CAP);
  if (!trimmed) return { block: "", tokensUsed: 0 };
  const clean = sanitizeText(trimmed);
  const estimated = estimateTokens(clean);
  if (estimated <= maxTokens) {
    return { block: clean, tokensUsed: estimated };
  }
  /* Over-budget even at the word cap — slice from the head. We keep at
   * least something so the model still sees the immediate lead-in. */
  const targetChars = Math.max(0, maxTokens * 4 - 4);
  const sliced = clean.slice(clean.length - targetChars);
  return { block: sliced, tokensUsed: estimateTokens(sliced) };
}

/** Trim the style block to fit the per-block budget. */
function renderStyleBlock(
  input: StyleExamplesInput,
  maxTokens: number,
): { block: string; tokensUsed: number; truncated: boolean } {
  const raw = buildStyleExamplesBlock(input);
  if (!raw) return { block: "", tokensUsed: 0, truncated: false };
  const estimated = estimateTokens(raw);
  if (estimated <= maxTokens) {
    return { block: raw, tokensUsed: estimated, truncated: false };
  }
  /* Truncate the sample body but leave the framing tags intact so the
   * model still has the voice anchor instruction. */
  const targetChars = maxTokens * 4;
  const sliced = `${raw.slice(0, Math.max(0, targetChars - 32))}\n…`;
  return {
    block: sliced,
    tokensUsed: estimateTokens(sliced),
    truncated: true,
  };
}

/* ------------------------------------------------------------------ */
/*   Data fetchers                                                    */
/* ------------------------------------------------------------------ */

async function fetchPriorChapterSummaries(
  supabase: SupabaseClient<Database>,
  projectId: string,
  currentChapterId: string,
): Promise<PriorChapterSummaryInput[]> {
  const { data: current, error: currErr } = await supabase
    .from("chapters")
    .select("chapter_number")
    .eq("id", currentChapterId)
    .eq("book_id", projectId)
    .maybeSingle();
  if (currErr || !current) return [];

  const { data: rows, error } = await supabase
    .from("chapters")
    .select("chapter_number, title, ai_summary, outline_summary, content")
    .eq("book_id", projectId)
    .lt("chapter_number", current.chapter_number)
    .in("status", ["draft", "edited", "approved"])
    .order("chapter_number", { ascending: true });
  if (error || !rows) return [];

  return rows
    .map((row) => {
      const summary =
        (row.ai_summary && row.ai_summary.trim()) ||
        (row.outline_summary && row.outline_summary.trim()) ||
        "";
      if (!summary) return null;
      return {
        chapterNumber: row.chapter_number,
        title: row.title,
        summary,
      } as PriorChapterSummaryInput;
    })
    .filter((r): r is PriorChapterSummaryInput => r !== null);
}

async function fetchCurrentChapterContent(
  supabase: SupabaseClient<Database>,
  projectId: string,
  currentChapterId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("chapters")
    .select("content")
    .eq("id", currentChapterId)
    .eq("book_id", projectId)
    .maybeSingle();
  if (error || !data) return "";
  return data.content ?? "";
}

/* ------------------------------------------------------------------ */
/*   Public API                                                       */
/* ------------------------------------------------------------------ */

export async function buildGenerationContext(
  opts: BuildGenerationContextOptions,
): Promise<GenerationContext> {
  const budget = opts.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const blocksIncluded: string[] = ["system"];
  const blocksTrimmed: string[] = [];
  const tokensPerBlock: Record<string, number> = {};

  /* ---- 1. Project meta (carried by baseSystemPrompt) --------------- */
  const baseTokens = estimateTokens(opts.baseSystemPrompt);
  tokensPerBlock.system = baseTokens;

  /* ---- 2. Style examples ------------------------------------------- */
  const style = renderStyleBlock(opts.styleInput, BLOCK_BUDGETS.style);
  if (style.block) {
    blocksIncluded.push("style");
    tokensPerBlock.style = style.tokensUsed;
    if (style.truncated) blocksTrimmed.push("style");
  } else {
    tokensPerBlock.style = 0;
  }

  /* ---- 2b. Series context tier (Prompt 16.4) ---------------------- */
  let seriesContextBlockText = "";
  let seriesContextTokens = 0;
  if (opts.seriesContextInput) {
    const sc = await buildSeriesContextBlock({
      supabase: opts.supabase,
      seriesId: opts.seriesContextInput.seriesId,
      currentBookId: opts.projectId,
      currentBookPosition: opts.seriesContextInput.currentBookPosition,
      userId: opts.seriesContextInput.userId,
      tokenBudget:
        opts.seriesContextInput.tokenBudget ?? BLOCK_BUDGETS.seriesContext,
    });
    seriesContextBlockText = sc.block;
    seriesContextTokens = sc.tokensUsed;
    if (sc.block) {
      blocksIncluded.push("seriesContext");
      tokensPerBlock.seriesContext = sc.tokensUsed;
      if (sc.blocksTrimmed.length > 0) blocksTrimmed.push("seriesContext");
    } else {
      tokensPerBlock.seriesContext = 0;
    }
  } else {
    tokensPerBlock.seriesContext = 0;
  }

  /* ---- 3. Codex ---------------------------------------------------- */
  const codexText =
    opts.codexTextOverride ??
    [
      opts.currentBeat ?? "",
      opts.selectionText ?? "",
      opts.precedingProse ?? "",
      opts.followingProse ?? "",
    ]
      .filter((s) => s && s.length > 0)
      .join("\n");
  const codex = await buildCodexBlock(
    opts.supabase,
    opts.projectId,
    codexText,
    {
      tokenBudget: BLOCK_BUDGETS.codex,
      currentChapterNumber: opts.currentChapterNumber,
      forceIncludeEntryIds: opts.forcedCodexEntryIds,
    },
  );
  if (codex.block) {
    blocksIncluded.push("codex");
    tokensPerBlock.codex = codex.tokensUsed;
    if (codex.entriesTrimmed.length > 0) blocksTrimmed.push("codex");
  } else {
    tokensPerBlock.codex = 0;
  }

  /* ---- 4. Prior chapter summaries --------------------------------- */
  let priors = opts.priorChapters ?? null;
  if (!priors && opts.currentChapterId) {
    priors = await fetchPriorChapterSummaries(
      opts.supabase,
      opts.projectId,
      opts.currentChapterId,
    );
  }
  const summaries = renderChapterSummaries(
    priors ?? [],
    BLOCK_BUDGETS.summaries,
  );
  if (summaries.block) {
    blocksIncluded.push("summaries");
    tokensPerBlock.summaries = summaries.tokensUsed;
    if (summaries.droppedOldest > 0) blocksTrimmed.push("summaries");
  } else {
    tokensPerBlock.summaries = 0;
  }

  /* ---- 5. Recent prose -------------------------------------------- */
  let recentRaw = opts.precedingProse ?? "";
  if (!recentRaw && opts.currentChapterId && opts.currentChapterContent === undefined) {
    recentRaw = await fetchCurrentChapterContent(
      opts.supabase,
      opts.projectId,
      opts.currentChapterId,
    );
  } else if (!recentRaw && typeof opts.currentChapterContent === "string") {
    recentRaw = opts.currentChapterContent;
  }
  const recent = renderRecentProse(recentRaw, BLOCK_BUDGETS.recentProse);
  if (recent.block) {
    blocksIncluded.push("recentProse");
    tokensPerBlock.recentProse = recent.tokensUsed;
  } else {
    tokensPerBlock.recentProse = 0;
  }

  /* ---- 6. Budget enforcement (reverse-priority trimming) ---------- */
  let total =
    baseTokens +
    style.tokensUsed +
    seriesContextTokens +
    codex.tokensUsed +
    summaries.tokensUsed +
    recent.tokensUsed;

  let finalRecent = recent.block;
  let finalRecentTokens = recent.tokensUsed;
  let finalSummaries = summaries.block;
  let finalSummariesTokens = summaries.tokensUsed;
  let finalCodex = codex.block;
  let finalCodexTokens = codex.tokensUsed;
  let codexMatchedEntryIds = codex.matchedEntryIds;
  let codexMatchedEntryCount = codex.matchedEntryCount;

  if (total > budget) {
    /* Drop recent prose first. */
    finalRecent = "";
    finalRecentTokens = 0;
    if (blocksIncluded.includes("recentProse")) {
      blocksIncluded.splice(blocksIncluded.indexOf("recentProse"), 1);
      blocksTrimmed.push("recentProse");
    }
    total =
      baseTokens +
      style.tokensUsed +
      seriesContextTokens +
      codex.tokensUsed +
      summaries.tokensUsed;
  }
  if (total > budget) {
    /* Drop oldest summaries by re-rendering at a shrunken budget. */
    const shrunk = renderChapterSummaries(
      priors ?? [],
      Math.max(0, BLOCK_BUDGETS.summaries - (total - budget)),
    );
    finalSummaries = shrunk.block;
    finalSummariesTokens = shrunk.tokensUsed;
    if (!shrunk.block && blocksIncluded.includes("summaries")) {
      blocksIncluded.splice(blocksIncluded.indexOf("summaries"), 1);
    }
    if (!blocksTrimmed.includes("summaries")) blocksTrimmed.push("summaries");
    total =
      baseTokens +
      style.tokensUsed +
      seriesContextTokens +
      codex.tokensUsed +
      finalSummariesTokens;
  }
  if (total > budget && finalCodex) {
    /* Last resort: re-shrink codex. `buildCodexBlock` already picked a
     * reasonable ranking, so we just slice to fit. */
    const codexShrunk = await buildCodexBlock(
      opts.supabase,
      opts.projectId,
      codexText,
      {
        tokenBudget: Math.max(0, BLOCK_BUDGETS.codex - (total - budget)),
        currentChapterNumber: opts.currentChapterNumber,
        forceIncludeEntryIds: opts.forcedCodexEntryIds,
      },
    );
    finalCodex = codexShrunk.block;
    finalCodexTokens = codexShrunk.tokensUsed;
    codexMatchedEntryIds = codexShrunk.matchedEntryIds;
    codexMatchedEntryCount = codexShrunk.matchedEntryCount;
    if (!codexShrunk.block && blocksIncluded.includes("codex")) {
      blocksIncluded.splice(blocksIncluded.indexOf("codex"), 1);
    }
    if (!blocksTrimmed.includes("codex")) blocksTrimmed.push("codex");
    total =
      baseTokens +
      style.tokensUsed +
      seriesContextTokens +
      finalCodexTokens +
      finalSummariesTokens;
  }

  const suffix = opts.systemSuffixAfterStyle ?? "";
  const seriesContinuityVariable = sanitizeText(
    (opts.seriesContinuityText ?? opts.systemSuffixAfterStyle ?? "").trim(),
  );
  /* Order:  base → style → <series> → legacy suffix → codex.
   * The new `<series>` tier sits closest to the style anchor so it frames
   * "what kind of saga this is" before the codex's factual worldbook. */
  const systemPrompt = `${opts.baseSystemPrompt}${style.block}${seriesContextBlockText}${suffix}${finalCodex}`;
  const tokensUsed = estimateTokens(systemPrompt) + finalSummariesTokens + finalRecentTokens;

  /* ---- 7.5. Template variables dict -------------------------------- */
  const pm = opts.projectMeta ?? {};
  const cm = opts.chapterMeta ?? {};
  const variables: GenerationVariables = {
    "project.title": pm.title?.trim() ?? "",
    "project.genre": pm.genre?.trim() ?? "",
    "project.pov": pm.pov?.trim() ?? "",
    "project.tense": pm.tense?.trim() ?? "",
    "project.premise": pm.premise?.trim() ?? "",
    "chapter.number":
      typeof cm.number === "number" && Number.isFinite(cm.number)
        ? String(cm.number)
        : "",
    "chapter.title": cm.title?.trim() ?? "",
    "chapter.beat": cm.beat?.trim() ?? "",
    codex: finalCodex,
    style_examples: sanitizeText((opts.styleInput.style_examples ?? "").trim()),
    style_instructions: sanitizeText(
      (opts.styleInput.style_instructions ?? "").trim(),
    ),
    recent_prose: finalRecent,
    prior_summaries: finalSummaries,
    series_context: seriesContextBlockText,
    series_continuity: seriesContinuityVariable,
    selection: opts.selectionText?.trim() ?? "",
    preceding_context: opts.precedingProse?.trim() ?? "",
    following_context: opts.followingProse?.trim() ?? "",
    user_instruction: opts.userInstruction?.trim() ?? "",
  };

  /* Update per-block after trims so observability matches reality. */
  tokensPerBlock.codex = finalCodexTokens;
  tokensPerBlock.summaries = finalSummariesTokens;
  tokensPerBlock.recentProse = finalRecentTokens;

  const utilization = budget > 0 ? tokensUsed / budget : 0;

  /* ---- 7. Observability ------------------------------------------- */
  try {
    console.info("[context-assembler]", {
      taskType: opts.taskType,
      projectId: opts.projectId,
      currentChapterId: opts.currentChapterId ?? null,
      blocksIncluded,
      blocksTrimmed,
      tokensPerBlock,
      tokensUsed,
      tokenBudget: budget,
      budgetUtilizationPct: Number((utilization * 100).toFixed(1)),
    });
    if (utilization > 1) {
      console.warn(
        "[context-assembler] budget overflow",
        opts.taskType,
        opts.projectId,
        { tokensUsed, tokenBudget: budget },
      );
    }
  } catch {
    /* logging must never break generation */
  }

  return {
    systemPrompt,
    styleBlock: style.block,
    seriesContextBlock: seriesContextBlockText,
    codexBlock: finalCodex,
    chapterSummaries: finalSummaries,
    recentProse: finalRecent,
    blocksIncluded,
    blocksTrimmed,
    tokenBudget: budget,
    tokensUsed,
    tokensPerBlock,
    budgetUtilization: utilization,
    codexMatchedEntryIds,
    codexMatchedEntryCount,
    variables,
  };
}

import type { ContinuityWarningRow } from "@/components/book/ContinuityWarningsPanel";
import type { InlineCommandId } from "@/lib/ai/inline-commands";
import type { BookTypeDb, ChapterStatusDb, SubscriptionTierDb } from "@/types/database.types";

export type ChapterListItem = {
  id: string;
  chapter_number: number;
  title: string;
  status: ChapterStatusDb;
  word_count: number;
};

export type ChapterDetail = ChapterListItem & {
  content: string | null;
  outline_summary: string | null;
  author_notes: string | null;
  target_word_count: number | null;
  /** From DB `updated_at` — used to detect stuck `generating` without a live stream. */
  updated_at?: string;
};

export type ChapterEditorProps = {
  bookId: string;
  bookTitle: string;
  bookSubtitle: string | null;
  /** Drives which AI affordances are shown (e.g. fiction-only consistency check). */
  bookType: BookTypeDb;
  initialChapters: ChapterListItem[];
  chapter: ChapterDetail;
  subscriptionTier: SubscriptionTierDb;
  /**
   * Authenticated user id used as the localStorage scope for per-user UI
   * preferences (first-time "Press / for commands" hint, etc.). Passed
   * from the server wrapper so we don't round-trip auth.getUser() on the
   * client just for preference keying.
   */
  userId: string;
  /**
   * From `profiles.preferences.askRewriteOnOutlineEdit` (default true). When
   * false, a successful outline edit does not offer the "rewrite chapter" toast.
   */
  askRewriteOnOutlineEdit: boolean;
  /**
   * From `profiles.preferences.autoSlopScanGeneratedChapters` (default true).
   * After a successful in-editor generation, run the banned-phrase scan and
   * underline matches.
   */
  autoSlopScan: boolean;
  /**
   * Prompt 16 § 294-305 — continuity / plot-hole background check surface.
   * `isInSeries` gates the panel entirely; the other two feed its state.
   */
  isInSeries: boolean;
  continuityChecksEnabled: boolean;
  initialContinuityWarnings: ContinuityWarningRow[];
};

export type FindMatch = { from: number; to: number };

/**
 * `idle` — nothing to save and no in-flight save. Renders nothing (no
 *   lastSavedAt yet, so the indicator has nothing to report).
 * `dirty` — editor has unsaved changes (typed since last save).
 * `saving` — a save request is in flight.
 * `saved` — the last save succeeded; indicator shows "Saved {relative time}".
 * `error` — the last save failed; click to retry on next blur / autosave tick.
 */
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type AssistAction =
  | "expand"
  | "rewrite"
  | "shorten"
  | "proofread"
  | "continue"
  | "tone";

export type AssistToneOption = "formal" | "casual" | "dramatic";

export type AssistPromptPanel =
  | null
  | {
      /**
       * Only actions that accept a free-form prompt render the panel. `continue`
       * and `tone` run directly from the toolbar / bubble menu without a panel.
       */
      action: "expand" | "rewrite";
      prompt: string;
    };

/**
 * A single rewrite alternative streamed from `/api/ai/inline-command`.
 *
 * - `streaming` — bytes are still flowing into this alternative.
 * - `complete` — the delimiter after it was observed (or the stream ended
 *   and this is the final alternative).
 */
export type InlineCommandAlternative = {
  id: string;
  text: string;
  status: "streaming" | "complete";
};

/**
 * Frozen snapshot of the TipTap selection + context captured the moment the
 * user clicks a bubble-menu command. Stored on state so that:
 *   - the underlying selection can move while the stream runs without
 *     breaking later "Insert" / "Append below" actions
 *   - the panel can re-run the same request (Regenerate) without asking the
 *     user to re-highlight.
 */
export type InlineCommandRequest = {
  command: InlineCommandId;
  /** Only set when `command === "custom"`. */
  customInstruction?: string;
  from: number;
  to: number;
  selection: string;
  precedingContext: string;
  followingContext: string;
};

export type InlineCommandPanelState =
  | null
  | {
      /**
       * `draft` — Custom command: awaiting the author's instruction before
       *          the first request fires. No stream yet.
       * `running` — request in flight; alternatives are being streamed.
       * `complete` — stream finished. User can Insert / Append / Regenerate.
       * `error` — stream aborted or OpenAI 5xx'd. Keep partial alternatives
       *           visible; a Retry button reruns the same `request`.
       */
      status: "draft" | "running" | "complete" | "error";
      request: InlineCommandRequest;
      alternatives: InlineCommandAlternative[];
      errorMessage?: string;
    };

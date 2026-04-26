/**
 * Selection / context helpers for the bubble-menu inline-AI commands.
 *
 * These are pure over the TipTap editor state — no React, no side effects —
 * so they're safe to call synchronously at click time (which is important:
 * once we hand control to the AI panel, the user may move the cursor and
 * we don't want that to drift what gets sent to the model).
 */
import type { Editor } from "@tiptap/core";

/**
 * Tightness of the default context windows. Mirrors the task spec:
 *   ~500 words before, ~300 words after the selection.
 * Smaller than the server hard cap so the normal path stays cheap while
 * still giving the model enough tone anchoring.
 */
export const DEFAULT_PRECEDING_CONTEXT_WORDS = 500;
export const DEFAULT_FOLLOWING_CONTEXT_WORDS = 300;

export const INLINE_COMMAND_MAX_SELECTION_WORDS = 2_000;

/** Fast word count — matches the rest of the editor's whitespace-split convention. */
export function countWordsFast(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Take the *last* `maxWords` of `text`, then try to start at a sentence
 * boundary so the AI doesn't receive a context window that starts
 * mid-clause (which tends to bias the model toward re-punctuating the
 * opening of its output). Falls back to the raw word-slice if no clean
 * boundary is found in the last ~30% of the slice — we never want to
 * discard the most recent prose.
 */
export function takeTrailingWords(text: string, maxWords: number): string {
  const normalized = text.trim();
  if (!normalized) return "";
  const words = normalized.split(/\s+/);
  if (words.length <= maxWords) return normalized;

  const slice = words.slice(words.length - maxWords).join(" ");
  /* Look for the *earliest* sentence terminator in the first ~30% so we
   * only trim a fragmentary clause, not whole paragraphs of useful context. */
  const cutoffWindow = Math.floor(slice.length * 0.3);
  const head = slice.slice(0, cutoffWindow);
  const match = head.match(/[.!?]["'”’)\]]?\s+[A-Z“"'(\[]/);
  if (!match) return slice;
  const idx = head.lastIndexOf(match[0]);
  if (idx < 0) return slice;
  return slice.slice(idx + match[0].length - 1).trim();
}

/**
 * Counterpart of {@link takeTrailingWords}: first `maxWords` of `text`,
 * ended at the *latest* sentence terminator in the last ~30% so the AI
 * gets a self-contained fragment that's clearly not mid-sentence.
 */
export function takeLeadingWords(text: string, maxWords: number): string {
  const normalized = text.trim();
  if (!normalized) return "";
  const words = normalized.split(/\s+/);
  if (words.length <= maxWords) return normalized;

  const slice = words.slice(0, maxWords).join(" ");
  const cutoffWindow = Math.floor(slice.length * 0.7);
  const tail = slice.slice(cutoffWindow);
  const match = tail.match(/[.!?]["'”’)\]]?(?=\s|$)/g);
  if (!match) return slice;
  const lastTerminator = match[match.length - 1]!;
  const terminatorIdx = tail.lastIndexOf(lastTerminator);
  if (terminatorIdx < 0) return slice;
  return (slice.slice(0, cutoffWindow) + tail.slice(0, terminatorIdx + lastTerminator.length)).trim();
}

export type InlineSelectionContext = {
  /** ProseMirror document position where the selection starts. */
  from: number;
  /** ProseMirror document position where the selection ends. */
  to: number;
  /** Plain text of the highlighted passage. */
  selection: string;
  /** Plain-text context preceding the selection, trimmed to sentence boundaries. */
  precedingContext: string;
  /** Plain-text context following the selection, trimmed to sentence boundaries. */
  followingContext: string;
  /** Word count of the selected passage — surfaced so the UI can warn before a request fires. */
  selectionWordCount: number;
};

/**
 * Extracts the current TipTap selection and adjoining context windows.
 * Returns `null` when there's no non-empty selection; callers should treat
 * that as "nothing to do" (the bubble menu shouldn't be open either way).
 *
 * The doc is flattened with `\n\n` as the block separator — matching the
 * rest of the editor (`chapter-assist`, `inline-assist`) so the AI sees
 * paragraph breaks consistent with how the chapter is persisted.
 */
export function getInlineSelectionContext(
  editor: Editor,
  options?: {
    precedingWords?: number;
    followingWords?: number;
  },
): InlineSelectionContext | null {
  const { from, to } = editor.state.selection;
  if (from === to) return null;

  const doc = editor.state.doc;
  const selection = doc.textBetween(from, to, "\n\n");
  if (!selection.trim()) return null;

  const precedingWords = options?.precedingWords ?? DEFAULT_PRECEDING_CONTEXT_WORDS;
  const followingWords = options?.followingWords ?? DEFAULT_FOLLOWING_CONTEXT_WORDS;

  const beforeRaw = doc.textBetween(0, from, "\n\n");
  const afterRaw = doc.textBetween(to, doc.content.size, "\n\n");

  return {
    from,
    to,
    selection,
    precedingContext: takeTrailingWords(beforeRaw, precedingWords),
    followingContext: takeLeadingWords(afterRaw, followingWords),
    selectionWordCount: countWordsFast(selection),
  };
}

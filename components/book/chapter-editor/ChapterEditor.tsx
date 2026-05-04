"use client";

import type { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import dynamic from "next/dynamic";

import { CodexHighlight } from "./codex-highlight";
import { SceneBeat } from "./extensions/scene-beat";
import { SlopHighlight, slopDecorationFromEvent } from "./slop-highlight";
import { CodexHoverCard } from "./codex-hover-card";
import {
  SlopDeepPanel,
  SlopHoverCard,
  type DeepSlopItem,
  type SlopPopoverState,
} from "./slop-hover-card";
import { useCodexEntries } from "./hooks/use-codex-entries";
import { useCodexHighlight } from "./hooks/use-codex-highlight";
/* `readDataStream` is a Vercel AI SDK v3 primitive. It was renamed / moved
 * under `ai/rsc` in v4. Keep `ai` pinned to ~3.x (see package.json and
 * tests/unit/ai-sdk-version.test.ts). On a v4 migration, update this import
 * alongside the server-side StreamingTextResponse/formatStreamPart sites. */
import { readDataStream } from "ai";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { snapshotManualSaveAction } from "@/app/(dashboard)/projects/[id]/chapters/[chapterId]/revisions/actions";
import { enqueueChapterSummary } from "@/lib/ai/auto-summarize-actions";
import { reorderChaptersAction } from "@/components/book/chapter-reorder-action";
import {
  TransitionRewriteModal,
  type TransitionRewriteResultRow,
} from "@/components/book/TransitionRewriteModal";
import {
  ConsistencyPanel,
  type ConsistencyCheckResult,
} from "@/components/book/ConsistencyPanel";
import { ContinuityWarningsPanel } from "@/components/book/ContinuityWarningsPanel";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Maximize, X } from "@/lib/lucide-icons";
import { createClient } from "@/lib/supabase/client";
import { useBook } from "@/hooks/useBook";
import { SearchReplacePanel } from "@/components/book/SearchReplacePanel";
import {
  VoiceMemoModal,
  type VoiceMemoMode,
} from "@/components/book/VoiceMemoModal";
import { FREE_MAX_CHAPTERS_PER_BOOK } from "@/lib/subscription/limits";
import { applyTextReplace } from "@/lib/utils/book-text-search";
import type { BookTextSearchOptions } from "@/lib/utils/book-text-search";
import { userFacingFetchError } from "@/lib/utils/client-fetch-errors";
import { cn } from "@/lib/utils/cn";
import { ApiErrorCode } from "@/lib/utils/errors";
import { outlineTextChangeExceeds } from "@/lib/utils/string-edit-distance";
import type { ChapterStatusDb } from "@/types/database.types";

import {
  SlashCommands,
  type SlashCommandInvocation,
} from "@/components/book/editor/SlashCommands";

import { ChapterMiniRail } from "../ChapterMiniRail";

import {
  ALTERNATIVE_DELIMITER,
  INLINE_COMMANDS,
  type InlineCommandId,
} from "@/lib/ai/inline-commands";

import { EditorBubbleMenu } from "./bubble-menu";
import { ChapterSidebar } from "./chapter-sidebar";
import { ChatPanel } from "@/components/book/chat/chat-panel";
import { InlineCommandPanel } from "./inline-command-panel";
import { LinkPopover } from "./link-popover";
import {
  countWords,
  estimateReadingMinutes,
  isLikelyMarkdown,
  markdownToHtml,
  statusBadgeClass,
  turndown,
} from "./markdown";
import { syncChapterContentWithEditor } from "./content-guard";
import { PendingState } from "./pending-state";
import { SaveIndicator } from "../editor/SaveIndicator";
import { ShortcutCheatsheet } from "./shortcut-cheatsheet";
import {
  EditorToolbar,
  type CodexToolbarEntryOption,
} from "./toolbar";
import type {
  AssistAction,
  AssistPromptPanel as AssistPromptPanelState,
  AssistToneOption,
  ChapterEditorProps,
  ChapterListItem,
  FindMatch,
  InlineCommandAlternative,
  InlineCommandPanelState,
  InlineCommandRequest,
  SaveState,
} from "./types";
import {
  INLINE_COMMAND_MAX_SELECTION_WORDS,
  getInlineSelectionContext,
} from "./utils";
import { WordTarget } from "./word-target";
import {
  findMatchesInDoc,
  nextMatchIndexAfterReplace,
  useFindMatches,
} from "./hooks/use-find-matches";
import { useChapterRealtime } from "./hooks/use-chapter-realtime";

const OutlinePanel = dynamic(
  () => import("./outline-panel").then((m) => m.OutlinePanel),
  { ssr: false, loading: () => null },
);

const FindReplacePanel = dynamic(
  () => import("./find-replace-panel").then((m) => m.FindReplacePanel),
  { ssr: false, loading: () => null },
);

const AssistPromptPanel = dynamic(
  () => import("./assist-prompt-panel").then((m) => m.AssistPromptPanel),
  { ssr: false, loading: () => null },
);

const AUTOSAVE_INTERVAL_MS = 30_000;
/**
 * Typewriter-mode preference is per-user so a shared browser doesn't leak
 * one author's layout choice into the next login. The final key is
 * `chapterai-typewriter-<userId>`.
 */
const TYPEWRITER_STORAGE_PREFIX = "chapterai-typewriter";
const ZEN_STORAGE_KEY = "chapter-editor.zen";
const SPELLCHECK_STORAGE_KEY = "chapter-editor.spellcheck";
/**
 * Distraction-free focus-mode preference. Full key is
 * `chapterai-focus-<userId>` so the setting is remembered per signed-in
 * user on a given device. Separate from `ZEN_STORAGE_KEY` — zen mode is
 * the lighter existing chrome-thinning mode, whereas focus mode hides
 * the toolbar, the status badge, and every navigation element to leave
 * just the title + prose + a minimal overlay.
 */
const FOCUS_STORAGE_PREFIX = "chapterai-focus";
/** Body-level class toggled while focus mode is active so global chrome can opt in/out. */
const FOCUS_BODY_CLASS = "chapterai-focus";
/** Delay before the focus-mode overlay first fades in after entering focus mode. */
const FOCUS_OVERLAY_INITIAL_DELAY_MS = 2_000;
/** Idle duration after which the focus-mode overlay fades out. Resets on activity. */
const FOCUS_OVERLAY_IDLE_MS = 3_000;
/**
 * Minimum caret drift (px) before the typewriter scroll engages. Prevents a
 * jittery feedback loop where each scroll nudge itself fires another
 * selectionUpdate inside the same frame.
 */
const TYPEWRITER_MIN_DELTA_PX = 4;
/**
 * localStorage prefix for the "Press / for commands" hint. The full key is
 * `chapter-editor.slash-hint-seen:<userId>` so the hint dismisses per user
 * (a shared browser won't swallow the hint for another signed-in account).
 */
const SLASH_HINT_STORAGE_PREFIX = "chapter-editor.slash-hint-seen";
const SLASH_INLINE_PLACEHOLDER_TEXT = "✨ thinking…";
/** Chars of surrounding chapter text to include in inline-assist context (voice continuity). */
const SLASH_CONTEXT_BEFORE_CHARS = 500;
const SLASH_CONTEXT_AFTER_CHARS = 300;
/**
 * Minimum interval between client-initiated `manual_save` revision
 * snapshots. Without this debounce, autosave (every 30s) plus blur-saves
 * would fill the per-chapter 50-row cap in under 25 minutes of editing.
 * Five minutes gives a useful granularity for "undo my recent changes"
 * without spamming the table.
 */
const MANUAL_SNAPSHOT_DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Minimum interval between full markdown-reparse flushes during chapter
 * streaming. Anthropic / OpenAI deliver ~50–200 tokens/sec; on a long chapter
 * a per-frame (~16 ms) full reparse caused the editor to freeze. 180 ms gives
 * roughly 5–6 visible flushes per second which still reads smoothly.
 */
const STREAM_FLUSH_MIN_MS = 180;

function readPref(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === "1";
}

function writePref(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "AbortError";
  }
  if (err instanceof Error) {
    return err.name === "AbortError";
  }
  return false;
}

/**
 * Max wait per chapter (fetch + full stream + server persist). Slightly above
 * `/api/ai/generate-chapter` `maxDuration` (300s) so the server can finish
 * after the model stops; avoids bulk "Generate all" hanging forever on one chapter.
 */
const CHAPTER_STREAM_FETCH_TIMEOUT_MS = 330_000;

function textblockRangeAt(editor: Editor, pos: number): { from: number; to: number } {
  const $pos = editor.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d -= 1) {
    const node = $pos.node(d);
    if (node.isTextblock) {
      return { from: $pos.start(d), to: $pos.end(d) };
    }
  }
  return { from: pos, to: pos };
}

/**
 * Locate the inline-assist "✨ thinking…" placeholder in the current
 * document and replace that range with `replacement`. Returns `true`
 * when the placeholder was found and replaced, `false` otherwise.
 *
 * The placeholder is written as `<em>✨ thinking…</em>` with a unique
 * data attribute, but ProseMirror erases the attribute for unknown marks
 * — so we locate it purely by the textual sentinel. The sentinel uses
 * the fixed `SLASH_INLINE_PLACEHOLDER_TEXT` constant (✨ + 'thinking…')
 * which is deliberately weird enough that authors are unlikely to type
 * it verbatim during the 1–3 s window we're waiting on OpenAI.
 *
 * `asHtml=true` signals that `replacement` is trusted HTML (e.g. from
 * `markdownToHtml`); `asHtml=false` treats it as plain text. We
 * deliberately re-insert plain text as plain text (`insertContent` with
 * a string) so failure restore doesn't accidentally re-render markdown.
 */
function replaceInlinePlaceholder(
  editor: Editor,
  replacement: string,
  opts?: { asHtml?: boolean },
): boolean {
  const needle = SLASH_INLINE_PLACEHOLDER_TEXT;
  const docText = editor.state.doc.textBetween(
    0,
    editor.state.doc.content.size,
    "\n\n",
  );
  const idx = docText.indexOf(needle);
  if (idx === -1) return false;

  /* `textBetween` collapses block breaks into the separator we pass in
   * (here "\n\n" = 2 chars). ProseMirror positions count block-close
   * and block-open as 1 each (so "\n\n" ≈ 2 PM positions), which makes
   * `idx` a good approximation of the ProseMirror position. When the
   * doc has many nested nodes this can drift, so we scan a small window
   * and anchor on the actual match via `doc.nodesBetween`. */
  let fromPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (fromPos != null) return false;
    if (!node.isText || !node.text) return undefined;
    const match = node.text.indexOf(needle);
    if (match !== -1) {
      fromPos = pos + match;
      return false;
    }
    return undefined;
  });

  if (fromPos == null) return false;
  const toPos = fromPos + needle.length;

  if (opts?.asHtml) {
    editor
      .chain()
      .focus()
      .deleteRange({ from: fromPos, to: toPos })
      .insertContentAt(fromPos, replacement)
      .run();
  } else {
    /* Preserve the user's original text untransformed. Insert as plain
     * string so formatting chars aren't parsed as Markdown. */
    editor
      .chain()
      .focus()
      .deleteRange({ from: fromPos, to: toPos })
      .insertContentAt(fromPos, replacement)
      .run();
  }
  return true;
}

export function ChapterEditor({
  bookId,
  bookTitle,
  bookSubtitle,
  bookType,
  initialChapters,
  chapter,
  subscriptionTier,
  userId,
  askRewriteOnOutlineEdit,
  autoSlopScan,
  isInSeries,
  continuityChecksEnabled,
  initialContinuityWarnings,
}: ChapterEditorProps) {
  const router = useRouter();
  const { loadBook } = useBook();

  const [chapters, setChapters] = useState(initialChapters);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [localBookTitle, setLocalBookTitle] = useState(bookTitle);
  const [localBookSubtitle, setLocalBookSubtitle] = useState(bookSubtitle ?? "");
  const [outlineSummary, setOutlineSummary] = useState(chapter.outline_summary ?? "");
  const [authorNotes, setAuthorNotes] = useState(chapter.author_notes ?? "");
  const [targetWordCount, setTargetWordCount] = useState<number | null>(
    chapter.target_word_count,
  );
  const [expandOutlineOpen, setExpandOutlineOpen] = useState(false);
  const [expandOutlinePrompt, setExpandOutlinePrompt] = useState("");
  const [expandOutlineBusy, setExpandOutlineBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<ChapterStatusDb>(chapter.status);
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [currentWords, setCurrentWords] = useState(0);
  const showStuckRecover = useMemo(() => {
    if (localStatus !== "generating" || isGenerating || aiBusy) {
      return false;
    }
    const raw = chapter.updated_at;
    if (!raw) {
      return false;
    }
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) {
      return false;
    }
    return Date.now() - t > 2 * 60 * 1000;
  }, [localStatus, isGenerating, aiBusy, chapter.updated_at]);

  const streamFlushRaf = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMdRef = useRef("");
  const lastRenderedMdRef = useRef("");
  const lastFlushAt = useRef(0);
  /**
   * Timestamp of the most recent successful manual-save snapshot for the
   * currently-open chapter. Reset whenever `chapter.id` changes so the
   * first save in a freshly-opened chapter always snapshots.
   */
  const lastManualSnapshotAtRef = useRef<number>(0);
  const runGenerateChapterRef = useRef<
    ((opts?: { regenerateForOutline?: boolean }) => Promise<void>) | null
  >(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  /**
   * Monotonic counter bumped on Cmd/Ctrl+S so the SaveIndicator can replay
   * its one-shot gold-flash animation without us reaching inside it. We use
   * a counter rather than a boolean to sidestep the "same value, no render"
   * problem when the user mashes the shortcut.
   */
  const [saveFlashKey, setSaveFlashKey] = useState(0);

  const [spellcheckOn, setSpellcheckOn] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  /**
   * Distraction-free focus mode. Strictly more aggressive than zen —
   * hides the toolbar, sidebar, mini rail, outline panel, status badge,
   * save indicator, and previous/next footer. Rendered as pure view
   * state: streaming, autosave, AI flows are untouched.
   */
  const [focusMode, setFocusMode] = useState(false);
  /**
   * Visibility of the minimal focus-mode overlay (word count + exit
   * hint). Driven by the initial 2s appear delay and the 3s idle
   * timeout — see the activity effect below. `null` while focus mode
   * is off so the overlay isn't rendered at all.
   */
  const [focusOverlayVisible, setFocusOverlayVisible] = useState(false);

  const [consistencyOpen, setConsistencyOpen] = useState(false);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckResult | null>(
    null,
  );
  const [consistencyError, setConsistencyError] = useState<string | null>(null);
  const [consistencyErrorCode, setConsistencyErrorCode] = useState<string | null>(null);

  const [slopPopover, setSlopPopover] = useState<SlopPopoverState | null>(null);
  const [slopScanBusy, setSlopScanBusy] = useState(false);
  const [deepSlopBusy, setDeepSlopBusy] = useState(false);
  const [deepSlopItems, setDeepSlopItems] = useState<DeepSlopItem[]>([]);

  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [transitionResults, setTransitionResults] = useState<TransitionRewriteResultRow[] | null>(
    null,
  );
  const [transitionSummary, setTransitionSummary] = useState<{
    updated: number;
    total: number;
  } | null>(null);
  const [transitionRequestError, setTransitionRequestError] = useState<string | null>(null);
  const lastTransitionTargetIdsRef = useRef<string[]>([]);

  const [findOpen, setFindOpen] = useState(false);
  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [voiceMemoOpen, setVoiceMemoOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  const [assistPanel, setAssistPanel] = useState<AssistPromptPanelState>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInitial, setLinkInitial] = useState<string | null>(null);

  /**
   * Card-stack panel for the bubble-menu inline AI commands (Rewrite, Expand,
   * Shorten, Describe, Show Don't Tell, Custom). `null` means the panel is
   * closed. State transitions happen in `openInlineCommand` / `runInlineCommandStream`
   * — see those callbacks for the flow.
   */
  const [inlineCommandPanel, setInlineCommandPanel] =
    useState<InlineCommandPanelState>(null);
  /* Lives outside state so the abort is synchronous — if the user closes
   * the panel mid-stream we can cancel the fetch before React even
   * re-renders. Also lets Regenerate safely tear down the previous stream. */
  const inlineCommandAbortRef = useRef<AbortController | null>(null);
  const chapterGenerationAbortRef = useRef<AbortController | null>(null);
  const chapterGenerationReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );
  const chapterGenerationCancelledRef = useRef(false);
  const chapterGenerationStopToastShownRef = useRef(false);

  /**
   * Shows the one-time "Press / for commands" toast the first time the
   * user focuses the editor on this device for this account. Dismissed
   * forever once the user either triggers a slash command or simply
   * focuses again after the toast is shown.
   */
  const [slashHintVisible, setSlashHintVisible] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  /**
   * The scrollable viewport that wraps `<EditorContent>`. Typewriter mode
   * scrolls this element (not `window`) so the caret stays vertically
   * centered without disturbing the page-level layout.
   */
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  /**
   * TipTap's `onSelectionUpdate` callback is captured once at `useEditor`
   * creation time — binding `typewriterMode` / `isGenerating` directly would
   * freeze them at their initial values. Mirror them into refs instead so
   * the callback always reads the live value without re-initialising the
   * whole editor instance.
   */
  const typewriterModeRef = useRef(false);
  const isGeneratingRef = useRef(false);
  /**
   * Mirrors the authoritative `saveState` for consumption inside TipTap
   * callbacks. `onUpdate` is captured once at `useEditor` construction; we
   * don't want a typed keystroke that arrives mid-save to stomp the
   * `saving` badge back to `dirty`.
   */
  const saveStateRef = useRef<SaveState>("idle");
  const serverContentRef = useRef<string>(chapter.content ?? "");
  const applySaveState = (next: SaveState) => {
    saveStateRef.current = next;
    setSaveState(next);
  };
  /**
   * Cached `prefers-reduced-motion` match. Read once and refreshed via a
   * media-query listener so the typewriter scroll can flip to `behavior:
   * "auto"` without querying matchMedia on every selection tick.
   */
  const reducedMotionRef = useRef(false);
  /**
   * Stable ref to the slash-command dispatcher. TipTap's `useEditor` runs
   * its extensions at mount time — binding the handler directly would
   * either capture stale state or cause a full editor re-init on every
   * change. Using a ref lets the extension call a fresh callback without
   * tearing down the editor instance.
   */
  const slashCommandHandlerRef = useRef<
    ((inv: SlashCommandInvocation) => void) | null
  >(null);

  /**
   * Stable ref to the currently-open chapter ID. The SceneBeat TipTap
   * node view reads this at Generate time via `extension.options
   * .getChapterId()`. Using a ref (instead of closing over `chapter.id`
   * when the extension is configured) keeps the extension array stable
   * across chapter navigation, so `useEditor` doesn't tear down and
   * rebuild the TipTap instance.
   */
  const chapterIdRef = useRef<string | null>(chapter.id ?? null);
  useEffect(() => {
    chapterIdRef.current = chapter.id ?? null;
  }, [chapter.id]);

  const typewriterStorageKey = `${TYPEWRITER_STORAGE_PREFIX}-${userId}`;
  const focusStorageKey = `${FOCUS_STORAGE_PREFIX}-${userId}`;

  const stopChapterGeneration = useCallback(() => {
    const controller = chapterGenerationAbortRef.current;
    chapterGenerationCancelledRef.current = true;
    try {
      chapterGenerationReaderRef.current?.cancel();
    } catch {
      /* reader may already be closed */
    }
    controller?.abort();
    setIsGenerating(false);
    setLocalStatus("pending");
    editorRef.current?.setEditable(true);
    chapterGenerationStopToastShownRef.current = true;
    toast.message("Chapter generation stopped.");
  }, []);

  useEffect(() => {
    return () => {
      chapterGenerationCancelledRef.current = true;
      try {
        chapterGenerationReaderRef.current?.cancel();
      } catch {
        /* reader may already be closed */
      }
      chapterGenerationAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setSpellcheckOn(readPref(SPELLCHECK_STORAGE_KEY, true));
    setZenMode(readPref(ZEN_STORAGE_KEY, false));
    setTypewriterMode(readPref(typewriterStorageKey, false));
    setFocusMode(readPref(focusStorageKey, false));
  }, [typewriterStorageKey, focusStorageKey]);

  /**
   * Detect whether we're on a Mac so the focus-mode tooltip can show
   * the correct modifier glyph (⌘ vs Ctrl). `navigator.platform` is
   * deprecated but still the pragmatic check here — `userAgentData` is
   * not yet supported on Safari/Firefox. Memoised client-side only.
   */
  const isMacPlatform = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const platform = navigator.platform || "";
    const ua = navigator.userAgent || "";
    return /Mac|iPhone|iPad|iPod/i.test(platform) || /Macintosh/i.test(ua);
  }, []);

  /* Toggle the body-level class while focus mode is on so global
   * layout chrome (nav bars, etc.) can opt into hiding. Removed on
   * unmount so navigating away doesn't leave a ghost class. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (focusMode) body.classList.add(FOCUS_BODY_CLASS);
    else body.classList.remove(FOCUS_BODY_CLASS);
    return () => {
      body.classList.remove(FOCUS_BODY_CLASS);
    };
  }, [focusMode]);

  /* Overlay fade-in / idle fade-out. Resets its timers whenever focus
   * mode is toggled so entering focus always starts from the clean
   * "hidden → 2s → appear" sequence regardless of previous state. */
  useEffect(() => {
    if (!focusMode) {
      setFocusOverlayVisible(false);
      return;
    }
    if (typeof window === "undefined") return;

    let idleTimer: number | null = null;
    const scheduleIdleHide = () => {
      if (idleTimer != null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(
        () => setFocusOverlayVisible(false),
        FOCUS_OVERLAY_IDLE_MS,
      );
    };

    /* Initial reveal 2s after entering focus mode; then start the idle
     * timer so the overlay fades again if the author stops typing. */
    const initialTimer = window.setTimeout(() => {
      setFocusOverlayVisible(true);
      scheduleIdleHide();
    }, FOCUS_OVERLAY_INITIAL_DELAY_MS);

    const onActivity = () => {
      setFocusOverlayVisible(true);
      scheduleIdleHide();
    };

    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity, { passive: true });

    return () => {
      window.clearTimeout(initialTimer);
      if (idleTimer != null) window.clearTimeout(idleTimer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pointerdown", onActivity);
    };
  }, [focusMode]);

  /* Keep the stale-closure refs in sync with the authoritative state so the
   * editor's `onSelectionUpdate` (defined once at `useEditor` time) always
   * sees the latest values. */
  useEffect(() => {
    typewriterModeRef.current = typewriterMode;
  }, [typewriterMode]);
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  /* `prefers-reduced-motion` can flip mid-session (Windows High Contrast
   * toggle, OS-level setting changes). Subscribe so the typewriter scroll
   * switches between smooth / instant without a refresh. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  const sorted = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters],
  );
  const allChaptersPending =
    sorted.length > 0 && sorted.every((c) => c.status === "pending");
  /**
   * Chapters that still need AI generation. `pending` means never generated;
   * `generating` covers stuck / abandoned streams from a prior session so they
   * can be retried. Already-written chapters (`draft`/`edited`/`approved`) are
   * skipped by the bulk "Generate all" flow — the per-chapter Regenerate
   * button in the toolbar is the path for intentional rewrites.
   */
  const remainingChapters = useMemo(
    () =>
      sorted.filter(
        (c) => c.status === "pending" || c.status === "generating",
      ),
    [sorted],
  );
  const hasRemaining = remainingChapters.length > 0;
  const hasAnyGenerated = remainingChapters.length < sorted.length;
  const bulkGenerateLabel = !hasRemaining
    ? "All chapters generated"
    : hasAnyGenerated
      ? `Generate remaining chapters (${remainingChapters.length})`
      : "Generate all chapters";
  const totalWords = useMemo(
    () => chapters.reduce((acc, c) => acc + (c.word_count ?? 0), 0),
    [chapters],
  );

  const chapterIndex = sorted.findIndex((c) => c.id === chapter.id);
  const prevChapter = chapterIndex > 0 ? sorted[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < sorted.length - 1 ? sorted[chapterIndex + 1] : null;

  useEffect(() => {
    setChapters(initialChapters);
  }, [initialChapters]);

  useEffect(() => {
    setLocalBookTitle(bookTitle);
  }, [bookTitle]);

  useEffect(() => {
    setLocalBookSubtitle(bookSubtitle ?? "");
  }, [bookSubtitle]);

  useEffect(() => {
    setTitle(chapter.title);
    setLocalStatus(chapter.status);
    setOutlineSummary(chapter.outline_summary ?? "");
    setAuthorNotes(chapter.author_notes ?? "");
    setTargetWordCount(chapter.target_word_count);
    serverContentRef.current = chapter.content ?? "";
    applySaveState("idle");
    setLastSavedAt(null);
    lastManualSnapshotAtRef.current = 0;
  }, [
    chapter.id,
    chapter.title,
    chapter.status,
    chapter.outline_summary,
    chapter.author_notes,
    chapter.target_word_count,
  ]);

  const saveContent = useCallback(async (): Promise<boolean> => {
    const editor = editorRef.current;
    if (!editor || isGenerating) return false;
    const html = editor.getHTML();
    const md = turndown.turndown(html);
    const sceneBeatDivPattern = /<div\b[^>]*\bdata-scene-beat\b[^>]*>/gi;
    const htmlSceneBeatCount = (html.match(sceneBeatDivPattern) ?? []).length;
    const mdSceneBeatCount = (md.match(sceneBeatDivPattern) ?? []).length;
    if (htmlSceneBeatCount !== mdSceneBeatCount) {
      console.warn("Scene-beat serialization mismatch during save", {
        chapterId: chapter.id,
        htmlSceneBeatCount,
        mdSceneBeatCount,
      });
      toast.error("Scene-beat serialization failed — save aborted to prevent data loss.");
      return false;
    }
    const words = countWords(editor.getText());
    if (localStatus === "pending" && !md.trim()) return false;
    applySaveState("saving");
    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({
        content: md,
        status: "edited",
        word_count: words,
      })
      .eq("id", chapter.id)
      .eq("book_id", bookId);

    if (error) {
      applySaveState("error");
      toast.error("Could not save chapter.");
      return false;
    }

    await supabase.rpc("recompute_book_word_count", { p_book_id: bookId });

    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapter.id ? { ...c, word_count: words, status: "edited" } : c,
      ),
    );
    setLocalStatus("edited");
    applySaveState("saved");
    setLastSavedAt(Date.now());

    /* Debounced `manual_save` revision snapshot. Fires fire-and-forget so
     * it never blocks the save indicator. We record the timestamp BEFORE
     * awaiting to avoid a double-snapshot race if two saves fire within
     * the debounce window. */
    const now = Date.now();
    if (now - lastManualSnapshotAtRef.current >= MANUAL_SNAPSHOT_DEBOUNCE_MS) {
      lastManualSnapshotAtRef.current = now;
      void snapshotManualSaveAction(chapter.id).catch(() => {
        /* snapshot is non-critical; editor UX continues regardless */
      });
    }

    /* Kick the auto-summarizer. Detached — the summarizer itself checks
     * staleness (null summary, hash mismatch, >10% word-count drift)
     * and no-ops for short chapters, so spamming this on every save is
     * free when nothing has materially changed. */
    void enqueueChapterSummary(chapter.id).catch(() => {
      /* summary refresh is best-effort; failures surface in server logs */
    });

    return true;
  }, [bookId, chapter.id, isGenerating, localStatus]);

  const saveTitle = useCallback(async () => {
    const t = title.trim() || "Untitled";
    if (t === chapter.title) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({ title: t })
      .eq("id", chapter.id)
      .eq("book_id", bookId);
    if (error) {
      toast.error("Could not save title.");
      return;
    }
    setChapters((prev) => prev.map((c) => (c.id === chapter.id ? { ...c, title: t } : c)));
  }, [bookId, chapter.id, chapter.title, title]);

  const renameChapter = useCallback(
    async (targetId: string, nextTitle: string): Promise<boolean> => {
      const t = nextTitle.trim() || "Untitled";
      const current = chapters.find((c) => c.id === targetId);
      if (!current || t === current.title) return false;
      const supabase = createClient();
      const { error } = await supabase
        .from("chapters")
        .update({ title: t })
        .eq("id", targetId)
        .eq("book_id", bookId);
      if (error) {
        toast.error("Could not rename chapter.");
        return false;
      }
      setChapters((prev) => prev.map((c) => (c.id === targetId ? { ...c, title: t } : c)));
      if (targetId === chapter.id) setTitle(t);
      return true;
    },
    [bookId, chapter.id, chapters],
  );

  const saveBookTitle = useCallback(async () => {
    const t = localBookTitle.trim();
    if (!t) {
      setLocalBookTitle(bookTitle);
      toast.error("Book title cannot be empty.");
      return;
    }
    if (t === bookTitle) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("books")
      .update({ title: t })
      .eq("id", bookId);
    if (error) {
      toast.error("Could not save book title.");
      setLocalBookTitle(bookTitle);
      return;
    }
    router.refresh();
  }, [bookId, bookTitle, localBookTitle, router]);

  const saveBookSubtitle = useCallback(async () => {
    const next = localBookSubtitle.trim();
    const prev = (bookSubtitle ?? "").trim();
    if (next === prev) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("books")
      .update({ subtitle: next || null })
      .eq("id", bookId);
    if (error) {
      const hint = /subtitle|column/i.test(error.message)
        ? " — run supabase/migrations/016_book_metadata.sql"
        : "";
      toast.error(`Could not save subtitle${hint}.`);
      setLocalBookSubtitle(prev);
      return;
    }
    router.refresh();
  }, [bookId, bookSubtitle, localBookSubtitle, router]);

  const saveOutlineSummary = useCallback(
    async (override?: string): Promise<boolean> => {
      const next = (override ?? outlineSummary).trim();
      const prev = (chapter.outline_summary ?? "").trim();
      if (next === prev) return true;
      const supabase = createClient();
      const { error } = await supabase
        .from("chapters")
        .update({ outline_summary: next || null })
        .eq("id", chapter.id)
        .eq("book_id", bookId);
      if (error) {
        toast.error("Could not save outline.");
        return false;
      }
      router.refresh();

      const statusOk =
        localStatus === "draft" ||
        localStatus === "edited" ||
        localStatus === "approved";
      if (
        askRewriteOnOutlineEdit &&
        statusOk &&
        outlineTextChangeExceeds(prev, next, 20)
      ) {
        toast("Outline updated. Rewrite chapter to match?", {
          duration: 8000,
          action: {
            label: "Rewrite",
            onClick: () => {
              void runGenerateChapterRef.current?.({
                regenerateForOutline: true,
              });
            },
          },
        });
      }
      return true;
    },
    [
      askRewriteOnOutlineEdit,
      bookId,
      chapter.id,
      chapter.outline_summary,
      localStatus,
      outlineSummary,
      router,
    ],
  );

  const saveAuthorNotes = useCallback(async (override?: string): Promise<boolean> => {
    const next = (override ?? authorNotes).trim();
    const prev = (chapter.author_notes ?? "").trim();
    if (next === prev) return true;
    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({ author_notes: next || null })
      .eq("id", chapter.id)
      .eq("book_id", bookId);
    if (error) {
      toast.error("Could not save steering notes.");
      return false;
    }
    router.refresh();
    return true;
  }, [authorNotes, bookId, chapter.author_notes, chapter.id, router]);

  const persistPromptInputsBeforeGeneration = useCallback(async (): Promise<boolean> => {
    const [outlineSaved, notesSaved] = await Promise.all([
      saveOutlineSummary(outlineSummary),
      saveAuthorNotes(authorNotes),
    ]);
    return outlineSaved && notesSaved;
  }, [authorNotes, outlineSummary, saveAuthorNotes, saveOutlineSummary]);

  const saveTargetWordCount = useCallback(
    async (next: number | null) => {
      if (next === targetWordCount) return;
      setTargetWordCount(next);
      const supabase = createClient();
      const { error } = await supabase
        .from("chapters")
        .update({ target_word_count: next })
        .eq("id", chapter.id)
        .eq("book_id", bookId);
      if (error) {
        toast.error("Could not save word target.");
        setTargetWordCount(targetWordCount);
        return;
      }
      router.refresh();
    },
    [bookId, chapter.id, router, targetWordCount],
  );

  const runExpandOutline = useCallback(async () => {
    if (expandOutlineBusy) return;
    setExpandOutlineBusy(true);
    try {
      const res = await fetch("/api/ai/expand-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          chapterId: chapter.id,
          ...(expandOutlinePrompt.trim()
            ? { prompt: expandOutlinePrompt.trim() }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        text?: string;
        error?: string;
        code?: string;
      } | null;
      if (res.status === 403 && data?.code === "UPGRADE_REQUIRED") {
        setUpgradeOpen(true);
        return;
      }
      if (!res.ok || !data?.text) {
        throw new Error(data?.error ?? "Could not expand outline.");
      }
      const expanded = data.text.trim();
      setOutlineSummary(expanded);
      await saveOutlineSummary(expanded);
      setExpandOutlineOpen(false);
      setExpandOutlinePrompt("");
      toast.success("Outline expanded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not expand outline.");
    } finally {
      setExpandOutlineBusy(false);
    }
  }, [bookId, chapter.id, expandOutlineBusy, expandOutlinePrompt, saveOutlineSummary]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      SlashCommands.configure({
        onCommand: (inv) => {
          slashCommandHandlerRef.current?.(inv);
        },
      }),
      SceneBeat.configure({
        getChapterId: () => chapterIdRef.current,
      }),
      CodexHighlight,
      SlopHighlight,
    ],
    immediatelyRender: false,
    editable: !isGenerating,
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "chapter-editor-tiptap max-w-none min-h-[420px] px-4 py-3 text-[15px] leading-relaxed text-editorial-cream focus:outline-none [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-medium [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-medium [&_h3]:mt-4 [&_h3]:font-serif [&_h3]:text-lg [&_h4]:mt-3 [&_h4]:font-serif [&_h4]:text-base [&_blockquote]:border-l-2 [&_blockquote]:border-gold/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 [&_hr]:my-6 [&_hr]:border-t [&_hr]:border-gold/40 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_code]:rounded [&_code]:bg-muted/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_pre]:rounded-md [&_pre]:bg-muted/30 [&_pre]:p-3 [&_pre]:text-[13px] [&_s]:line-through",
      },
      handleDOMEvents: {
        blur: () => {
          void saveContent();
          return false;
        },
        focus: () => {
          /* Show the slash-command hint once per (browser, userId). After
           * the first real focus, mark the flag so refocusing in the same
           * session never shows it again. The actual command invocation
           * also dismisses it (see runSlashCommand). */
          if (typeof window !== "undefined") {
            const key = `${SLASH_HINT_STORAGE_PREFIX}:${userId}`;
            if (window.localStorage.getItem(key) !== "1") {
              setSlashHintVisible(true);
              window.localStorage.setItem(key, "1");
            }
          }
          return false;
        },
      },
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const plain = clipboard.getData("text/plain");
        const html = clipboard.getData("text/html");
        if (html && html.trim()) return false;
        if (!plain) return false;
        if (!isLikelyMarkdown(plain)) return false;
        const htmlFromMd = markdownToHtml(plain);
        event.preventDefault();
        editorRef.current?.chain().focus().insertContent(htmlFromMd).run();
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      setCurrentWords(countWords(ed.getText()));
      /* Don't clobber an in-flight save with `dirty`; once the save
       * resolves (either to `saved` or `error`) subsequent keystrokes
       * will flip us back to `dirty` naturally. */
      if (saveStateRef.current === "saving") return;
      applySaveState("dirty");
    },
    /* Typewriter scroll: keep the caret line vertically centered in the
     * editor viewport. Gated on refs (not closures) so the handler stays
     * stable across the editor's lifetime. Skipped while AI is streaming
     * so the generated prose can flow naturally from top to bottom. */
    onSelectionUpdate: ({ editor: ed }) => {
      if (!typewriterModeRef.current) return;
      if (isGeneratingRef.current) return;
      const container = editorScrollRef.current;
      if (!container) return;
      const coords = ed.view.coordsAtPos(ed.state.selection.from);
      const rect = container.getBoundingClientRect();
      const targetY = rect.top + rect.height / 2;
      const delta = coords.top - targetY;
      if (Math.abs(delta) <= TYPEWRITER_MIN_DELTA_PX) return;
      container.scrollBy({
        top: delta,
        behavior: reducedMotionRef.current ? "auto" : "smooth",
      });
    },
  });

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isGenerating);
  }, [editor, isGenerating]);

  /* Codex integration: fetch the per-book entries, push them into the
   * CodexHighlight extension whenever they change, and render the hover
   * card at the decorated span the user is pointing at. Fetch + matcher +
   * decoration are all cheap enough to run inline — typical codexes are
   * tens of entries, not thousands. */
  const { entries: codexEntries, seriesName: codexSeriesName } = useCodexEntries(bookId);
  const [forcedCodexEntryIds, setForcedCodexEntryIds] = useState<string[]>([]);
  const {
    hoveredEntry: codexHoveredEntry,
    hoveredRect: codexHoveredRect,
    handleCardEnter: onCodexCardEnter,
    handleCardLeave: onCodexCardLeave,
  } = useCodexHighlight({ editor, entries: codexEntries, seriesName: codexSeriesName });
  const codexToolbarOptions = useMemo<CodexToolbarEntryOption[]>(
    () =>
      [...codexEntries]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          entryType: entry.entry_type,
        })),
    [codexEntries],
  );

  useEffect(() => {
    const validIds = new Set(codexEntries.map((entry) => entry.id));
    setForcedCodexEntryIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [codexEntries]);

  useEffect(() => {
    setForcedCodexEntryIds([]);
  }, [chapter.id]);

  const toggleForcedCodexEntry = useCallback((entryId: string) => {
    setForcedCodexEntryIds((prev) =>
      {
        const next = prev.includes(entryId)
          ? prev.filter((id) => id !== entryId)
          : [...prev, entryId];
        return next;
      },
    );
  }, [chapter.id]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute("spellcheck", spellcheckOn ? "true" : "false");
  }, [editor, spellcheckOn]);

  useEffect(() => {
    setSlopPopover(null);
    setDeepSlopItems([]);
    if (!editor) return;
    editor.commands.setSlopHighlightConfig({ bookType, enabled: false });
  }, [bookType, chapter.id, editor]);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest(".slop-highlight");
      if (!el) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const info = slopDecorationFromEvent(e);
      if (!info) {
        return;
      }
      setSlopPopover({
        order: info.order,
        pattern: info.pattern,
        category: info.category,
        matchedText: info.matchedText,
        from: info.from,
        to: info.to,
        rect: el.getBoundingClientRect(),
      });
    };
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [editor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.ctrlKey || e.metaKey;
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase();
      const isFormField =
        tag === "input" || tag === "textarea" || tag === "select" ||
        (active as HTMLElement | null)?.isContentEditable;

      if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        /* Intercept the browser's "save page" dialog globally. The chapter
         * editor is the dominant UI on this route and a rogue Save As… on
         * accidental Cmd+S is disorienting; always hijack and autosave
         * instead. The flash key gives visual confirmation without a toast. */
        e.preventDefault();
        setSaveFlashKey((k) => k + 1);
        void saveContent();
        return;
      }
      if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
        const inMain =
          mainRef.current?.contains(active) || active === document.body;
        if (inMain) {
          e.preventDefault();
          setFindOpen(true);
          setTimeout(() => findInputRef.current?.focus(), 0);
        }
        return;
      }
      if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        const inMain = mainRef.current?.contains(active);
        if (inMain) {
          e.preventDefault();
          const ed = editorRef.current;
          const href = ed?.getAttributes("link")?.href ?? null;
          setLinkInitial(typeof href === "string" && href ? href : null);
          setLinkOpen(true);
        }
        return;
      }
      if (e.key === "?" && !isFormField) {
        e.preventDefault();
        setCheatsheetOpen(true);
        return;
      }
      /* Cmd/Ctrl+. toggles distraction-free focus mode. We deliberately
       * intercept this globally (not only when the editor is focused)
       * so the author can flip in/out while any interactive panel is
       * up — the keypress is rare enough not to clash with anything
       * else. Shift/Alt make us yield so Chrome's dev shortcuts still
       * work. Inlined (rather than calling `onToggleFocus`) because the
       * toggle handler is declared later in the component body and
       * wiring a ref just for this would be noise. */
      if (cmd && !e.shiftKey && !e.altKey && e.key === ".") {
        e.preventDefault();
        setFocusMode((v) => {
          const next = !v;
          writePref(focusStorageKey, next);
          return next;
        });
        return;
      }
      if (e.key === "Escape") {
        /* In focus mode, Esc is the primary exit affordance. Handle it
         * first so it doesn't collide with the zen-mode exit below
         * (they're mutually exclusive: you can't be in both modes). */
        if (focusMode) {
          setFocusMode(false);
          writePref(focusStorageKey, false);
          return;
        }
        if (zenMode) {
          setZenMode(false);
          writePref(ZEN_STORAGE_KEY, false);
        }
        setFindOpen(false);
        setAssistPanel(null);
        setLinkOpen(false);
        setCheatsheetOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zenMode, focusMode, focusStorageKey, saveContent]);

  useEffect(() => {
    if (!editor) return;
    const result = syncChapterContentWithEditor({
      editor,
      chapterContent: chapter.content,
      serverContent: serverContentRef.current,
      saveState: saveStateRef.current,
      markdownToHtml,
      toMarkdown: (html) => turndown.turndown(html),
      onConflict: () => {
        toast.error(
          "This chapter was updated elsewhere. Your local edits are preserved; save to overwrite the remote version.",
        );
      },
      onHydrated: () => {
        queueMicrotask(() => setCurrentWords(countWords(editor.getText())));
      },
      onHydrationComplete: () => {
        applySaveState("idle");
      },
    });
    serverContentRef.current = result.nextServerContent;
  }, [chapter.id, chapter.content, editor]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void saveContent();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [saveContent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setBookSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onChapterRowUpdate = useCallback(
    (mutator: (prev: ChapterListItem[]) => ChapterListItem[]) => setChapters(mutator),
    [],
  );
  const onCurrentChapterChanged = useCallback(
    (row: { status: ChapterStatusDb; title?: string | null }) => {
      setLocalStatus(row.status);
      if (row.title) setTitle(row.title);
    },
    [],
  );
  const onContentChangedRemotely = useCallback((nextMd: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const localMd = turndown.turndown(ed.getHTML());
    if (nextMd.trim() === localMd.trim()) return;
    if (saveStateRef.current === "dirty" || saveStateRef.current === "saving") {
      toast("This chapter was updated in another tab.", {
        duration: 8000,
        action: {
          label: "Reload remote version",
          onClick: () => {
            ed.commands.setContent(markdownToHtml(nextMd), false);
            serverContentRef.current = nextMd;
            applySaveState("idle");
          },
        },
      });
      return;
    }
    ed.commands.setContent(markdownToHtml(nextMd), false);
    serverContentRef.current = nextMd;
    setCurrentWords(countWords(ed.getText()));
    applySaveState("idle");
  }, []);

  useChapterRealtime({
    bookId,
    chapterId: chapter.id,
    onChapterRowUpdate,
    onCurrentChapterChanged,
    onContentChangedRemotely,
  });

  const findAll = useFindMatches({ editor, open: findOpen, query: findQuery, caseSensitive });
  const { matches, matchIndex, setMatches, setMatchIndex, gotoMatch, findNext, findPrev } =
    findAll;

  const replaceCurrent = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const m = matches[matchIndex];
    if (!m) return;
    const replaceLen = replaceQuery.length;
    const newRangeEnd = m.from + replaceLen;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replaceQuery)
      .run();
    const nextList = findMatchesInDoc(editor, findQuery, caseSensitive);
    setMatches(nextList);
    if (nextList.length === 0) {
      setMatchIndex(0);
      return;
    }
    const nextIdx = nextMatchIndexAfterReplace(nextList, newRangeEnd);
    setMatchIndex(nextIdx);
    gotoMatch(nextIdx, nextList);
    void saveContent();
  }, [
    caseSensitive,
    editor,
    findQuery,
    gotoMatch,
    matchIndex,
    matches,
    replaceQuery,
    saveContent,
    setMatchIndex,
    setMatches,
  ]);

  const replaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return;
    /* Apply replacements right-to-left so each insert targets the original
     * match coordinates. This keeps ranges stable even when `replaceQuery`
     * contains `findQuery` (e.g. cat -> concat), preventing double-replace. */
    const ordered = [...matches].sort((a, b) => b.from - a.from);
    let chain = editor.chain().focus();
    for (const m of ordered) {
      chain = chain.insertContentAt({ from: m.from, to: m.to }, replaceQuery);
    }
    chain.run();
    toast.success(`Replaced ${ordered.length} match${ordered.length === 1 ? "" : "es"}.`);
    setMatches([] as FindMatch[]);
    setMatchIndex(0);
    void saveContent();
  }, [editor, matches, replaceQuery, saveContent, setMatchIndex, setMatches]);

  const onApplyBookReplaceInCurrent = useCallback(
    async (findStr: string, rep: string, opts: BookTextSearchOptions) => {
      const ed = editorRef.current;
      if (!ed) return;
      const md = turndown.turndown(ed.getHTML());
      const { next, count } = applyTextReplace(md, findStr, rep, opts);
      if (count === 0) {
        toast.info("No matches in this chapter.");
        return;
      }
      ed.commands.setContent(markdownToHtml(next), false);
      setCurrentWords(countWords(ed.getText()));
      await saveContent();
      void loadBook(bookId);
      toast.success(
        `Replaced ${count} match${count === 1 ? "" : "es"} in this chapter.`,
      );
    },
    [bookId, loadBook, saveContent],
  );

  const onOpenInChapterFind = useCallback(
    (query: string, caseSens: boolean, matchIndex0: number) => {
      setFindOpen(true);
      setFindQuery(query);
      setCaseSensitive(caseSens);
      requestAnimationFrame(() => {
        const ed = editorRef.current;
        if (!ed) {
          return;
        }
        const list = findMatchesInDoc(ed, query, caseSens);
        if (list.length === 0) {
          setMatches([] as FindMatch[]);
          setMatchIndex(0);
          toast.info(
            "No match in the editor for that query — the saved chapter may differ from what is open.",
          );
          return;
        }
        const idx = Math.min(Math.max(0, matchIndex0), list.length - 1);
        setMatches(list);
        setMatchIndex(idx);
        const m = list[idx];
        if (m) {
          ed
            .chain()
            .focus()
            .setTextSelection({ from: m.from, to: m.to })
            .scrollIntoView()
            .run();
        }
      });
    },
    [setCaseSensitive, setFindQuery, setMatchIndex, setMatches],
  );

  const flushStreamToEditor = useCallback(
    (md: string) => {
      if (!editor) return;
      if (md === lastRenderedMdRef.current) return;
      try {
        const html = markdownToHtml(md);
        editor.commands.setContent(html, false);
        setCurrentWords(countWords(editor.getText()));
        lastRenderedMdRef.current = md;
        lastFlushAt.current = Date.now();
      } catch {
        /* ignore parse errors mid-stream */
      }
    },
    [editor],
  );

  const scheduleStreamFlush = useCallback(
    (md: string) => {
      pendingMdRef.current = md;
      if (streamFlushRaf.current != null) return;
      const elapsed = Date.now() - lastFlushAt.current;
      const delay =
        elapsed >= STREAM_FLUSH_MIN_MS ? 0 : STREAM_FLUSH_MIN_MS - elapsed;
      streamFlushRaf.current = setTimeout(() => {
        streamFlushRaf.current = null;
        flushStreamToEditor(pendingMdRef.current);
      }, delay);
    },
    [flushStreamToEditor],
  );

  const streamChapterGeneration = useCallback(
    async (
      targetChapterId: string,
      targetChapterNumber: number,
      displayInEditor: boolean,
      opts?: { regenerateForOutline?: boolean },
    ): Promise<{ ok: boolean; upgrade?: boolean; skipped?: boolean }> => {
      if (
        subscriptionTier === "free" &&
        targetChapterNumber > FREE_MAX_CHAPTERS_PER_BOOK
      ) {
        return { ok: true, skipped: true };
      }

      const ed = editorRef.current;
      if (displayInEditor && !ed) return { ok: false };

      if (displayInEditor && ed) {
        if (saveStateRef.current === "dirty") {
          await saveContent().catch(() => {
            /* logged inside saveContent */
          });
        }
        setIsGenerating(true);
        setLocalStatus("generating");
        ed.commands.setContent("<p></p>", false);
        pendingMdRef.current = "";
        lastRenderedMdRef.current = "";
        lastFlushAt.current = 0;
      }
      const generationAbortController = new AbortController();
      if (displayInEditor) {
        chapterGenerationAbortRef.current = generationAbortController;
        chapterGenerationCancelledRef.current = false;
        chapterGenerationStopToastShownRef.current = false;
      }

      let timedOutByClient = false;
      const streamDeadlineTimer = window.setTimeout(() => {
        timedOutByClient = true;
        generationAbortController.abort();
      }, CHAPTER_STREAM_FETCH_TIMEOUT_MS);

      try {
        const res = await fetch("/api/ai/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: generationAbortController.signal,
          body: JSON.stringify({
            bookId,
            chapterId: targetChapterId,
            ...(forcedCodexEntryIds.length > 0
              ? { selectedCodexEntryIds: forcedCodexEntryIds }
              : {}),
            ...(opts?.regenerateForOutline
              ? { regenerateForOutline: true }
              : {}),
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
            code?: string;
            upgrade?: boolean;
          } | null;
          if (
            res.status === 403 &&
            (err?.code === "UPGRADE_REQUIRED" || err?.upgrade)
          ) {
            if (displayInEditor && ed) {
              setUpgradeOpen(true);
              setLocalStatus(chapter.status);
              const html = markdownToHtml(chapter.content ?? "");
              ed.commands.setContent(html, false);
              setCurrentWords(countWords(ed.getText()));
            }
            return { ok: false, upgrade: true };
          }
          throw new Error(err?.error ?? "Generation failed.");
        }
        if (!res.body) throw new Error("No response body.");
        const reader = res.body.getReader();
        if (displayInEditor) {
          chapterGenerationReaderRef.current = reader;
        }
        let accumulated = "";
        for await (const part of readDataStream(reader)) {
          if (part.type === "text") {
            accumulated += part.value;
            if (displayInEditor) scheduleStreamFlush(accumulated);
          } else if (part.type === "data") {
            const arr = part.value;
            if (Array.isArray(arr) && arr[0] && typeof arr[0] === "object") {
              const row = arr[0] as { chapterai?: string };
              if (row.chapterai === "revert_may_have_failed") {
                toast.error(
                  "Could not confirm the chapter was reset in the database. Refresh the page to see the true status.",
                );
              } else if (row.chapterai === "codex_no_auto_match") {
                toast.message(
                  "No codex entries were auto-matched. Use Codex include to force entries into this generation.",
                );
              }
            }
          } else if (part.type === "error") {
            throw new Error(String(part.value));
          }
        }
        if (displayInEditor && chapterGenerationCancelledRef.current) {
          throw new DOMException("Chapter generation aborted by user", "AbortError");
        }
        if (displayInEditor) {
          if (streamFlushRaf.current != null) {
            clearTimeout(streamFlushRaf.current);
            streamFlushRaf.current = null;
          }
          flushStreamToEditor(accumulated);
          /* Align hydration ref with streamed body so a fast `router.refresh()` does not
           * treat the editor as newer than props and replace prose with an empty reverted row. */
          serverContentRef.current = accumulated.trim();
          setLocalStatus("draft");
        }
        return { ok: true };
      } catch (e) {
        const userStopped =
          isAbortError(e) &&
          displayInEditor &&
          chapterGenerationCancelledRef.current;
        if (userStopped) {
          if (displayInEditor) {
            if (streamFlushRaf.current != null) {
              clearTimeout(streamFlushRaf.current);
              streamFlushRaf.current = null;
            }
            if (pendingMdRef.current.trim().length > 0) {
              flushStreamToEditor(pendingMdRef.current);
            }
            setLocalStatus("pending");
            if (!chapterGenerationStopToastShownRef.current) {
              chapterGenerationStopToastShownRef.current = true;
              toast.message("Chapter generation stopped.");
            }
          }
          return { ok: false };
        }
        if (isAbortError(e) && timedOutByClient) {
          const minutes = Math.round(CHAPTER_STREAM_FETCH_TIMEOUT_MS / 60_000);
          const timeoutMsg = `This chapter exceeded ${minutes} minutes and was cancelled. Try Regenerate on that chapter, or shorten steering notes / prior context.`;
          if (displayInEditor && ed) {
            toast.error(timeoutMsg);
            setLocalStatus(chapter.status);
            const html = markdownToHtml(chapter.content ?? "");
            ed.commands.setContent(html, false);
            setCurrentWords(countWords(ed.getText()));
          } else {
            toast.error(timeoutMsg);
          }
          return { ok: false };
        }
        const msg = userFacingFetchError(e, "Chapter generation").message;
        if (displayInEditor && ed) {
          toast.error(msg);
          setLocalStatus(chapter.status);
          const html = markdownToHtml(chapter.content ?? "");
          ed.commands.setContent(html, false);
          setCurrentWords(countWords(ed.getText()));
        } else {
          toast.error(msg);
        }
        return { ok: false };
      } finally {
        window.clearTimeout(streamDeadlineTimer);
        if (streamFlushRaf.current != null) {
          clearTimeout(streamFlushRaf.current);
          streamFlushRaf.current = null;
        }
        if (displayInEditor) {
          setIsGenerating(false);
          chapterGenerationReaderRef.current = null;
          if (chapterGenerationAbortRef.current === generationAbortController) {
            chapterGenerationAbortRef.current = null;
          }
          chapterGenerationCancelledRef.current = false;
        }
      }
    },
    [
      bookId,
      chapter.content,
      chapter.status,
      flushStreamToEditor,
      saveContent,
      scheduleStreamFlush,
      subscriptionTier,
      forcedCodexEntryIds,
    ],
  );

  const recoverStuckChapter = useCallback(async () => {
    setRecoverBusy(true);
    try {
      const res = await fetch("/api/ai/recover-stuck-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: chapter.id }),
      });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        changed?: boolean;
      } | null;
      if (!res.ok) {
        throw new Error(j?.error ?? "Could not reset chapter status.");
      }
      setLocalStatus("pending");
      if (j?.changed) {
        toast.success("Chapter reset. You can generate again when ready.");
      } else {
        toast.message("Status was already up to date.");
      }
      router.refresh();
    } catch (e) {
      toast.error(userFacingFetchError(e, "Recover chapter").message);
    } finally {
      setRecoverBusy(false);
    }
  }, [bookId, chapter.id, router]);

  const streamVoiceToChapter = useCallback(
    async (recBlob: Blob, mode: VoiceMemoMode, durationMs: number) => {
      const ed = editorRef.current;
      if (!ed) return;
      if (subscriptionTier !== "pro") {
        setUpgradeOpen(true);
        return;
      }
      const preMd = turndown.turndown(ed.getHTML());
      const isAppend = mode === "append";
      setIsGenerating(true);
      setLocalStatus("generating");
      if (!isAppend) {
        if (saveStateRef.current === "dirty") {
          await saveContent().catch(() => {
            /* logged inside saveContent */
          });
        }
        ed.commands.setContent("<p></p>", false);
        pendingMdRef.current = "";
        lastRenderedMdRef.current = "";
        lastFlushAt.current = 0;
      } else {
        pendingMdRef.current = preMd;
        lastRenderedMdRef.current = preMd;
        lastFlushAt.current = 0;
      }
      const fd = new FormData();
      fd.append("audio", recBlob, "memo.webm");
      fd.append("bookId", bookId);
      fd.append("chapterId", chapter.id);
      fd.append("mode", mode);
      fd.append("durationMs", String(durationMs));
      try {
        const res = await fetch("/api/ai/voice-to-chapter", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
            code?: string;
          } | null;
          if (res.status === 403 && err?.code === "UPGRADE_REQUIRED") {
            setUpgradeOpen(true);
            setLocalStatus(chapter.status);
            const html = markdownToHtml(chapter.content ?? "");
            ed.commands.setContent(html, false);
            setCurrentWords(countWords(ed.getText()));
            return;
          }
          if (res.status === 413) {
            throw new Error(err?.error ?? "Recording is too large (max 15MB).");
          }
          throw new Error(err?.error ?? "Voice draft failed.");
        }
        if (!res.body) throw new Error("No response body.");
        const reader = res.body.getReader();
        let accumulated = "";
        for await (const part of readDataStream(reader)) {
          if (part.type === "text") {
            accumulated += part.value;
            if (isAppend) {
              const full = (preMd.trim() ? `${preMd.trim()}\n\n` : "") + accumulated;
              scheduleStreamFlush(full);
            } else {
              scheduleStreamFlush(accumulated);
            }
          }
          if (part.type === "error") {
            throw new Error(String(part.value));
          }
        }
        if (streamFlushRaf.current != null) {
          clearTimeout(streamFlushRaf.current);
          streamFlushRaf.current = null;
        }
        const finalMd = isAppend
          ? (preMd.trim() ? `${preMd.trim()}\n\n` : "") + accumulated
          : accumulated;
        flushStreamToEditor(finalMd);
        toast.success("Voice memo drafted.");
        router.refresh();
        setLocalStatus("draft");
      } catch (e) {
        const msg = userFacingFetchError(e, "Voice draft").message;
        toast.error(msg);
        setLocalStatus(chapter.status);
        const html = markdownToHtml(chapter.content ?? "");
        ed.commands.setContent(html, false);
        setCurrentWords(countWords(ed.getText()));
      } finally {
        if (streamFlushRaf.current != null) {
          clearTimeout(streamFlushRaf.current);
          streamFlushRaf.current = null;
        }
        setIsGenerating(false);
      }
    },
    [
      bookId,
      chapter.content,
      chapter.id,
      chapter.status,
      flushStreamToEditor,
      saveContent,
      scheduleStreamFlush,
      subscriptionTier,
      router,
    ],
  );

  const runPostGenerationSlopScan = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) {
      toast.success("Chapter generated.");
      return;
    }
    try {
      const text = turndown.turndown(ed.getHTML());
      const res = await fetch("/api/ai/slop-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: chapter.id, text }),
      });
      const data = (await res.json().catch(() => null)) as {
        matches?: unknown[];
        error?: string;
      } | null;
      if (res.status === 429) {
        toast.success("Chapter generated. Slop scan skipped (rate limit).");
        return;
      }
      if (!res.ok || !data) {
        toast.success("Chapter generated. Slop scan could not run.");
        return;
      }
      const n = Array.isArray(data.matches) ? data.matches.length : 0;
      ed.chain()
        .setSlopHighlightConfig({ bookType, enabled: true })
        .rescanSlopHighlights()
        .run();
      if (n === 0) {
        toast.success("Chapter generated. No banned phrase patterns detected.");
      } else {
        toast.success(
          `Chapter generated. Flagged ${n} phrase pattern(s) — underlined in the editor.`,
        );
      }
    } catch {
      toast.success("Chapter generated. Slop scan could not run.");
    }
  }, [bookId, bookType, chapter.id]);

  const runGenerateChapter = useCallback(
    async (opts?: { regenerateForOutline?: boolean }) => {
      if (!editor) return;
      if (
        subscriptionTier === "free" &&
        chapter.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
      ) {
        setUpgradeOpen(true);
        return;
      }
      const promptInputsSaved = await persistPromptInputsBeforeGeneration();
      if (!promptInputsSaved) {
        return;
      }
      const r = await streamChapterGeneration(
        chapter.id,
        chapter.chapter_number,
        true,
        opts,
      );
      if (r.ok && !r.skipped) {
        if (autoSlopScan) {
          await runPostGenerationSlopScan();
        } else {
          toast.success("Chapter generated.");
        }
        router.refresh();
      }
    },
    [
      autoSlopScan,
      chapter.chapter_number,
      chapter.id,
      editor,
      persistPromptInputsBeforeGeneration,
      router,
      runPostGenerationSlopScan,
      streamChapterGeneration,
      subscriptionTier,
    ],
  );

  useEffect(() => {
    runGenerateChapterRef.current = runGenerateChapter;
  }, [runGenerateChapter]);

  const runGenerateAllChapters = useCallback(async () => {
    const queue = sorted.filter(
      (c) => c.status === "pending" || c.status === "generating",
    );
    if (queue.length === 0) {
      toast.info("All chapters are already generated. Use Regenerate on a chapter to rewrite it.");
      return;
    }
    const queueSize = queue.length;
    const alreadyDone = sorted.length - queueSize;
    const confirmMessage =
      alreadyDone > 0
        ? `Generate the ${queueSize} remaining chapter(s)? Already-written chapters are skipped. This uses one full generation per chapter and may take a while.`
        : `Generate every chapter in order (first → last)? This uses one full generation per chapter and may take a while.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    const promptInputsSaved = await persistPromptInputsBeforeGeneration();
    if (!promptInputsSaved) {
      return;
    }
    setBatchBusy(true);
    const toastId = "generate-all-chapters";
    toast.loading("Starting…", { id: toastId });
    let skippedPro = 0;
    let generated = 0;
    try {
      for (let i = 0; i < queue.length; i++) {
        const c = queue[i];
        if (
          subscriptionTier === "free" &&
          c.chapter_number > FREE_MAX_CHAPTERS_PER_BOOK
        ) {
          skippedPro += 1;
          continue;
        }
        toast.loading(
          `Generating chapter ${c.chapter_number} (${i + 1} of ${queueSize})…`,
          { id: toastId },
        );
        const r = await streamChapterGeneration(
          c.id,
          c.chapter_number,
          c.id === chapter.id,
        );
        if (r.upgrade) {
          setUpgradeOpen(true);
          toast.dismiss(toastId);
          return;
        }
        if (!r.ok) {
          toast.dismiss(toastId);
          return;
        }
        if (!r.skipped) generated += 1;
      }
      toast.dismiss(toastId);
      if (skippedPro > 0) {
        toast.info(
          `Skipped ${skippedPro} chapter(s) — Free plan includes AI for chapters 1–${FREE_MAX_CHAPTERS_PER_BOOK} only. Upgrade to Pro for the rest.`,
        );
      }
      if (generated > 0) {
        toast.success(
          generated === 1
            ? "Generated 1 chapter."
            : `Generated ${generated} chapters.`,
        );
      }
      router.refresh();
    } finally {
      setBatchBusy(false);
    }
  }, [
    chapter.id,
    persistPromptInputsBeforeGeneration,
    router,
    sorted,
    streamChapterGeneration,
    subscriptionTier,
  ]);

  const runAssist = useCallback(
    async (
      action: AssistAction,
      opts?: { tone?: AssistToneOption; prompt?: string },
    ) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;

      const isContinue = action === "continue";
      if (!isContinue && from === to) {
        toast.error("Select some text first.");
        return;
      }

      const selectedText = isContinue
        ? ""
        : editor.state.doc.textBetween(from, to, "\n\n");

      if ((action === "rewrite") && !opts?.prompt?.trim()) {
        toast.error("Tell the AI how to rewrite the selection.");
        return;
      }

      setAiBusy(true);
      try {
        let body: Record<string, unknown>;
        if (action === "tone") {
          body = {
            action: "tone",
            bookId,
            chapterId: chapter.id,
            selectedText,
            tone: opts!.tone!,
            ...(forcedCodexEntryIds.length > 0
              ? { selectedCodexEntryIds: forcedCodexEntryIds }
              : {}),
          };
        } else if (action === "continue") {
          await saveContent();
          body = {
            action: "continue",
            bookId,
            chapterId: chapter.id,
            ...(forcedCodexEntryIds.length > 0
              ? { selectedCodexEntryIds: forcedCodexEntryIds }
              : {}),
          };
        } else {
          body = {
            action,
            bookId,
            chapterId: chapter.id,
            selectedText,
            ...(forcedCodexEntryIds.length > 0
              ? { selectedCodexEntryIds: forcedCodexEntryIds }
              : {}),
            ...(opts?.prompt && opts.prompt.trim()
              ? { prompt: opts.prompt.trim() }
              : {}),
          };
        }

        const res = await fetch("/api/ai/chapter-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as {
          text?: string;
          error?: string;
          code?: string;
        } | null;
        if (res.status === 403 && data?.code === "UPGRADE_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        if (!res.ok || !data?.text) {
          throw new Error(data?.error ?? "Assistant request failed.");
        }

        const replacementHtml = markdownToHtml(data.text);
        if (isContinue) {
          const endPos = editor.state.doc.content.size;
          editor
            .chain()
            .focus()
            .insertContentAt(endPos, `<p></p>${replacementHtml}`)
            .run();
        } else {
          editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, replacementHtml)
            .run();
        }
        setCurrentWords(countWords(editor.getText()));
        void saveContent();

        const successToast: Record<AssistAction, string> = {
          expand: "Section expanded.",
          rewrite: "Section rewritten.",
          shorten: "Section tightened.",
          proofread: "Section proofread.",
          continue: "Continued drafting.",
          tone: "Tone updated.",
        };
        toast.success(successToast[action]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Assistant request failed.");
      } finally {
        setAiBusy(false);
      }
    },
    [bookId, chapter.id, editor, forcedCodexEntryIds, saveContent],
  );

  const runCheckSlop = useCallback(async () => {
    if (!editor) return;
    setSlopScanBusy(true);
    try {
      const text = turndown.turndown(editor.getHTML());
      const res = await fetch("/api/ai/slop-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: chapter.id, text }),
      });
      const data = (await res.json().catch(() => null)) as {
        matches?: unknown[];
        error?: string;
      } | null;
      if (res.status === 429) {
        toast.error("Too many slop checks. Try again in a few minutes.");
        return;
      }
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Slop scan failed.");
      }
      editor
        .chain()
        .setSlopHighlightConfig({ bookType, enabled: true })
        .rescanSlopHighlights()
        .run();
      const n = Array.isArray(data.matches) ? data.matches.length : 0;
      toast.success(
        n === 0
          ? "No banned phrase patterns found in this chapter."
          : `Found ${n} match(es) — underlined in the editor.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Slop scan failed.");
    } finally {
      setSlopScanBusy(false);
    }
  }, [bookId, bookType, chapter.id, editor]);

  const runDeepSlopScanClient = useCallback(async () => {
    if (!editor) return;
    setDeepSlopBusy(true);
    setDeepSlopItems([]);
    try {
      const text = turndown.turndown(editor.getHTML());
      const res = await fetch("/api/ai/slop-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: chapter.id, text, deep: true }),
      });
      const data = (await res.json().catch(() => null)) as {
        deepMatches?: DeepSlopItem[];
        error?: string;
      } | null;
      if (res.status === 429) {
        toast.error("Rate limited. Try again in a few minutes.");
        return;
      }
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Deep slop scan failed.");
      }
      const items = Array.isArray(data.deepMatches) ? data.deepMatches : [];
      setDeepSlopItems(items);
      toast.message(
        items.length === 0
          ? "Deep scan: no issues flagged."
          : `Deep scan: ${items.length} issue(s) — see the panel below.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deep slop scan failed.");
    } finally {
      setDeepSlopBusy(false);
    }
  }, [bookId, chapter.id, editor]);

  const onSlopIgnore = useCallback(() => {
    setSlopPopover(null);
  }, []);

  const onSlopDeleteMatch = useCallback(() => {
    if (!editor || !slopPopover) return;
    const { from, to } = slopPopover;
    setSlopPopover(null);
    editor.chain().focus().deleteRange({ from, to }).run();
    editor.commands.rescanSlopHighlights();
    setCurrentWords(countWords(editor.getText()));
    void saveContent();
  }, [editor, slopPopover, saveContent]);

  const onSlopRewriteParagraph = useCallback(() => {
    if (!editor || !slopPopover) return;
    const matched = slopPopover.matchedText;
    const pos = slopPopover.from;
    setSlopPopover(null);
    const range = textblockRangeAt(editor, pos);
    editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).run();
    void runAssist("rewrite", {
      prompt: `Rewrite this paragraph to convey the same meaning without the phrase: ${matched}. Use action or specific detail instead of stock emotional telegraph.`,
    });
  }, [editor, slopPopover, runAssist]);

  /* --------------------------------------------------------------------- */
  /* Inline AI commands (bubble menu → card-stack panel)                   */
  /* --------------------------------------------------------------------- */

  /**
   * Internal: splits the running stream buffer into alternatives using the
   * shared delimiter. The *last* alternative is always marked `streaming`
   * until the server signals it's done; earlier ones flip to `complete`
   * as soon as their delimiter is observed.
   */
  const parseAlternatives = useCallback(
    (
      buffer: string,
      prevAlternatives: InlineCommandAlternative[],
      done: boolean,
    ): InlineCommandAlternative[] => {
      const parts = buffer
        .split(new RegExp(`\\n?${ALTERNATIVE_DELIMITER}\\n?`))
        .map((p) => p.trim());
      return parts.map((text, idx) => {
        const id = prevAlternatives[idx]?.id ?? `alt-${idx}-${Date.now()}`;
        const isLast = idx === parts.length - 1;
        const status: "streaming" | "complete" =
          isLast && !done ? "streaming" : "complete";
        return { id, text, status };
      });
    },
    [],
  );

  const runInlineCommandStream = useCallback(
    async (request: InlineCommandRequest) => {
      /* Previous stream (if any) belongs to a stale request — e.g. user
       * clicked Regenerate while the first response was still arriving.
       * Abort it so we don't leak a fetch and don't get interleaved
       * alternatives. */
      inlineCommandAbortRef.current?.abort();
      const controller = new AbortController();
      inlineCommandAbortRef.current = controller;

      setInlineCommandPanel({
        status: "running",
        request,
        alternatives: [],
      });

      try {
        const res = await fetch("/api/ai/inline-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterId: chapter.id,
            command: request.command,
            selection: request.selection,
            precedingContext: request.precedingContext,
            followingContext: request.followingContext,
            customInstruction:
              request.command === "custom"
                ? request.customInstruction
                : undefined,
            alternativeCount: 3,
          }),
          signal: controller.signal,
        });

        if (res.status === 403) {
          const data = (await res.json().catch(() => null)) as {
            code?: string;
            error?: string;
          } | null;
          if (data?.code === "UPGRADE_REQUIRED") {
            setUpgradeOpen(true);
            setInlineCommandPanel(null);
            return;
          }
          throw new Error(data?.error ?? "You do not have access to this chapter.");
        }

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "The assistant could not start streaming.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          setInlineCommandPanel((prev) => {
            if (!prev || prev.request !== request) return prev;
            return {
              ...prev,
              status: "running",
              alternatives: parseAlternatives(buffer, prev.alternatives, false),
            };
          });
        }
        buffer += decoder.decode();

        setInlineCommandPanel((prev) => {
          if (!prev || prev.request !== request) return prev;
          const finalAlts = parseAlternatives(buffer, prev.alternatives, true)
            .filter((a) => a.text.length > 0);
          if (finalAlts.length === 0) {
            return {
              ...prev,
              status: "error",
              errorMessage: "The assistant returned no alternatives.",
              alternatives: [],
            };
          }
          return {
            ...prev,
            status: "complete",
            alternatives: finalAlts,
          };
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          /* User closed the panel or hit Regenerate — don't surface a
           * toast or flip the panel into error state; the subsequent
           * setInlineCommandPanel(null) / new-stream call owns the UI. */
          return;
        }
        const message = userFacingFetchError(err, "Inline command").message;
        setInlineCommandPanel((prev) => {
          if (!prev || prev.request !== request) return prev;
          return {
            ...prev,
            status: "error",
            errorMessage: message,
          };
        });
      } finally {
        if (inlineCommandAbortRef.current === controller) {
          inlineCommandAbortRef.current = null;
        }
      }
    },
    [chapter.id, parseAlternatives],
  );

  const openInlineCommand = useCallback(
    (command: InlineCommandId) => {
      if (!editor) return;
      const ctx = getInlineSelectionContext(editor);
      if (!ctx) {
        toast.error("Select some text first.");
        return;
      }
      if (ctx.selectionWordCount > INLINE_COMMAND_MAX_SELECTION_WORDS) {
        toast.error("Selection too long. Try a smaller passage.");
        return;
      }

      const request: InlineCommandRequest = {
        command,
        from: ctx.from,
        to: ctx.to,
        selection: ctx.selection,
        precedingContext: ctx.precedingContext,
        followingContext: ctx.followingContext,
      };

      if (command === "custom") {
        /* Custom opens in draft mode so the user can type their instruction
         * before the first generation runs. `runInlineCommandStream` is
         * invoked from the panel's Generate button via `onRunCustom`. */
        setInlineCommandPanel({
          status: "draft",
          request: { ...request, customInstruction: "" },
          alternatives: [],
        });
        return;
      }

      void runInlineCommandStream(request);
    },
    [editor, runInlineCommandStream],
  );

  const closeInlineCommandPanel = useCallback(() => {
    inlineCommandAbortRef.current?.abort();
    inlineCommandAbortRef.current = null;
    setInlineCommandPanel(null);
  }, []);

  const regenerateInlineCommand = useCallback(() => {
    setInlineCommandPanel((prev) => {
      if (!prev) return prev;
      void runInlineCommandStream(prev.request);
      return prev;
    });
  }, [runInlineCommandStream]);

  const runCustomInlineCommand = useCallback(() => {
    setInlineCommandPanel((prev) => {
      if (!prev) return prev;
      const trimmed = prev.request.customInstruction?.trim() ?? "";
      if (!trimmed) return prev;
      void runInlineCommandStream({
        ...prev.request,
        customInstruction: trimmed,
      });
      return prev;
    });
  }, [runInlineCommandStream]);

  const updateInlineCustomInstruction = useCallback((value: string) => {
    setInlineCommandPanel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        request: { ...prev.request, customInstruction: value },
      };
    });
  }, []);

  const insertInlineAlternative = useCallback(
    (alt: InlineCommandAlternative) => {
      if (!editor) return;
      setInlineCommandPanel((prev) => {
        if (!prev) return prev;
        const { from, to } = prev.request;
        const docSize = editor.state.doc.content.size;
        /* Clamp to doc bounds — the document may have grown/shrunk while
         * the user was reading alternatives; a stale from/to would throw. */
        const safeFrom = Math.min(from, docSize);
        const safeTo = Math.min(to, docSize);

        const replacementHtml = markdownToHtml(alt.text);
        editor
          .chain()
          .focus()
          .deleteRange({ from: safeFrom, to: safeTo })
          .insertContentAt(safeFrom, replacementHtml)
          .run();
        setCurrentWords(countWords(editor.getText()));
        void saveContent();
        toast.success(`${INLINE_COMMANDS[prev.request.command].label} applied.`);
        return null;
      });
    },
    [editor, saveContent],
  );

  const appendInlineAlternativeBelow = useCallback(
    (alt: InlineCommandAlternative) => {
      if (!editor) return;
      setInlineCommandPanel((prev) => {
        if (!prev) return prev;
        const docSize = editor.state.doc.content.size;
        const safeTo = Math.min(prev.request.to, docSize);

        const replacementHtml = markdownToHtml(alt.text);
        editor
          .chain()
          .focus()
          .insertContentAt(safeTo, `<p></p>${replacementHtml}`)
          .run();
        setCurrentWords(countWords(editor.getText()));
        void saveContent();
        toast.success("Added below the selection.");
        return null;
      });
    },
    [editor, saveContent],
  );

  /* Abort any in-flight stream on unmount. */
  useEffect(() => {
    return () => {
      inlineCommandAbortRef.current?.abort();
      inlineCommandAbortRef.current = null;
    };
  }, []);

  /**
   * Handles a slash-command selection from the TipTap Suggestion menu.
   *
   * Flow:
   *  1. Resolve the "target range" — the current selection if non-empty,
   *     otherwise the paragraph node surrounding the cursor.
   *  2. Capture the existing text so we can restore on failure.
   *  3. Insert an italic `✨ thinking…` placeholder in place of the range.
   *  4. Call `/api/ai/inline-assist`. While we wait, the editor remains
   *     editable — but replacement math finds the placeholder by textual
   *     search to survive the user typing elsewhere.
   *  5. On success: replace the placeholder with the markdown-rendered
   *     response. On failure: restore the original text (or leave the
   *     range empty if it was empty to begin with) and toast the error.
   *
   * The `cursorPos` param is the post-deletion cursor from the extension
   * (i.e. right where `/rewrite` used to be) — used as a hint for
   * beat/describe-style "insert new content" cases but not authoritative
   * since ProseMirror may have normalised positions since then.
   */
  const runSlashCommand = useCallback(
    async ({ editor: ed, item }: SlashCommandInvocation) => {
      if (!ed) return;
      /* Dismiss the hint the moment the user actually uses the palette. */
      setSlashHintVisible(false);

      /* SceneBeat inserts (`/beat`, `/continue`) are not AI calls — they
       * simply drop a SceneBeat TipTap node at the cursor. The node's
       * React view owns the Generate flow once mounted. */
      if (item.kind === "scene-beat") {
        ed.chain()
          .focus()
          .insertSceneBeat({ beatText: item.defaultBeatText ?? "" })
          .run();
        void saveContent();
        return;
      }

      const selection = ed.state.selection;
      let from: number;
      let to: number;

      if (selection.from !== selection.to) {
        from = selection.from;
        to = selection.to;
      } else {
        /* Expand to the whole paragraph node containing the cursor. */
        const $pos = ed.state.doc.resolve(selection.from);
        const depth = $pos.depth;
        const start = $pos.start(depth);
        const end = $pos.end(depth);
        from = start;
        to = end;
      }

      const originalText = ed.state.doc.textBetween(from, to, "\n\n");

      /* Sample surrounding chapter text for voice continuity. `textBetween`
       * with a "\n\n" block separator gives us something close to the
       * plaintext rendering of the chapter — enough for gpt-4o-mini to
       * stay inside the author's voice. */
      const prefix = ed.state.doc.textBetween(0, from, "\n\n");
      const suffix = ed.state.doc.textBetween(to, ed.state.doc.content.size, "\n\n");
      const contextBefore = prefix.slice(-SLASH_CONTEXT_BEFORE_CHARS);
      const contextAfter = suffix.slice(0, SLASH_CONTEXT_AFTER_CHARS);

      /* Insert the placeholder. Use insertContentAt with an italic mark so
       * it's visually distinct from real prose. Keep the mark on a single
       * line so the "find this placeholder in the doc later" search is
       * straightforward. */
      const placeholderHtml = `<em data-inline-assist-placeholder="1">${SLASH_INLINE_PLACEHOLDER_TEXT}</em>`;
      ed.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, placeholderHtml)
        .run();

      setAiBusy(true);
      try {
        const res = await fetch("/api/ai/inline-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: item.action,
            bookId,
            chapterId: chapter.id,
            selectedText: originalText,
            contextBefore: contextBefore || undefined,
            contextAfter: contextAfter || undefined,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          text?: string;
          error?: string;
          code?: string;
        } | null;

        if (res.status === 403 && data?.code === "UPGRADE_REQUIRED") {
          /* Remove placeholder + restore original before opening the
           * upgrade modal so the doc isn't polluted with "✨ thinking…". */
          replaceInlinePlaceholder(ed, originalText);
          setUpgradeOpen(true);
          return;
        }

        if (!res.ok || !data?.text) {
          throw new Error(data?.error ?? "Assistant request failed.");
        }

        const replacementHtml = markdownToHtml(data.text);
        const placed = replaceInlinePlaceholder(ed, replacementHtml, {
          asHtml: true,
        });
        if (!placed) {
          /* The placeholder was manually edited away — fall back to just
           * inserting at the current cursor so the user isn't stuck. */
          ed.chain().focus().insertContent(replacementHtml).run();
        }

        setCurrentWords(countWords(ed.getText()));
        void saveContent();

        const successToast: Record<
          Extract<SlashCommandInvocation["item"], { kind: "inline-assist" }>["action"],
          string
        > = {
          rewrite: "Paragraph rewritten.",
          expand: "Paragraph expanded.",
          beat: "Beat added.",
          describe: "Description added.",
          dialogue: "Converted to dialogue.",
          summary: "Summarised.",
        };
        toast.success(successToast[item.action]);
      } catch (e) {
        replaceInlinePlaceholder(ed, originalText);
        toast.error(e instanceof Error ? e.message : "Assistant request failed.");
      } finally {
        setAiBusy(false);
      }
    },
    [bookId, chapter.id, saveContent],
  );

  useEffect(() => {
    slashCommandHandlerRef.current = (inv) => {
      void runSlashCommand(inv);
    };
  }, [runSlashCommand]);

  const openLinkPopover = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const href = ed.getAttributes("link")?.href;
    setLinkInitial(typeof href === "string" && href ? href : null);
    setLinkOpen(true);
  }, []);

  const applyLink = useCallback(
    (href: string) => {
      const ed = editorRef.current;
      if (!ed) return;
      const { from, to } = ed.state.selection;
      if (from === to) {
        ed.chain()
          .focus()
          .insertContent(`<a href="${href}">${href}</a>`)
          .run();
      } else {
        ed.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
      setLinkOpen(false);
      void saveContent();
    },
    [saveContent],
  );

  const removeLink = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    void saveContent();
  }, [saveContent]);

  const toolbarDisabled =
    isGenerating || aiBusy || localStatus === "generating" || batchBusy;

  const readingMinutes = estimateReadingMinutes(currentWords);

  const onToggleZen = () => {
    setZenMode((v) => {
      const next = !v;
      writePref(ZEN_STORAGE_KEY, next);
      return next;
    });
  };
  const onToggleFocus = useCallback(() => {
    setFocusMode((v) => {
      const next = !v;
      writePref(focusStorageKey, next);
      return next;
    });
  }, [focusStorageKey]);

  const isPro = subscriptionTier === "pro";
  const isFictionBook = (bookType ?? "fiction") === "fiction";
  const chapterReadyForConsistency =
    localStatus === "draft" || localStatus === "edited" || localStatus === "approved";

  const runConsistencyCheck = useCallback(async () => {
    setConsistencyOpen(true);
    setConsistencyLoading(true);
    setConsistencyError(null);
    setConsistencyErrorCode(null);
    setConsistencyResult(null);
    try {
      const res = await fetch("/api/ai/check-consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: chapter.id }),
      });
      const data = (await res.json().catch(() => null)) as
        | ConsistencyCheckResult
        | { error?: string; code?: string }
        | null;
      if (!res.ok) {
        const errBody = data as { error?: string; code?: string };
        setConsistencyError(
          errBody?.error && typeof errBody.error === "string"
            ? errBody.error
            : "Could not run consistency check.",
        );
        setConsistencyErrorCode(
          errBody?.code && typeof errBody.code === "string" ? errBody.code : null,
        );
        if (res.status === 403 && errBody?.code === ApiErrorCode.UPGRADE_REQUIRED) {
          setUpgradeOpen(true);
        }
        return;
      }
      if (
        data &&
        typeof data === "object" &&
        "issues" in data &&
        "summary" in data &&
        Array.isArray((data as ConsistencyCheckResult).issues)
      ) {
        setConsistencyResult(data as ConsistencyCheckResult);
        return;
      }
      setConsistencyError("Invalid response from server.");
    } catch {
      setConsistencyError("Network error. Try again.");
    } finally {
      setConsistencyLoading(false);
    }
  }, [bookId, chapter.id]);

  const runTransitionRewrites = useCallback(
    async (chapterIds: string[]) => {
      if (chapterIds.length === 0) return;
      setTransitionModalOpen(true);
      setTransitionBusy(true);
      setTransitionResults(null);
      setTransitionSummary(null);
      setTransitionRequestError(null);
      try {
        const res = await fetch("/api/ai/rewrite-transitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId, chapterIds }),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              results?: TransitionRewriteResultRow[];
              summary?: { updated: number; total: number };
              error?: string;
              code?: string;
            }
          | null;
        if (!res.ok) {
          setTransitionRequestError(
            data?.error && typeof data.error === "string" ? data.error : "Request failed",
          );
          if (res.status === 403 && data?.code === ApiErrorCode.UPGRADE_REQUIRED) {
            setUpgradeOpen(true);
          }
          return;
        }
        if (data?.results && data?.summary) {
          setTransitionResults(data.results);
          setTransitionSummary(data.summary);
        }
        router.refresh();
      } catch {
        setTransitionRequestError("Network error");
      } finally {
        setTransitionBusy(false);
      }
    },
    [bookId, router],
  );

  const handleChaptersReordered = useCallback(
    async (orderedIds: string[], _detail: { activeId: string; newIndex: number }) => {
      setChapters((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        return orderedIds.map((id, i) => {
          const row = byId.get(id);
          if (!row) {
            return prev[0]!;
          }
          return { ...row, chapter_number: i + 1 };
        });
      });
      const res = await reorderChaptersAction(bookId, orderedIds);
      if (!res.ok) {
        toast.error(res.error);
        setChapters(initialChapters);
        router.refresh();
        return;
      }
      setChapters(res.chapters);
      const affected = res.affectedChapterIds;
      lastTransitionTargetIdsRef.current = affected;
      const n = affected.length;
      if (n > 0) {
        toast.message(
          `Chapters reordered. ${n} transition${n === 1 ? "" : "s"} may need a rewrite.`,
          {
            action: {
              label: "Rewrite transitions",
              onClick: () => {
                void runTransitionRewrites(lastTransitionTargetIdsRef.current);
              },
            },
          },
        );
      } else {
        toast.success("Chapters reordered.");
      }
    },
    [bookId, initialChapters, router, runTransitionRewrites],
  );

  const onToggleTypewriter = () => {
    setTypewriterMode((v) => {
      const next = !v;
      writePref(typewriterStorageKey, next);
      return next;
    });
  };
  const onToggleSpellcheck = () => {
    setSpellcheckOn((v) => {
      const next = !v;
      writePref(SPELLCHECK_STORAGE_KEY, next);
      return next;
    });
  };

  const hasChapterText = useMemo(() => {
    if (pendingMdRef.current.trim().length > 0) return true;
    if (lastRenderedMdRef.current.trim().length > 0) return true;
    const ed = editorRef.current;
    if (ed && ed.getText().trim().length > 0) return true;
    return (chapter.content ?? "").trim().length > 0;
  }, [chapter.content, currentWords]);

  const showPendingState = localStatus === "pending" && !isGenerating && !hasChapterText;

  const showToolbarAbovePending = !focusMode && showPendingState;

  const editorToolbar = (
    <EditorToolbar
      editor={editor}
      toolbarDisabled={toolbarDisabled}
      aiBusy={aiBusy}
      findOpen={findOpen}
      spellcheckOn={spellcheckOn}
      zenMode={zenMode}
      focusMode={focusMode}
      isMacPlatform={isMacPlatform}
      typewriterMode={typewriterMode}
      expandPromptOpen={assistPanel?.action === "expand"}
      rewritePromptOpen={assistPanel?.action === "rewrite"}
      versionHistoryHref={`/projects/${bookId}/chapters/${chapter.id}/revisions`}
      onRegenerate={() => {
        if (
          !confirm(
            "Regenerate this chapter from scratch? Unsaved edits will be lost.",
          )
        )
          return;
        void runGenerateChapter();
      }}
      onOpenExpand={() =>
        setAssistPanel((p) =>
          p?.action === "expand" ? null : { action: "expand", prompt: "" },
        )
      }
      onOpenRewrite={() =>
        setAssistPanel((p) =>
          p?.action === "rewrite" ? null : { action: "rewrite", prompt: "" },
        )
      }
      onShorten={() => void runAssist("shorten")}
      onProofread={() => void runAssist("proofread")}
      onCheckSlop={() => void runCheckSlop()}
      onDeepSlopScan={() => void runDeepSlopScanClient()}
      slopScanBusy={slopScanBusy}
      deepSlopBusy={deepSlopBusy}
      onContinue={() => void runAssist("continue")}
      onTone={(tone) => void runAssist("tone", { tone })}
      onToggleFind={() => {
        setFindOpen((v) => {
          const next = !v;
          if (next) setTimeout(() => findInputRef.current?.focus(), 0);
          return next;
        });
      }}
      onToggleSpellcheck={onToggleSpellcheck}
      onToggleZen={onToggleZen}
      onToggleFocus={onToggleFocus}
      onToggleTypewriter={onToggleTypewriter}
      onShowCheatsheet={() => setCheatsheetOpen(true)}
      onOpenLink={openLinkPopover}
      bookTypeFiction={isFictionBook}
      isPro={isPro}
      onOpenVoiceMemo={() => {
        if (!isPro) {
          setUpgradeOpen(true);
          return;
        }
        setVoiceMemoOpen(true);
      }}
      chapterReadyForConsistency={chapterReadyForConsistency}
      consistencyLoading={consistencyLoading}
      onCheckConsistency={runConsistencyCheck}
      chatOpen={chatOpen}
      onToggleChat={() => setChatOpen((v) => !v)}
      generationRunning={isGenerating || localStatus === "generating"}
      onStopGeneration={stopChapterGeneration}
      codexEntryOptions={codexToolbarOptions}
      forcedCodexEntryIds={forcedCodexEntryIds}
      onToggleForcedCodexEntry={toggleForcedCodexEntry}
      onClearForcedCodexEntries={() => setForcedCodexEntryIds([])}
    />
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-editorial-bg",
        zenMode && "zen-mode",
        focusMode && "chapterai-focus-active",
      )}
    >
      {allChaptersPending && !zenMode && !focusMode ? (
        <div className="border-b border-gold/20 bg-gold/5 px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Chapters</p>
              <p className="mt-1 font-serif text-lg text-editorial-cream">
                Every chapter is still pending
              </p>
              <p className="mt-1 text-sm text-editorial-muted">
                Pick a chapter in the sidebar, then use{" "}
                <strong className="text-editorial-cream">Generate</strong> to draft with AI—or
                write from scratch. Chapters are ready for export as soon as they have content;
                tweak anytime.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {zenMode || focusMode ? null : (
        <ChapterMiniRail
          chapters={sorted}
          activeChapterId={chapter.id}
          bookId={bookId}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <ProUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Upgrade to Pro for unlimited chapters"
          description={`The Free plan includes AI generation for the first ${FREE_MAX_CHAPTERS_PER_BOOK} chapters. Upgrade to Pro to generate chapter ${chapter.chapter_number} and beyond.`}
        />

        <ConsistencyPanel
          open={consistencyOpen}
          onClose={() => setConsistencyOpen(false)}
          editor={editor}
          loading={consistencyLoading}
          result={consistencyResult}
          error={consistencyError}
          errorCode={consistencyErrorCode}
        />

        <TransitionRewriteModal
          open={transitionModalOpen}
          onClose={() => setTransitionModalOpen(false)}
          busy={transitionBusy}
          results={transitionResults}
          summary={transitionSummary}
          bookId={bookId}
          requestError={transitionRequestError}
        />

        <ShortcutCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />

        <LinkPopover
          open={linkOpen}
          initialHref={linkInitial}
          onClose={() => setLinkOpen(false)}
          onApply={applyLink}
          onUnlink={removeLink}
        />

        {zenMode || focusMode ? null : (
          <ChapterSidebar
            bookId={bookId}
            bookTitle={localBookTitle}
            bookSubtitle={localBookSubtitle}
            chapterId={chapter.id}
            sortedChapters={sorted}
            totalWords={totalWords}
            batchBusy={batchBusy}
            isGenerating={isGenerating}
            aiBusy={aiBusy}
            remainingCount={remainingChapters.length}
            bulkGenerateLabel={bulkGenerateLabel}
            onBookTitleChange={setLocalBookTitle}
            onBookTitleCommit={() => void saveBookTitle()}
            onBookSubtitleChange={setLocalBookSubtitle}
            onBookSubtitleCommit={() => void saveBookSubtitle()}
            onRenameChapter={renameChapter}
            onGenerateAll={() => void runGenerateAllChapters()}
            reorderEnabled={isPro}
            onChaptersReordered={handleChaptersReordered}
          />
        )}

        <main
          ref={mainRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <div
            className={cn(
              "border-b border-border/60 px-6 py-4",
              focusMode && "border-transparent",
            )}
          >
            <div
              className={cn(
                "flex flex-wrap items-start gap-3",
                focusMode && "mx-auto w-full max-w-[720px]",
              )}
            >
              <input
                className="min-w-0 flex-1 border-none bg-transparent font-serif text-2xl font-medium text-editorial-cream outline-none ring-0 placeholder:text-editorial-muted focus:ring-0 md:text-3xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void saveTitle()}
                disabled={isGenerating || aiBusy}
              />
              {focusMode ? null : (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                    statusBadgeClass(localStatus),
                  )}
                >
                  {localStatus}
                </span>
              )}
              {focusMode ? null : (
                <SaveIndicator
                  state={saveState}
                  lastSavedAt={lastSavedAt}
                  onRetry={() => void saveContent()}
                  flashKey={saveFlashKey}
                />
              )}
            </div>
            {focusMode ? null : (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <WordTarget
                  target={targetWordCount}
                  currentWords={currentWords}
                  disabled={isGenerating || batchBusy}
                  onSave={(next) => void saveTargetWordCount(next)}
                />
              </div>
            )}
          </div>

          {focusMode || !showStuckRecover ? null : (
            <div className="border-b border-amber-500/35 bg-amber-500/10 px-6 py-2.5 text-sm text-editorial-cream">
              <span>
                This chapter is still marked as generating, but there is no active stream.{" "}
              </span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-amber-200 underline decoration-amber-200/50"
                disabled={recoverBusy}
                onClick={() => void recoverStuckChapter()}
              >
                {recoverBusy ? "Resetting…" : "Reset to pending"}
              </Button>
            </div>
          )}

          {zenMode || focusMode ? null : (
            <OutlinePanel
              outlineSummary={outlineSummary}
              onOutlineChange={setOutlineSummary}
              onOutlineBlur={() => void saveOutlineSummary()}
              authorNotes={authorNotes}
              onAuthorNotesChange={setAuthorNotes}
              onAuthorNotesBlur={() => void saveAuthorNotes()}
              expandOpen={expandOutlineOpen}
              expandPrompt={expandOutlinePrompt}
              expandBusy={expandOutlineBusy}
              onToggleExpand={() => {
                setExpandOutlineOpen((v) => !v);
                if (expandOutlineOpen) setExpandOutlinePrompt("");
              }}
              onExpandPromptChange={setExpandOutlinePrompt}
              onExpand={() => void runExpandOutline()}
              disabled={isGenerating || aiBusy || batchBusy}
            />
          )}

          {showToolbarAbovePending ? (
            <div className="shrink-0 border-b border-border/40 bg-editorial-bg/95 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-editorial-bg/90">
              {editorToolbar}
            </div>
          ) : null}

          {findOpen ? (
            <FindReplacePanel
              ref={findInputRef}
              findQuery={findQuery}
              replaceQuery={replaceQuery}
              caseSensitive={caseSensitive}
              matchCount={matches.length}
              matchIndex={matchIndex}
              disabled={toolbarDisabled}
              onFindChange={setFindQuery}
              onReplaceChange={setReplaceQuery}
              onCaseSensitiveChange={setCaseSensitive}
              onFindNext={findNext}
              onFindPrev={findPrev}
              onReplace={replaceCurrent}
              onReplaceAll={replaceAll}
              onClose={() => setFindOpen(false)}
            />
          ) : null}

          <SearchReplacePanel
            bookId={bookId}
            currentChapterId={chapter.id}
            open={bookSearchOpen}
            onOpenChange={setBookSearchOpen}
            isPro={isPro}
            editor={editor}
            onApplyReplaceInCurrentChapter={onApplyBookReplaceInCurrent}
            onOpenInChapterFind={onOpenInChapterFind}
          />

          <VoiceMemoModal
            open={voiceMemoOpen}
            onOpenChange={setVoiceMemoOpen}
            onBeforeTranscribe={async () => saveContent()}
            onTranscribe={streamVoiceToChapter}
            isBusy={isGenerating}
          />

          <ChatPanel
            bookId={bookId}
            chapterId={chapter.id}
            chapterTitle={chapter.title}
            chapterNumber={chapter.chapter_number}
            open={chatOpen}
            onOpenChange={setChatOpen}
          />

          {assistPanel ? (
            <AssistPromptPanel
              action={assistPanel.action}
              prompt={assistPanel.prompt}
              onPromptChange={(prompt) =>
                setAssistPanel((p) => (p ? { ...p, prompt } : p))
              }
              busy={aiBusy}
              disabled={toolbarDisabled}
              onSubmit={() => {
                const action = assistPanel.action;
                const promptText = assistPanel.prompt.trim();
                void runAssist(action, promptText ? { prompt: promptText } : undefined);
              }}
              onClose={() => setAssistPanel(null)}
              onClear={() => setAssistPanel((p) => (p ? { ...p, prompt: "" } : p))}
            />
          ) : null}

          {inlineCommandPanel ? (
            <InlineCommandPanel
              state={inlineCommandPanel}
              onCustomInstructionChange={updateInlineCustomInstruction}
              onRunCustom={runCustomInlineCommand}
              onRegenerate={regenerateInlineCommand}
              onInsert={insertInlineAlternative}
              onAppendBelow={appendInlineAlternativeBelow}
              onClose={closeInlineCommandPanel}
            />
          ) : null}

          <CodexHoverCard
            entry={codexHoveredEntry}
            anchorRect={codexHoveredRect}
            bookId={bookId}
            onEnter={onCodexCardEnter}
            onLeave={onCodexCardLeave}
            seriesName={codexSeriesName}
          />

          <SlopHoverCard
            state={slopPopover}
            onClose={onSlopIgnore}
            onIgnore={onSlopIgnore}
            onDeleteMatch={onSlopDeleteMatch}
            onRewriteParagraph={onSlopRewriteParagraph}
            busy={aiBusy}
          />

          <SlopDeepPanel items={deepSlopItems} onClose={() => setDeepSlopItems([])} />

          <div className="relative flex flex-1 flex-col overflow-hidden">
            {showPendingState ? (
              <PendingState
                title={chapter.title}
                batchBusy={batchBusy}
                remainingCount={remainingChapters.length}
                bulkGenerateLabel={bulkGenerateLabel}
                onGenerateOne={() => void runGenerateChapter()}
                onGenerateAll={() => void runGenerateAllChapters()}
              />
            ) : (
              <>
                {isInSeries ? (
                  <div className="px-4 pt-3 sm:px-6">
                    <ContinuityWarningsPanel
                      bookId={bookId}
                      chapterId={chapter.id}
                      isInSeries={isInSeries}
                      enabled={continuityChecksEnabled}
                      warnings={initialContinuityWarnings}
                      editor={editor}
                    />
                  </div>
                ) : null}
                <div
                  ref={editorScrollRef}
                  className={cn(
                    "flex-1 overflow-y-auto bg-editorial-bg/80",
                    isGenerating && "pointer-events-none opacity-80",
                    zenMode && "flex justify-center",
                    focusMode && "py-16",
                    typewriterMode && "scroll-smooth",
                    typewriterMode &&
                      !isGenerating &&
                      "chapterai-typewriter-canvas",
                  )}
                >
                  {!showToolbarAbovePending && !focusMode ? (
                    <div className="sticky top-0 z-30 border-b border-border/40 bg-editorial-bg/95 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-editorial-bg/90">
                      {editorToolbar}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      zenMode && "w-full max-w-2xl",
                      focusMode && "chapterai-focus-canvas w-full",
                    )}
                  >
                    {editor ? <EditorContent editor={editor} /> : null}
                    <EditorBubbleMenu
                      editor={editor}
                      aiBusy={aiBusy}
                      disabled={toolbarDisabled}
                      onProofread={() => void runAssist("proofread")}
                      onTone={(tone) => void runAssist("tone", { tone })}
                      onOpenLink={openLinkPopover}
                      onInlineCommand={openInlineCommand}
                      inlineCommandBusy={inlineCommandPanel?.status === "running"}
                    />
                  </div>
                </div>
                {isGenerating ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-editorial-bg/40">
                    <p className="flex items-center gap-2 rounded-lg border border-border bg-card/90 px-4 py-2 text-sm text-editorial-cream shadow-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-gold" aria-hidden />
                      Writing your chapter…
                    </p>
                  </div>
                ) : null}
              </>
            )}
            {slashHintVisible && localStatus !== "pending" ? (
              <div className="pointer-events-auto absolute bottom-3 left-6 flex items-center gap-2 rounded-full border border-gold/30 bg-editorial-bg/95 px-3 py-1.5 text-xs text-editorial-cream shadow-lg backdrop-blur-sm">
                <span className="text-gold" aria-hidden>
                  ✨
                </span>
                <span>
                  Press{" "}
                  <kbd className="rounded border border-border/60 bg-card/60 px-1 font-mono">
                    /
                  </kbd>{" "}
                  for AI commands
                </span>
                <button
                  type="button"
                  className="ml-1 rounded p-0.5 text-editorial-muted transition-colors hover:text-editorial-cream"
                  onClick={() => setSlashHintVisible(false)}
                  aria-label="Dismiss slash command hint"
                >
                  ×
                </button>
              </div>
            ) : null}
            {focusMode ? (
              <div
                /* Bottom-right minimal overlay. `pointer-events-none` on the
                 * outer wrapper so hovering it doesn't steal focus from the
                 * editor; the inner chip has pointer-events-auto only for the
                 * Esc button. Opacity is driven by `focusOverlayVisible` +
                 * a 500ms tween so the appear/disappear feels unhurried. */
                className="pointer-events-none absolute bottom-6 right-8 z-20 transition-opacity duration-500"
                style={{ opacity: focusOverlayVisible ? 1 : 0 }}
                aria-hidden={!focusOverlayVisible}
              >
                <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/60 bg-editorial-bg/90 px-4 py-2 text-xs text-editorial-muted shadow-lg backdrop-blur-sm">
                  <span className="font-medium text-editorial-cream">
                    {currentWords.toLocaleString()}
                  </span>
                  <span aria-hidden>words</span>
                  {targetWordCount && targetWordCount > 0 ? (
                    <>
                      <span className="text-editorial-muted/50" aria-hidden>
                        /
                      </span>
                      <span>
                        {targetWordCount.toLocaleString()} target
                      </span>
                    </>
                  ) : null}
                  <span className="text-editorial-muted/40" aria-hidden>
                    ·
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-card/60 px-1 font-mono text-[10px]">
                      Esc
                    </kbd>
                    <span>to exit focus</span>
                  </span>
                  <button
                    type="button"
                    onClick={onToggleFocus}
                    aria-label="Exit focus mode"
                    className="ml-1 rounded p-0.5 text-editorial-muted transition-colors hover:text-editorial-cream"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute bottom-3 right-6 flex items-center gap-3 text-xs text-editorial-muted">
                <span>{currentWords.toLocaleString()} words</span>
                <span className="text-editorial-muted/60">·</span>
                <span>{readingMinutes} min read</span>
              </div>
            )}
          </div>

          {zenMode || focusMode ? null : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card/30 px-4 py-3">
              {prevChapter && !isGenerating ? (
                <Button type="button" variant="outline" asChild>
                  <NextLink
                    href={`/projects/${bookId}/chapters/${prevChapter.id}`}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous chapter
                  </NextLink>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled>
                  <span className="flex items-center gap-1">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous chapter
                  </span>
                </Button>
              )}
              {nextChapter && !isGenerating ? (
                <Button type="button" variant="outline" asChild>
                  <NextLink
                    href={`/projects/${bookId}/chapters/${nextChapter.id}`}
                    className="gap-1"
                  >
                    Next chapter
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </NextLink>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled>
                  <span className="flex items-center gap-1">
                    Next chapter
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

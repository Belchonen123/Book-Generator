/**
 * React node view for the SceneBeat TipTap node (Prompt 9).
 *
 * UX contract
 * -----------
 * status='draft'
 *   — Textarea for the beat, bracket directives rendered in a muted
 *     accent colour via an overlay (the textarea itself is still plain
 *     text; the coloured span is a DIV layer underneath with identical
 *     wrapping, pointer-events disabled). Toolbar shows:
 *       [Generate] [Length: Short/Medium/Long ▾] [Delete beat]
 *     Cmd/Ctrl+Enter inside the textarea triggers Generate.
 *
 * status='generating'
 *   — Textarea is locked (read-only). Prose streams into the panel
 *     below with a pulsing border. Toolbar shows only [Cancel].
 *
 * status='generated' (not collapsed)
 *   — Beat text is shown in an italic chip at the top (click to
 *     expand/collapse the beat editor). Prose is rendered as real
 *     paragraphs below. Toolbar shows:
 *       [Keep & collapse] [Regenerate] [Length ▾] [Discard prose] [Delete]
 *
 * status='generated' (collapsed=true)
 *   — Only the beat chip + prose is visible; the beat textarea is
 *     hidden. Clicking the chip expands the beat editor again.
 *
 * status='error'
 *   — Inline error message with [Retry] and [Delete] buttons.
 *
 * Streaming is done via `fetch` + a `ReadableStream` reader — identical
 * pattern to `runInlineCommandStream` in ChapterEditor.tsx. The AbortController
 * is stored in a ref so a second Generate click or an unmount cancels
 * the first request cleanly.
 */
"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "@/lib/lucide-icons";
import {
  parseSceneBeatSegments,
  countSceneBeatDirectives,
} from "@/lib/editor/scene-beat-brackets";
import {
  SCENE_BEAT_LENGTH_WORDS,
  SCENE_BEAT_LENGTHS,
  type SceneBeatLength,
} from "@/lib/utils/schemas";
import { cn } from "@/lib/utils/cn";

import type { SceneBeatOptions, SceneBeatStatus } from "./scene-beat";

/** Client-side hard cap matches the API schema (8k). */
const MAX_BEAT_CHARS = 8_000;

const LENGTH_LABELS: Record<SceneBeatLength, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

function lengthSummary(v: SceneBeatLength): string {
  return `${LENGTH_LABELS[v]} · ~${SCENE_BEAT_LENGTH_WORDS[v]} words`;
}

/** `"Continue the scene."` used by the `/continue` slash variant. */
export const CONTINUE_SCENE_DEFAULT_TEXT = "Continue the scene.";

/** Turn streamed prose (plain text with blank-line separated paragraphs)
 * into an array of paragraphs. Handles both CRLF and LF, and strips
 * empty trailing paragraphs. */
function prosePararaphs(prose: string): string[] {
  return prose
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function SceneBeatNodeView(props: NodeViewProps) {
  const { node, updateAttributes, editor, deleteNode, getPos, extension } = props;

  const beatText = typeof node.attrs.beatText === "string" ? node.attrs.beatText : "";
  const status = node.attrs.status as SceneBeatStatus;
  const lengthHint = node.attrs.lengthHint as SceneBeatLength;
  const generatedProse = node.attrs.generatedProse as string | null;
  const collapsed = Boolean(node.attrs.collapsed);

  const [beatDraft, setBeatDraft] = useState(beatText);
  const [streamingProse, setStreamingProse] = useState<string | null>(null);
  const [lengthMenuOpen, setLengthMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Sync external attr changes back into the draft (e.g. the beat was
   * cleared by "Discard prose, keep beat"). We deliberately do NOT sync
   * on every keystroke — the textarea owns its state while the user is
   * typing and commits to the node on blur / generate. */
  useEffect(() => {
    setBeatDraft(beatText);
  }, [beatText]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lengthMenuRef = useRef<HTMLDivElement | null>(null);

  /* Auto-grow is driven by the MIRROR div, not the textarea. The mirror
   * sits in normal flow and its height grows naturally with wrapped
   * content; the textarea is `absolute inset-0` and inherits the mirror's
   * box. That keeps caret positions, line wrapping, and newlines perfectly
   * aligned between the two layers without us having to measure anything. */

  /* Cancel in-flight stream when the node unmounts (user deleted it,
   * navigated away, hot-reloaded). Without this the OpenAI stream
   * keeps running and the state update tries to touch a dead node. */
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /* Click-outside for the Length dropdown. */
  useEffect(() => {
    if (!lengthMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (!lengthMenuRef.current) return;
      if (!lengthMenuRef.current.contains(e.target as Node)) {
        setLengthMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [lengthMenuOpen]);

  /* Auto-focus the textarea when a NEW beat node is inserted. We detect
   * "new" by node content being empty AND status='draft' AND generated
   * prose absent. Opening a saved-empty beat would also match, which is
   * fine — focusing it is non-harmful. */
  useEffect(() => {
    if (status === "draft" && !beatText && !generatedProse) {
      textareaRef.current?.focus();
    }
    /* only on mount */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Commit the draft back to the node attr on blur. Debouncing in the
   * textarea isn't needed because the beat text is only read at
   * generate-time — intermediate drafts never leave the client. */
  const commitBeatDraft = useCallback(
    (value: string) => {
      const clamped = value.slice(0, MAX_BEAT_CHARS);
      updateAttributes({ beatText: clamped });
    },
    [updateAttributes],
  );

  const onBeatBlur = useCallback(() => {
    commitBeatDraft(beatDraft);
  }, [beatDraft, commitBeatDraft]);

  const runGenerate = useCallback(async () => {
    /* Commit draft first so node state is consistent if the user closes
     * the tab mid-stream (saved state = current beat + status='draft'). */
    commitBeatDraft(beatDraft);

    const chapterId =
      (extension.options as SceneBeatOptions).getChapterId() ?? null;
    if (!chapterId) {
      toast.error("Save the chapter before generating a beat.");
      return;
    }
    const trimmed = beatDraft.trim();
    if (!trimmed) {
      toast.error("Write a short description of what should happen.");
      textareaRef.current?.focus();
      return;
    }

    /* Cancel any prior in-flight request from this node. The abort
     * propagates through fetch → the response reader, which ends the
     * for-await loop without throwing in our catch handler (AbortError
     * is swallowed explicitly). */
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setErrorMessage(null);
    setStreamingProse("");
    updateAttributes({ status: "generating" });

    try {
      const res = await fetch("/api/ai/scene-beat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          beatText: trimmed,
          lengthHint,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        /* Try to pull a JSON error message out of the body. Routes use
         * `apiJsonError` which sets Content-Type: application/json. */
        let msg = "The assistant is temporarily unavailable.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) msg = data.error;
        } catch {
          /* body wasn't JSON — stick with the default. */
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setStreamingProse(buffer);
      }
      buffer += decoder.decode();

      /* Only promote streaming → persisted state on a successful read.
       * If the request was aborted the controller's signal is set and
       * we skip the node update (avoids a race when the user clicks
       * Regenerate before the old stream finished). */
      if (controller.signal.aborted) return;

      updateAttributes({
        status: "generated",
        generatedProse: buffer,
        generatedAt: new Date().toISOString(),
      });
      setStreamingProse(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        /* User-initiated cancel. Reset to draft silently. */
        updateAttributes({ status: "draft" });
        setStreamingProse(null);
        return;
      }
      const msg =
        err instanceof Error ? err.message : "Generation failed. Please retry.";
      setErrorMessage(msg);
      updateAttributes({ status: "error" });
      setStreamingProse(null);
      toast.error(msg);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [beatDraft, commitBeatDraft, extension.options, lengthHint, updateAttributes]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    /* The abort handler in runGenerate resets status to 'draft'. */
  }, []);

  /** Keep the beat, strip the prose, reset to draft. */
  const discardProse = useCallback(() => {
    updateAttributes({
      status: "draft",
      generatedProse: null,
      generatedAt: null,
      collapsed: false,
    });
    setStreamingProse(null);
  }, [updateAttributes]);

  /** Remove the entire node (beat + prose). */
  const discardAll = useCallback(() => {
    abortRef.current?.abort();
    deleteNode();
  }, [deleteNode]);

  /**
   * "Keep & collapse beat": hide the beat editor, keep the prose
   * rendered inline. The prose stays inside the node (not flattened to
   * real paragraphs) so the author can still regenerate or discard if
   * they change their mind. The node just becomes visually minimal.
   */
  const keepAndCollapse = useCallback(() => {
    updateAttributes({ collapsed: true });
  }, [updateAttributes]);

  /** Opposite of keepAndCollapse — re-expand the beat editor. */
  const expandBeat = useCallback(() => {
    updateAttributes({ collapsed: false });
  }, [updateAttributes]);

  const deleteBeatOnly = useCallback(() => {
    if (status === "generating") {
      toast.error("Cancel the generation first.");
      return;
    }
    abortRef.current?.abort();
    deleteNode();
  }, [deleteNode, status]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      /* Cmd/Ctrl+Enter inside the beat triggers Generate. Use capture-
       * level stopPropagation so the editor's own Enter handling doesn't
       * insert a newline inside the beat as a side effect. */
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        void runGenerate();
      }
    },
    [runGenerate],
  );

  /* Highlight bracketed directives inside the textarea by rendering a
   * hidden mirror div with the same text + a coloured <span> for each
   * bracketed segment, positioned exactly under the textarea. The
   * textarea has `background: transparent` and the mirror shows
   * through. */
  const segments = useMemo(() => parseSceneBeatSegments(beatDraft), [beatDraft]);
  const directiveCount = useMemo(
    () => countSceneBeatDirectives(beatDraft),
    [beatDraft],
  );

  const isGenerating = status === "generating";
  const isError = status === "error";
  const hasProse = status === "generated" && typeof generatedProse === "string";
  const liveProse = isGenerating ? streamingProse ?? "" : generatedProse ?? "";

  const showBeatEditor = !(hasProse && collapsed);

  /* Chip used when the beat is collapsed with prose. Click to expand. */
  const beatChip = (
    <button
      type="button"
      onClick={expandBeat}
      className="flex w-full items-start gap-2 rounded-md border border-gold/20 bg-gold/5 px-3 py-2 text-left text-[13px] italic text-editorial-muted transition hover:border-gold/40 hover:bg-gold/10"
      title="Show the beat text again"
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
      <span className="line-clamp-2 font-sans">
        {beatText.trim() || <span className="opacity-60">(empty beat)</span>}
      </span>
      <ChevronDown
        className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-editorial-muted"
        aria-hidden
      />
    </button>
  );

  return (
    <NodeViewWrapper
      as="div"
      data-scene-beat
      data-status={status}
      data-collapsed={collapsed ? "true" : "false"}
      /* contentEditable=false tells ProseMirror the node view is atomic
       * and to leave internal clicks to us. React handles all focus. */
      contentEditable={false}
      className={cn(
        "scene-beat my-4 select-text rounded-lg border border-gold/30 bg-gold/[0.035] p-3 shadow-sm transition",
        isGenerating && "scene-beat-streaming border-gold/60",
        isError && "border-red-500/60 bg-red-500/5",
      )}
    >
      {/* BEAT EDITOR or CHIP */}
      {showBeatEditor ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gold/80">
              <Sparkles className="h-3 w-3" aria-hidden />
              Scene beat
            </div>
            <div className="flex items-center gap-1">
              {hasProse ? (
                <button
                  type="button"
                  onClick={keepAndCollapse}
                  className="rounded p-1 text-editorial-muted transition hover:bg-gold/10 hover:text-gold"
                  title="Collapse the beat and keep the prose"
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {/* Textarea + mirror overlay for bracketed-directive highlighting.
            *
            * Canonical trick: two elements stacked at the same position with
            * identical typography/padding/line-height. The mirror is a
            * visible div that paints `[bracketed]` spans in the accent
            * colour; the textarea sits on top with `color: transparent` so
            * the author sees the mirror's colouring — but we keep
            * `caret-color: currentColor` on the mirror-wrap so the caret
            * is still visible against the dark background.
            *
            * We also append a trailing zero-width space so the mirror's
            * last line never collapses to zero height when `beatDraft`
            * ends with `\n`. */}
          <div className="scene-beat-textarea-wrap relative">
            <div
              aria-hidden
              className="scene-beat-mirror pointer-events-none whitespace-pre-wrap break-words font-sans text-[14px] italic leading-relaxed text-editorial-cream/90"
            >
              {segments.length === 0 ? (
                <span className="text-editorial-muted/60">
                  {/* Placeholder text painted here so the layout matches
                    * the textarea's placeholder exactly (textarea own
                    * placeholder is invisible because its text is
                    * transparent). */}
                  Describe what happens in this beat. Use [brackets] for stage
                  directions like [slow down] or [describe the smell].
                </span>
              ) : (
                segments.map((seg, i) =>
                  seg.kind === "directive" ? (
                    <span
                      key={i}
                      className="rounded-sm bg-gold/15 px-0.5 not-italic text-gold/90"
                    >
                      [{seg.text}]
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  ),
                )
              )}
              {"\u200B"}
            </div>
            <textarea
              ref={textareaRef}
              value={beatDraft}
              onChange={(e) => setBeatDraft(e.target.value.slice(0, MAX_BEAT_CHARS))}
              onBlur={onBeatBlur}
              onKeyDown={handleKeyDown}
              readOnly={isGenerating}
              rows={2}
              maxLength={MAX_BEAT_CHARS}
              /* The textarea's own placeholder stays empty — the mirror
               * above renders the placeholder in the correct colour so
               * its typography matches the real text perfectly. */
              placeholder=""
              className={cn(
                "scene-beat-textarea absolute inset-0 block h-full w-full resize-none border-0 bg-transparent px-0 py-0 font-sans text-[14px] italic leading-relaxed text-transparent selection:bg-gold/25 selection:text-transparent focus:outline-none focus:ring-0",
                isGenerating && "cursor-wait opacity-70",
              )}
              style={{ caretColor: "var(--color-editorial-cream, #f5efe6)" }}
            />
          </div>

          {/* Hint row: directive count + length summary + primary CTA */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gold/10 pt-2">
            <div className="text-[11px] text-editorial-muted">
              {directiveCount > 0 ? (
                <>
                  <span className="text-gold/80">
                    {directiveCount} stage direction
                    {directiveCount === 1 ? "" : "s"}
                  </span>
                  {" · "}
                </>
              ) : null}
              <span>Cmd/Ctrl+Enter to generate</span>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {/* Length picker */}
              <div ref={lengthMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setLengthMenuOpen((v) => !v)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1 rounded border border-gold/20 bg-editorial-bg/60 px-2 py-1 text-[11px] text-editorial-muted transition hover:border-gold/40 hover:text-gold disabled:opacity-50"
                  title={`Target length: ${lengthSummary(lengthHint)}`}
                >
                  <span className="text-[11px] font-medium text-editorial-cream/80">
                    Length
                  </span>
                  <span className="text-[11px]">
                    {LENGTH_LABELS[lengthHint]}
                  </span>
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </button>
                {lengthMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-md border border-gold/20 bg-editorial-bg shadow-lg"
                  >
                    {SCENE_BEAT_LENGTHS.map((len) => (
                      <button
                        type="button"
                        key={len}
                        role="menuitemradio"
                        aria-checked={lengthHint === len}
                        onClick={() => {
                          updateAttributes({ lengthHint: len });
                          setLengthMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition",
                          lengthHint === len
                            ? "bg-gold/15 text-gold"
                            : "text-editorial-muted hover:bg-gold/10 hover:text-editorial-cream",
                        )}
                      >
                        <span className="font-medium">{LENGTH_LABELS[len]}</span>
                        <span className="text-[11px] opacity-80">
                          ~{SCENE_BEAT_LENGTH_WORDS[len]}w
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {hasProse ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void runGenerate()}
                  disabled={isGenerating}
                  className="h-7 border-gold/40 px-2 text-[12px] text-gold hover:bg-gold/10"
                  title="Regenerate — same beat, new prose"
                >
                  <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
                  Regenerate
                </Button>
              ) : null}

              {isGenerating ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancelStream}
                  className="h-7 border-red-500/40 px-2 text-[12px] text-red-300 hover:bg-red-500/10"
                  title="Cancel generation"
                >
                  <X className="mr-1 h-3 w-3" aria-hidden />
                  Cancel
                </Button>
              ) : hasProse ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={discardProse}
                  className="h-7 px-2 text-[12px] text-editorial-muted hover:bg-red-500/10 hover:text-red-300"
                  title="Discard prose, keep beat"
                >
                  Discard prose
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runGenerate()}
                  disabled={isGenerating || !beatDraft.trim()}
                  className="h-7 bg-gold px-3 text-[12px] font-semibold text-editorial-bg hover:bg-gold/90"
                >
                  <Wand2 className="mr-1 h-3 w-3" aria-hidden />
                  Generate
                </Button>
              )}

              <button
                type="button"
                onClick={deleteBeatOnly}
                disabled={isGenerating}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-editorial-muted transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                title="Delete beat"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : (
        beatChip
      )}

      {/* STREAMED / PERSISTED PROSE */}
      {(isGenerating && streamingProse !== null) || hasProse ? (
        <div
          className={cn(
            "mt-3 border-t border-gold/10 pt-3",
            isGenerating && "scene-beat-prose-streaming",
          )}
        >
          {isGenerating ? (
            <div className="mb-2 flex items-center gap-2 text-[11px] text-gold/80">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              <span className="uppercase tracking-wider">Generating prose…</span>
            </div>
          ) : null}
          <div className="scene-beat-prose space-y-3 text-[15px] leading-relaxed text-editorial-cream">
            {prosePararaphs(liveProse).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {isGenerating && liveProse.length === 0 ? (
              <p className="italic text-editorial-muted">
                Waiting for the first words…
              </p>
            ) : null}
          </div>
          {hasProse && !isGenerating && !collapsed ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gold/10 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={keepAndCollapse}
                className="h-7 bg-gold px-3 text-[12px] font-semibold text-editorial-bg hover:bg-gold/90"
                title="Collapse the beat; keep the prose below"
              >
                Keep &amp; collapse beat
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={discardAll}
                className="h-7 px-2 text-[12px] text-editorial-muted hover:bg-red-500/10 hover:text-red-300"
                title="Discard beat AND generated prose"
              >
                <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                Discard everything
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isError ? (
        <div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-[12px] text-red-300">
          <p>{errorMessage ?? "Generation failed."}</p>
          <div className="mt-1.5 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void runGenerate()}
              className="h-6 border-red-500/30 px-2 text-[11px] text-red-200 hover:bg-red-500/10"
            >
              Retry
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={discardAll}
              className="h-6 px-2 text-[11px] text-editorial-muted hover:text-red-300"
            >
              Delete beat
            </Button>
          </div>
        </div>
      ) : null}

      {/* Hidden ref to maintain editor/getPos usage for future features
       * (e.g. "insert prose into real paragraphs"). The linter flags
       * unused props otherwise. */}
      <span hidden data-pos={typeof getPos === "function" ? getPos() : ""} />
      {editor ? null : null}
    </NodeViewWrapper>
  );
}

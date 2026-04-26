"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import { INLINE_COMMANDS, type InlineCommandId } from "@/lib/ai/inline-commands";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Loader2,
  Pencil,
  Plus,
  Replace,
  RotateCcw,
  Sparkles,
  X,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type {
  InlineCommandAlternative,
  InlineCommandPanelState,
} from "./types";

export type InlineCommandPanelProps = {
  state: NonNullable<InlineCommandPanelState>;
  /** Update the custom instruction while `status === "draft"`. */
  onCustomInstructionChange: (value: string) => void;
  /**
   * User pressed the primary CTA in draft mode — fire the request with the
   * current custom instruction.
   */
  onRunCustom: () => void;
  /** Re-run the same request. Works from `complete` or `error`. */
  onRegenerate: () => void;
  /** Insert the given alternative, replacing the originally-selected range. */
  onInsert: (alt: InlineCommandAlternative) => void;
  /** Append the given alternative as a new paragraph after the selection. */
  onAppendBelow: (alt: InlineCommandAlternative) => void;
  /** Close the panel (and abort any in-flight stream). */
  onClose: () => void;
};

/**
 * Slide-in alternative card stack rendered to the right of the editor canvas.
 *
 * The panel is *always* rendered when `state` is non-null — including during
 * streaming — so users can see alternatives populate in real time. Each
 * alternative renders as its own Card with [Insert] / [Append below] / [Copy]
 * actions, and the footer exposes [Regenerate] / [Close].
 */
export function InlineCommandPanel({
  state,
  onCustomInstructionChange,
  onRunCustom,
  onRegenerate,
  onInsert,
  onAppendBelow,
  onClose,
}: InlineCommandPanelProps) {
  const { request, alternatives, status } = state;
  const commandDef = INLINE_COMMANDS[request.command];

  const headerTitle = useMemo(() => {
    if (request.command === "custom") {
      return status === "draft" ? "Custom inline command" : "Custom rewrite";
    }
    return `${commandDef.label} selection`;
  }, [request.command, commandDef.label, status]);

  /* ESC closes the panel — matches the convention in AssistPromptPanel and
   * the other editor overlays. We bind to the window because focus may be
   * inside the custom-instruction textarea or a card's button. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const customInputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (status === "draft") {
      customInputRef.current?.focus();
    }
  }, [status]);

  const alternativeCount = alternatives.length;
  const isStreaming = status === "running";
  const headline = isStreaming
    ? `Generating ${Math.max(alternativeCount, 1)} alternative${alternativeCount === 1 ? "" : "s"}…`
    : status === "error"
      ? "Streaming stopped"
      : status === "complete"
        ? `${alternativeCount} alternative${alternativeCount === 1 ? "" : "s"}`
        : "Ready when you are";

  return (
    <aside
      /* Stacks above the outline panel and the assist-prompt panel because
       * it's triggered by a direct user action on the selection — should
       * always win the z-index fight. */
      className="pointer-events-auto fixed right-4 top-20 z-40 flex w-[min(420px,calc(100vw-2rem))] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur"
      role="dialog"
      aria-label={headerTitle}
    >
      <header className="flex items-start gap-2 border-b border-border/60 bg-editorial-bg/60 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-editorial-cream">
            {headerTitle}
          </p>
          <p className="mt-0.5 text-xs text-editorial-muted">
            {isStreaming ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                {headline}
              </span>
            ) : (
              headline
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close inline command panel"
          title="Close (Esc)"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {status === "draft" ? (
          <CustomDraft
            ref={customInputRef}
            value={request.customInstruction ?? ""}
            onChange={onCustomInstructionChange}
            onSubmit={onRunCustom}
          />
        ) : null}

        {status === "error" && alternatives.length === 0 ? (
          <ErrorCard
            message={state.errorMessage ?? "The assistant could not complete the rewrite."}
            onRetry={onRegenerate}
          />
        ) : null}

        {alternatives.map((alt, idx) => (
          <AlternativeCard
            key={alt.id}
            alternative={alt}
            index={idx + 1}
            disableActions={alt.status === "streaming" || !alt.text.trim()}
            onInsert={() => onInsert(alt)}
            onAppendBelow={() => onAppendBelow(alt)}
          />
        ))}

        {isStreaming && alternatives.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 bg-editorial-bg/40 px-3 py-6 text-sm text-editorial-muted">
            <Loader2 className="h-4 w-4 animate-spin text-gold" aria-hidden />
            Drafting…
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border/60 bg-editorial-bg/60 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={status === "running" || status === "draft"}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Regenerate
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </footer>
    </aside>
  );
}

type CustomDraftProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const CustomDraft = forwardRef<HTMLTextAreaElement, CustomDraftProps>(
  function CustomDraft({ value, onChange, onSubmit }, ref) {
    const trimmed = value.trim();
    return (
      <div className="rounded-lg border border-border/60 bg-editorial-bg/60 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-editorial-muted">
          <Pencil className="h-3.5 w-3.5 text-gold" aria-hidden />
          Your instruction
        </p>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && trimmed) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          maxLength={2000}
          placeholder='e.g. "Rewrite in third-person past tense and tighten the pacing."'
          className="mt-2 w-full resize-y rounded-md border border-border/60 bg-card/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-editorial-muted">{value.length}/2000</span>
          <Button
            type="button"
            size="sm"
            className="bg-gold text-editorial-bg hover:bg-gold/90"
            disabled={!trimmed}
            onClick={onSubmit}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Generate alternatives
          </Button>
        </div>
      </div>
    );
  },
);

function AlternativeCard({
  alternative,
  index,
  disableActions,
  onInsert,
  onAppendBelow,
}: {
  alternative: InlineCommandAlternative;
  index: number;
  disableActions: boolean;
  onInsert: () => void;
  onAppendBelow: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const streaming = alternative.status === "streaming";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(alternative.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context) — silently no-op; the
       * Insert / Append buttons are the primary completion paths anyway. */
    }
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-border/60 bg-editorial-bg/60 p-3 transition-shadow",
        streaming && "border-gold/30",
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-editorial-muted">
          Alternative {index}
          {streaming ? (
            <span className="ml-2 inline-flex items-center gap-1 text-gold">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              streaming
            </span>
          ) : null}
        </span>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-editorial-cream">
        {alternative.text || <span className="text-editorial-muted">…</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-gold text-editorial-bg hover:bg-gold/90"
          disabled={disableActions}
          onClick={onInsert}
          title="Replace the original selection with this alternative"
        >
          <Replace className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Insert
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disableActions}
          onClick={onAppendBelow}
          title="Add this as a new paragraph below the selection"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Append below
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disableActions}
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </article>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
      <p className="text-sm font-semibold text-red-200">The assistant hit a snag</p>
      <p className="mt-1 text-xs text-red-100/80">{message}</p>
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-red-500/40 text-red-100 hover:bg-red-500/10"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Retry
        </Button>
      </div>
    </div>
  );
}

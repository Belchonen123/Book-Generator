"use client";

import { Button } from "@/components/ui/button";
import { Expand, Loader2, Sparkles, Wand2, X } from "@/lib/lucide-icons";

export type AssistPromptPanelProps = {
  action: "expand" | "rewrite";
  prompt: string;
  onPromptChange: (value: string) => void;
  busy: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onClear: () => void;
};

/**
 * Shared inline panel for free-form AI edits (`expand`, `rewrite`). The exact
 * wording + CTA icon flips on `action`, but the shape is identical so one
 * component renders both.
 */
export function AssistPromptPanel({
  action,
  prompt,
  onPromptChange,
  busy,
  disabled,
  onSubmit,
  onClose,
  onClear,
}: AssistPromptPanelProps) {
  const isExpand = action === "expand";
  const HeadingIcon = isExpand ? Expand : Wand2;
  const title = isExpand ? "Expand selection with AI" : "Rewrite selection with AI";
  const description = isExpand
    ? "Select text in the chapter, then optionally tell the AI how to expand it (e.g. “add a vivid sensory description of the storm”). Leave blank for a general expansion."
    : "Select text in the chapter, then tell the AI how to rewrite it (e.g. “make this more tense and immediate”). Required — the rewriter won't run without direction.";
  const placeholder = isExpand
    ? "Optional instruction — how should the AI expand this passage?"
    : "How should the AI rewrite this passage?";
  const cta = isExpand ? "Expand selection" : "Rewrite selection";
  const busyCta = isExpand ? "Expanding…" : "Rewriting…";
  const submitDisabled = disabled || (!isExpand && !prompt.trim());

  return (
    <div className="flex flex-col gap-2 border-b border-border/50 bg-card/40 px-4 py-3">
      <div className="flex items-start gap-2">
        <HeadingIcon className="mt-1 h-4 w-4 shrink-0 text-gold" aria-hidden />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-editorial-muted">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Close assistant panel"
          title="Close (Esc)"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-editorial-muted">{prompt.length}/2000</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !prompt}
            onClick={onClear}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-gold text-editorial-bg hover:bg-gold/90"
            disabled={submitDisabled}
            onClick={onSubmit}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {busyCta}
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
                {cta}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

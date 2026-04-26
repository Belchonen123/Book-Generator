"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, Wand2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

export type OutlinePanelProps = {
  outlineSummary: string;
  onOutlineChange: (value: string) => void;
  onOutlineBlur: () => void;
  authorNotes: string;
  onAuthorNotesChange: (value: string) => void;
  onAuthorNotesBlur: () => void;
  expandOpen: boolean;
  expandPrompt: string;
  expandBusy: boolean;
  onToggleExpand: () => void;
  onExpandPromptChange: (value: string) => void;
  onExpand: () => void;
  disabled: boolean;
};

export function OutlinePanel({
  outlineSummary,
  onOutlineChange,
  onOutlineBlur,
  authorNotes,
  onAuthorNotesChange,
  onAuthorNotesBlur,
  expandOpen,
  expandPrompt,
  expandBusy,
  onToggleExpand,
  onExpandPromptChange,
  onExpand,
  disabled,
}: OutlinePanelProps) {
  return (
    <details className="group border-b border-border/50 bg-card/20 px-6 py-3" open>
      <summary className="cursor-pointer list-none font-medium text-gold marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm">Chapter outline &amp; steering</span>
        <span className="ml-2 text-xs font-normal text-editorial-muted">
          (guides AI — edit before regenerate)
        </span>
      </summary>
      <p className="mt-2 text-xs text-editorial-muted">
        This is the outline slice for this chapter. The generator reads it from the
        database when you run <strong className="text-editorial-cream">Regenerate</strong>{" "}
        or <strong className="text-editorial-cream">Generate all chapters</strong>.
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
          Outline
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            expandOpen && "bg-gold/15 text-gold",
          )}
          disabled={disabled || expandBusy}
          onClick={onToggleExpand}
          aria-expanded={expandOpen}
          title="Expand the outline for this chapter with AI"
        >
          <Wand2 className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Expand outline</span>
          {expandOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </Button>
      </div>

      <textarea
        value={outlineSummary}
        onChange={(e) => onOutlineChange(e.target.value)}
        onBlur={onOutlineBlur}
        disabled={disabled || expandBusy}
        rows={5}
        placeholder="What this chapter should cover — edit anytime before generating."
        className="mt-1 w-full resize-y rounded-xl border border-gold/20 bg-editorial-bg/70 px-3.5 py-2.5 text-sm leading-relaxed text-editorial-cream shadow-inner shadow-black/10 transition-colors placeholder:text-editorial-muted focus-visible:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 disabled:opacity-60"
      />

      {expandOpen ? (
        <div className="mt-3 rounded-lg border border-gold/30 bg-editorial-bg/60 p-3">
          <p className="text-xs text-editorial-muted">
            AI will deepen the outline into 4–8 beats for this chapter only. Optionally
            add a steering note to focus the expansion (e.g.{" "}
            <em className="text-editorial-cream">
              &ldquo;lean harder into the mentor&rsquo;s backstory&rdquo;
            </em>
            ).
          </p>
          <textarea
            value={expandPrompt}
            onChange={(e) => onExpandPromptChange(e.target.value)}
            rows={2}
            maxLength={2_000}
            disabled={expandBusy}
            placeholder="Optional direction for the expansion…"
            className="mt-2 w-full resize-y rounded-md border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-editorial-muted">
              {expandPrompt.length}/2000 · replaces the current outline
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={expandBusy}
                onClick={onToggleExpand}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={expandBusy}
                onClick={onExpand}
              >
                {expandBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Expanding…
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Expand outline
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <label
          htmlFor="chapter-author-notes"
          className="text-xs font-semibold uppercase tracking-wide text-editorial-muted"
        >
          Steering notes for AI (optional)
        </label>
        <p className="mt-1 text-xs text-editorial-muted">
          Freeform instructions the generator must follow for this chapter — e.g.{" "}
          <em className="text-editorial-cream">&ldquo;keep Sarah&rsquo;s POV only&rdquo;</em>,{" "}
          <em className="text-editorial-cream">&ldquo;end on a cliffhanger&rdquo;</em>,{" "}
          <em className="text-editorial-cream">
            &ldquo;include a short flashback to the lighthouse&rdquo;
          </em>
          . Applied on every regenerate.
        </p>
        <textarea
          id="chapter-author-notes"
          value={authorNotes}
          onChange={(e) => onAuthorNotesChange(e.target.value)}
          onBlur={onAuthorNotesBlur}
          disabled={disabled || expandBusy}
          rows={3}
          maxLength={4_000}
          placeholder="Tell the AI how to steer this chapter on regenerate…"
          className="mt-2 w-full resize-y rounded-lg border border-border/60 bg-editorial-bg/80 px-3 py-2 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
        />
        <div className="mt-1 text-right text-[11px] text-editorial-muted">
          {authorNotes.length}/4000
        </div>
      </div>
    </details>
  );
}

"use client";

import type { Editor } from "@tiptap/core";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  dismissContinuityWarningAction,
  resolveContinuityWarningAction,
  runContinuityCheckAction,
  setContinuityChecksEnabledAction,
} from "@/app/(dashboard)/projects/[id]/chapters/[chapterId]/continuity-actions";
import { jumpToExcerpt } from "@/components/book/ConsistencyPanel";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  X,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

/**
 * Non-blocking continuity warnings strip for the chapter editor.
 *
 * Prompt 16 § 294-305: "surface a non-blocking warning in the editor:
 * 'Possible continuity issue: this passage references Dmitri teaching
 * Faiga, but no such event appears in prior books. Verify or add a
 * progression.'"
 *
 * UX:
 *  - Only mounts when the book is in a series (standalone books never get
 *    the feature — the auto-trigger is gated on series membership too).
 *  - Collapsed by default with a single-line summary ("2 continuity
 *    notes · Run check"); expands to show each warning with Jump /
 *    Dismiss / Resolve actions.
 *  - Hidden entirely when the user disables continuity checks AND there
 *    are no active warnings left to clean up.
 *  - "Run check" is debounced via a `useTransition` so multiple clicks
 *    during a long run don't pile up.
 */

export type ContinuityWarningRow = {
  id: string;
  excerpt: string;
  issue: string;
  suggestion: string | null;
  codex_entry_ids: string[];
  created_at: string;
};

export type ContinuityWarningsPanelProps = {
  bookId: string;
  chapterId: string;
  isInSeries: boolean;
  enabled: boolean;
  /** Currently-active warnings for the chapter (SSR-fetched). */
  warnings: ContinuityWarningRow[];
  /** TipTap editor instance for "Jump to passage" — may be null during init. */
  editor: Editor | null;
};

export function ContinuityWarningsPanel({
  bookId,
  chapterId,
  isInSeries,
  enabled,
  warnings,
  editor,
}: ContinuityWarningsPanelProps) {
  const [open, setOpen] = useState(warnings.length > 0);
  const [localWarnings, setLocalWarnings] =
    useState<ContinuityWarningRow[]>(warnings);
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [runPending, startRun] = useTransition();
  const [togglePending, startToggle] = useTransition();
  const [rowPending, setRowPending] = useState<string | null>(null);

  /* Standalone (non-series) books never have warnings and never run the
   * check, so there's nothing useful to render. */
  if (!isInSeries) return null;

  /* User fully opted out AND there's no lingering audit data — collapse
   * the UI entirely instead of showing an empty gray strip. */
  if (!localEnabled && localWarnings.length === 0) return null;

  const handleRun = () => {
    startRun(async () => {
      const res = await runContinuityCheckAction(bookId, chapterId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.status === "skipped") {
        toast.info(res.reason ?? "Nothing to check yet.");
        return;
      }
      if (res.warningsDetected === 0) {
        toast.success(
          `No continuity issues found (scanned ${res.entitiesScanned ?? 0} entities).`,
        );
      } else {
        toast.warning(
          `${res.warningsDetected} continuity issue${
            res.warningsDetected === 1 ? "" : "s"
          } flagged.`,
        );
      }
      /* The warnings list is re-read on next SSR render via the path
       * revalidation inside the action. For an instant update here we'd
       * need a router.refresh(); the caller can drop one in if the panel
       * is re-mounted with new props. */
    });
  };

  const handleToggle = (next: boolean) => {
    setLocalEnabled(next);
    startToggle(async () => {
      const res = await setContinuityChecksEnabledAction(bookId, next);
      if (!res.ok) {
        toast.error(res.error);
        setLocalEnabled(!next);
      }
    });
  };

  const handleDismiss = async (id: string) => {
    setRowPending(id);
    const res = await dismissContinuityWarningAction(id);
    setRowPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLocalWarnings((prev) => prev.filter((w) => w.id !== id));
  };

  const handleResolve = async (id: string) => {
    setRowPending(id);
    const res = await resolveContinuityWarningAction(id);
    setRowPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLocalWarnings((prev) => prev.filter((w) => w.id !== id));
  };

  const handleJump = (excerpt: string) => {
    if (!editor) return;
    jumpToExcerpt(editor, excerpt);
  };

  const count = localWarnings.length;

  return (
    <div
      className={cn(
        "mb-3 overflow-hidden rounded-lg border text-sm transition-colors",
        count > 0
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border/60 bg-card/40",
      )}
      aria-label="Continuity warnings"
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-medium text-editorial-cream hover:text-gold"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <AlertTriangle
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              count > 0 ? "text-amber-400" : "text-editorial-muted",
            )}
          />
          <span className="truncate">
            {count === 0
              ? "No active continuity warnings for this chapter."
              : `${count} continuity warning${count === 1 ? "" : "s"}`}
          </span>
        </button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={runPending || !localEnabled}
          onClick={handleRun}
          title={
            localEnabled
              ? "Re-run the continuity check for this chapter"
              : "Turn continuity checks back on to run a scan"
          }
        >
          {runPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3.5 w-3.5" />
          )}
          Run check
        </Button>
        <label className="flex shrink-0 items-center gap-1 text-[11px] text-editorial-muted">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-gold"
            checked={localEnabled}
            disabled={togglePending}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Auto-check
        </label>
      </div>

      {open && count > 0 ? (
        <ul className="space-y-2 border-t border-border/60 px-3 py-3">
          {localWarnings.map((w) => {
            const busy = rowPending === w.id;
            return (
              <li
                key={w.id}
                className="rounded-md border border-amber-500/30 bg-background/60 p-3"
              >
                <p className="text-xs text-amber-200">{w.issue}</p>
                <p className="mt-1 rounded bg-card/60 px-2 py-1 font-mono text-[11px] text-editorial-cream">
                  “{w.excerpt}”
                </p>
                {w.suggestion ? (
                  <p className="mt-1 text-[11px] italic text-editorial-muted">
                    Suggestion: {w.suggestion}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !editor}
                    onClick={() => handleJump(w.excerpt)}
                    title="Select this passage in the editor"
                  >
                    Jump to passage
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void handleResolve(w.id)}
                    title="Mark as fixed (keeps it in audit history)"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Mark resolved
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void handleDismiss(w.id)}
                    title="This is intentional — stop flagging it"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

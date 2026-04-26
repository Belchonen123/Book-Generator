"use client";

import type { Editor } from "@tiptap/core";

import { Button } from "@/components/ui/button";
import { Loader2, X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";
import { ApiErrorCode } from "@/lib/utils/errors";

export type ConsistencyIssue = {
  type:
    | "character_inconsistency"
    | "timeline"
    | "geography"
    | "object_continuity"
    | "other";
  severity: "minor" | "moderate" | "major";
  excerpt: string;
  problem: string;
  suggestion?: string;
};

export type ConsistencyCheckResult = {
  issues: ConsistencyIssue[];
  summary: string;
};

const severityClass = (sev: ConsistencyIssue["severity"]) =>
  sev === "major"
    ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
    : sev === "moderate"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
      : "border-border/60 bg-card/50 text-editorial-muted";

/**
 * Find `needle` in the first text node that contains it; return doc
 * range. Falls back to a short prefix (≥3 chars) if the full 80-char
 * excerpt was reformatted in the editor.
 */
export function findExcerptRange(
  editor: Editor,
  excerpt: string,
): { from: number; to: number } | null {
  const tryNeedle = (needle: string) => {
    const n = needle.trim();
    if (n.length < 2) return null;
    let found: { from: number; to: number } | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (!node.isText || !node.text) return;
      const i = node.text.indexOf(n);
      if (i >= 0) {
        const from = pos + i;
        found = { from, to: from + n.length };
        return false;
      }
    });
    return found;
  };

  const full = tryNeedle(excerpt);
  if (full) return full;
  const short = excerpt.trim().slice(0, 40);
  if (short.length >= 3 && short !== excerpt.trim()) {
    return tryNeedle(short);
  }
  return null;
}

export function jumpToExcerpt(editor: Editor, excerpt: string) {
  const range = findExcerptRange(editor, excerpt);
  if (!range) return;
  editor
    .chain()
    .focus()
    .setTextSelection({ from: range.from, to: range.to })
    .scrollIntoView()
    .run();
}

type Props = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  loading: boolean;
  result: ConsistencyCheckResult | null;
  error: string | null;
  errorCode: string | null;
};

export function ConsistencyPanel({
  open,
  onClose,
  editor,
  loading,
  result,
  error,
  errorCode,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close consistency panel"
        className="fixed inset-0 z-40 cursor-default bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-2xl",
          "animate-in slide-in-from-right duration-200",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-serif text-lg text-editorial-cream">Consistency</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-editorial-muted">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" aria-hidden />
              Analyzing chapter…
            </p>
          ) : null}

          {!loading && error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
              {errorCode === ApiErrorCode.UPGRADE_REQUIRED ? (
                <p className="mt-2 text-xs text-editorial-muted">
                  Upgrade to Pro to use the consistency checker.
                </p>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && result ? (
            <div className="space-y-4">
              <p className="text-sm text-editorial-cream">{result.summary}</p>
              {result.issues.length === 0 ? (
                <p className="text-sm text-editorial-muted">No issues flagged in this run.</p>
              ) : (
                <ul className="space-y-3">
                  {result.issues.map((iss, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border/50 bg-editorial-bg/50 p-3 text-sm"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            severityClass(iss.severity),
                          )}
                        >
                          {iss.severity}
                        </span>
                        <span className="text-xs text-editorial-muted">· {iss.type.replace(/_/g, " ")}</span>
                      </div>
                      <p className="mb-1 font-mono text-xs text-gold/90">&ldquo;{iss.excerpt}&rdquo;</p>
                      <p className="text-editorial-cream/95">{iss.problem}</p>
                      {iss.suggestion?.trim() ? (
                        <p className="mt-2 text-xs text-editorial-muted">
                          <span className="text-gold/80">Suggestion:</span> {iss.suggestion}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={!editor}
                          onClick={() => {
                            if (editor) jumpToExcerpt(editor, iss.excerpt);
                          }}
                        >
                          Jump to excerpt
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

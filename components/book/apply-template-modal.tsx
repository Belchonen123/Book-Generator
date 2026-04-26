"use client";

/**
 * Apply-structural-template modal. Opened from the outline page.
 *
 * Layout (desktop): two-column. Left = list of templates (filtered by
 * book type), right = live preview of the selected template's beats.
 *
 * On mobile the panel becomes a bottom sheet — the template list
 * collapses into a horizontal scroll strip above the preview to avoid
 * stacking a long list.
 *
 * The modal itself is a pure picker: it calls `onApply(templateId)`
 * with the chosen template id and lets the parent (OutlineEditor)
 * handle the section-append + confirm-if-existing logic. Keeps the
 * parent in charge of the outline data.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Loader2, Wand2, X } from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import {
  type OutlineTemplate,
  type OutlineTemplateId,
} from "@/lib/outline-templates";
import type { BookTypeDb } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

export type ApplyTemplateModalProps = {
  open: boolean;
  onClose: () => void;
  bookType: BookTypeDb;
  /** Templates eligible for the current book. */
  templates: ReadonlyArray<OutlineTemplate>;
  /** How many chapters are already in the outline — used for the confirm copy. */
  existingChapterCount: number;
  applying: boolean;
  onApply: (templateId: OutlineTemplateId) => Promise<void> | void;
};

export function ApplyTemplateModal({
  open,
  onClose,
  templates,
  existingChapterCount,
  applying,
  onApply,
}: ApplyTemplateModalProps) {
  const [selectedId, setSelectedId] = useState<OutlineTemplateId>(
    templates[0]?.id ?? "three-act",
  );
  const [confirming, setConfirming] = useState(false);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0] ?? null,
    [selectedId, templates],
  );

  if (!open) return null;

  /* If the outline already has chapters, gate the apply click behind a
   * confirm step. The spec is explicit: existing chapters stay, new
   * ones are appended. */
  const needsConfirm = existingChapterCount > 0;

  const handleApplyClick = async () => {
    if (!selected) return;
    if (needsConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    await onApply(selected.id);
  };

  const handleClose = () => {
    if (applying) return;
    setConfirming(false);
    onClose();
  };

  return (
    <div
      className={responsiveModalRoot("z-50")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-template-title"
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close dialog"
        disabled={applying}
        onClick={handleClose}
      />
      <div
        className={responsiveModalPanel(
          "flex w-full max-w-4xl flex-col md:flex-row md:p-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — absolute, visible from both columns. */}
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-editorial-muted transition hover:bg-muted/40 hover:text-editorial-cream"
          aria-label="Close"
          onClick={handleClose}
          disabled={applying}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        {/* Left: template list */}
        <aside className="flex shrink-0 flex-col border-b border-border/40 md:w-72 md:border-b-0 md:border-r">
          <header className="border-b border-border/40 px-5 py-4">
            <h2
              id="apply-template-title"
              className="font-serif text-lg text-gold"
            >
              Apply structural template
            </h2>
            <p className="mt-1 text-xs text-editorial-muted">
              Pick a classic story structure to scaffold your outline.
            </p>
          </header>
          <div
            className="flex md:block md:max-h-[480px] md:flex-1 md:overflow-y-auto"
            role="listbox"
            aria-label="Structural templates"
          >
            <ul
              className={cn(
                "flex md:flex-col",
                "max-md:flex-row max-md:overflow-x-auto max-md:px-3 max-md:py-3 max-md:gap-2",
              )}
            >
              {templates.map((t) => {
                const active = selected?.id === t.id;
                return (
                  <li key={t.id} className="max-md:shrink-0">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedId(t.id);
                        setConfirming(false);
                      }}
                      className={cn(
                        "w-full text-left transition",
                        "max-md:min-w-[180px] max-md:rounded-lg max-md:border max-md:px-3 max-md:py-2",
                        "md:border-b md:border-border/30 md:px-5 md:py-3",
                        active
                          ? "max-md:border-gold max-md:bg-gold/15 md:bg-gold/10"
                          : "max-md:border-border/60 md:hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "block truncate font-serif text-sm",
                            active ? "text-gold" : "text-editorial-cream",
                          )}
                        >
                          {t.name}
                        </span>
                        {active ? (
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-gold"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <span className="mt-0.5 block text-[11px] leading-snug text-editorial-muted line-clamp-2">
                        {t.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Right: preview */}
        <section className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <header className="border-b border-border/40 px-5 py-4">
                <h3 className="font-serif text-base text-editorial-cream">
                  {selected.name}
                </h3>
                <p className="mt-1 text-xs text-editorial-muted">
                  {selected.description}
                </p>
                {selected.bestFor.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.bestFor.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/60 bg-editorial-bg/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-[10px] italic text-editorial-muted">
                  {selected.source}
                </p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:max-h-[380px]">
                <ol className="flex flex-col gap-3">
                  {selected.beats.map((beat, idx) => (
                    <li
                      key={`${selected.id}-${idx}`}
                      className="rounded-md border border-border/40 bg-editorial-bg/40 px-3 py-2"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="w-6 shrink-0 font-mono text-[11px] text-editorial-muted">
                          {idx + 1}.
                        </span>
                        <h4 className="font-serif text-sm text-editorial-cream">
                          {beat.title}
                        </h4>
                      </div>
                      <p className="ml-8 mt-1 text-xs leading-relaxed text-editorial-muted">
                        {beat.summary}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <footer className="flex flex-col gap-2 border-t border-border/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-editorial-muted">
                  {confirming ? (
                    <span className="text-gold">
                      This will add {selected.beats.length} new chapter
                      {selected.beats.length === 1 ? "" : "s"} to your outline.{" "}
                      <strong>Existing chapters will not be deleted.</strong>
                    </span>
                  ) : (
                    <>
                      {selected.beats.length} beats · will be appended as
                      chapters{" "}
                      {existingChapterCount + 1}–
                      {existingChapterCount + selected.beats.length}
                    </>
                  )}
                </p>
                <div className="flex gap-2 sm:justify-end">
                  {confirming ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={applying}
                      onClick={() => setConfirming(false)}
                    >
                      Back
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={applying}
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={applying}
                    onClick={() => void handleApplyClick()}
                    className="bg-gold text-editorial-bg hover:bg-gold/90"
                  >
                    {applying ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : confirming ? (
                      <Check className="mr-2 h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Wand2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                    )}
                    {confirming ? "Confirm and apply" : "Apply to outline"}
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-editorial-muted">
              No templates available for this book type.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

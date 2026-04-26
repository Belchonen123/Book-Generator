"use client";

import { BookOpen, Check, ImageIcon, Sparkles } from "@/lib/lucide-icons";

import { Button } from "@/components/ui/button";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";

type ExampleBookModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ExampleBookModal({ open, onClose }: ExampleBookModalProps) {
  if (!open) return null;

  return (
    <div
      className={responsiveModalRoot("z-[120]")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="example-book-title"
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={responsiveModalPanel("max-w-lg p-6 sm:p-8")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Sample project</p>
            <h2 id="example-book-title" className="mt-1 font-serif text-2xl text-editorial-cream">
              The Lighthouse Keeper&apos;s Atlas
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200">
            Complete
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-editorial-muted">
          A fictional example of what a finished ChapterAI project looks like—outline approved,
          chapters drafted and edited, cover generated, and export ready for KDP.
        </p>

        <div className="mt-4 rounded-xl border border-border/70 bg-editorial-bg/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold/90">Well-written AI excerpt</p>
          <p className="mt-2 text-sm leading-relaxed text-editorial-cream/90">
            "By the third night, Mara could tell the sea had learned her name. It rattled the
            lantern glass in the same three-beat rhythm she heard in her father&apos;s workshop years
            ago: tap, pause, tap. Storm maps spread across her desk like unfinished prayers, each
            current a sentence she had to read before dawn. When the fog horn finally answered,
            she stood, steadied the flame, and chose the route no captain wanted to admit they
            needed."
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-editorial-bg/60 p-4">
            <p className="text-2xl font-semibold tabular-nums text-gold">12</p>
            <p className="text-xs text-editorial-muted">Chapters</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-editorial-bg/60 p-4">
            <p className="text-2xl font-semibold tabular-nums text-gold">84k</p>
            <p className="text-xs text-editorial-muted">Words (approx.)</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-editorial-muted">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            Outline with twelve structured beats
          </li>
          <li className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            Every chapter moved from pending → draft → edited
          </li>
          <li className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            KDP-style flat cover art
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            Word export + publishing checklist
          </li>
        </ul>

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="border-border" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

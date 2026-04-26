import { AlertTriangle, CheckCircle2 } from "@/lib/lucide-icons";

import type { ExportChapterRow } from "@/components/book/export/export-types";
import type { ChapterStatusDb } from "@/types/database.types";

function chapterReady(status: ChapterStatusDb): boolean {
  // Any chapter that has content ships — we no longer require manual approval.
  return status === "draft" || status === "edited" || status === "approved";
}

export function ExportChapterChecklist({ chapters }: { chapters: ExportChapterRow[] }) {
  const notReadyCount = chapters.filter((c) => !chapterReady(c.status)).length;

  return (
    <div className="relative z-10 mx-auto mt-8 max-w-3xl rounded-xl border border-editorial-muted/20 bg-editorial-card/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gold">Chapters</h3>
      <ul className="mt-3 divide-y divide-editorial-muted/15">
        {chapters.map((ch) => {
          const ready = chapterReady(ch.status);
          return (
            <li
              key={ch.id}
              className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
            >
              {ready ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500/90" aria-hidden />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500/90" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-editorial-cream">
                <span className="text-editorial-muted">Ch. {ch.chapter_number}</span>{" "}
                {ch.title || "Untitled"}
              </span>
              <span className="shrink-0 text-xs capitalize text-editorial-muted">
                {ch.status.replaceAll("_", " ")}
              </span>
            </li>
          );
        })}
      </ul>
      {notReadyCount > 0 ? (
        <div
          className="mt-4 flex gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/95"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <p>
            {notReadyCount} chapter{notReadyCount === 1 ? " isn't" : "s aren't"} written yet —
            {notReadyCount === 1 ? " it" : " they"} won&apos;t be included in your .docx.
            <span className="mt-1 block text-xs text-editorial-muted">
              Generate or write the remaining chapters to include them. Any chapter with content is
              automatically added to the manuscript.
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

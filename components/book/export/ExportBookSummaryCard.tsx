import Image from "next/image";

import type { ExportPanelProps } from "@/components/book/export/export-types";

type Props = Pick<ExportPanelProps, "title" | "genre" | "wordCount" | "chapterCount" | "coverUrl">;

export function ExportBookSummaryCard({
  title,
  genre,
  wordCount,
  chapterCount,
  coverUrl,
}: Props) {
  return (
    <div className="relative z-10 mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-editorial-muted/25 bg-editorial-card shadow-lg">
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-start">
        <div>
          <h2 className="font-serif text-2xl text-editorial-cream">{title}</h2>
          <p className="mt-1 text-sm text-editorial-muted">{genre?.trim() || "General"}</p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-editorial-muted">Words</dt>
              <dd className="font-semibold tabular-nums text-editorial-cream">
                {wordCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-editorial-muted">Chapters</dt>
              <dd className="font-semibold tabular-nums text-editorial-cream">{chapterCount}</dd>
            </div>
          </dl>
        </div>
        <div className="relative mx-auto aspect-[5/8] w-full max-w-[140px] overflow-hidden rounded-lg border border-editorial-muted/30 bg-editorial-bg sm:mx-0">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="140px"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center px-2 text-center text-xs text-editorial-muted">
              No cover yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

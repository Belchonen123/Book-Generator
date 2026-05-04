"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  Share2,
} from "@/lib/lucide-icons";
import Link from "next/link";

import { ExportBookSummaryCard } from "@/components/book/export/ExportBookSummaryCard";
import { ExportChapterChecklist } from "@/components/book/export/ExportChapterChecklist";
import { ExportConfetti } from "@/components/book/export/ExportConfetti";
import { AudioExportSection } from "@/components/book/export/AudioExportSection";
import { ExportKDPSection } from "@/components/book/export/ExportKDPSection";
import { TrimSizeSelector } from "@/components/book/export/TrimSizeSelector";
import type {
  ExportChapterRow,
  ExportPanelProps,
} from "@/components/book/export/export-types";
import { BackToTop } from "@/components/ui/back-to-top";
import { useExportDownloads } from "@/components/book/export/useExportDownloads";
import type { TrimSizeId } from "@/lib/utils/schemas";
import type { ChapterStatusDb } from "@/types/database.types";

export type { ExportChapterRow, ExportPanelProps };

function isPublishableStatus(status: ChapterStatusDb): boolean {
  return status === "draft" || status === "edited" || status === "approved";
}

export function ExportPanel({
  bookId,
  title,
  genre,
  wordCount,
  chapterCount,
  coverUrl,
  chapters,
  isPro,
}: ExportPanelProps) {
  const {
    compileBusy,
    coverBusy,
    kdpPackBusy,
    compileAndDownload,
    downloadCoverImage,
    downloadKdpPack,
  } = useExportDownloads(bookId, title, coverUrl);

  const [trimSize, setTrimSize] = useState<TrimSizeId>("us-letter");

  const hasPublishableChapter = useMemo(
    () => chapters.some((c) => isPublishableStatus(c.status)),
    [chapters],
  );

  const shareHref = useMemo(() => {
    const t = `Just wrote my book '${title}' with @ChapterAI - check it out!`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`;
  }, [title]);

  return (
    <div className="relative px-4 pb-16 pt-8 text-editorial-cream sm:px-6">
      {hasPublishableChapter ? <ExportConfetti /> : null}

      {chapters.length === 0 ? (
        <div className="relative z-10 mx-auto max-w-xl rounded-2xl border border-dashed border-gold/35 bg-card/50 px-6 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Export</p>
          <h1 className="mt-2 font-serif text-2xl text-editorial-cream sm:text-3xl">No chapters yet</h1>
          <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
            Generate an outline first, then you&apos;ll see chapters here. Once at least one chapter
            has been written, you can compile your manuscript.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={`/projects/${bookId}/outline`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-gold px-6 text-sm font-semibold text-editorial-bg hover:bg-gold/90"
            >
              Go to outline
            </Link>
          </div>
        </div>
      ) : null}

      {chapters.length > 0 && !hasPublishableChapter ? (
        <div className="relative z-10 mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-amber-400/90" aria-hidden />
          <h1 className="mt-4 font-serif text-2xl text-editorial-cream sm:text-3xl">
            No chapters ready for export
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
            Every chapter is still pending. Generate or write at least one chapter and it&apos;ll be
            included in your manuscript automatically.
          </p>
          <Link
            href={`/projects/${bookId}/chapters/${chapters[0]!.id}`}
            className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-gold px-8 text-sm font-semibold text-editorial-bg hover:bg-gold/90"
          >
            Continue writing
          </Link>
        </div>
      ) : null}

      {hasPublishableChapter ? (
        <>
          <header className="relative z-10 text-center">
            <h1 className="font-serif text-3xl text-gold sm:text-4xl">Your Book is Ready</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-editorial-muted">
              Download your manuscript for KDP, grab your cover, and walk through publishing on
              Amazon.
            </p>
          </header>

          <ExportBookSummaryCard
            title={title}
            genre={genre}
            wordCount={wordCount}
            chapterCount={chapterCount}
            coverUrl={coverUrl}
          />

          <ExportChapterChecklist chapters={chapters} />

          <TrimSizeSelector
            value={trimSize}
            onChange={setTrimSize}
            disabled={compileBusy}
          />

          <div className="relative z-10 mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void compileAndDownload(trimSize)}
              disabled={compileBusy}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-gold px-6 text-base font-semibold text-editorial-bg shadow-md transition hover:bg-gold/90 disabled:opacity-60"
            >
              {compileBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Download className="h-5 w-5" aria-hidden />
              )}
              {compileBusy ? "Compiling..." : "Compile & Download Book"}
            </button>
            <button
              type="button"
              onClick={() => void downloadCoverImage()}
              disabled={coverBusy || !coverUrl}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-editorial-muted/40 bg-transparent px-5 text-sm font-medium text-editorial-cream transition hover:border-gold/50 hover:bg-editorial-bg/50 disabled:opacity-50"
            >
              {coverBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Download Cover Image
            </button>
          </div>

          <ExportKDPSection />

          <section className="relative z-10 mx-auto mt-14 max-w-3xl rounded-xl border border-editorial-muted/20 bg-editorial-card/40 p-6 text-center">
            <h2 className="font-serif text-xl text-gold">Tell the world you wrote a book</h2>
            <p className="mt-2 text-sm text-editorial-muted">Share your milestone on X (Twitter).</p>
            <a
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-editorial-muted/40 px-5 py-2.5 text-sm font-medium text-editorial-cream transition hover:border-gold/50 hover:bg-editorial-bg/40"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share on X
            </a>
          </section>
        </>
      ) : (
        <>
          {chapters.length > 0 ? (
            <div className="relative z-10 mx-auto mt-10 max-w-3xl">
              <ExportBookSummaryCard
                title={title}
                genre={genre}
                wordCount={wordCount}
                chapterCount={chapterCount}
                coverUrl={coverUrl}
              />
              <ExportChapterChecklist chapters={chapters} />
            </div>
          ) : null}
        </>
      )}

      <section
        id="kdp-pack"
        className="relative z-10 mx-auto mt-14 max-w-3xl rounded-xl border border-gold/25 bg-gold/5 px-5 py-6 sm:px-6"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-gold/90">
          Amazon KDP
        </p>
        <h2 className="mt-2 font-serif text-xl text-editorial-cream sm:text-2xl">
          KDP listing pack (ZIP) - separate from your manuscript
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
          Download a ZIP with <strong className="text-editorial-cream">AI-assisted</strong> title and
          subtitle ideas, book description, seven keywords, a two-sentence{" "}
          <strong className="text-editorial-cream">About the author</strong> blurb,{" "}
          <strong className="text-editorial-cream">back-of-book</strong> copy for paperbacks, category
          hints, plus a step-by-step{" "}
          <strong className="text-editorial-cream">KDP signup and publish walkthrough</strong>.
        </p>
        <button
          type="button"
          onClick={() => void downloadKdpPack()}
          disabled={kdpPackBusy}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gold/50 bg-editorial-bg/60 px-5 text-sm font-semibold text-gold shadow-sm transition hover:bg-editorial-bg/80 disabled:opacity-60 sm:w-auto"
        >
          {kdpPackBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileArchive className="h-4 w-4" aria-hidden />
          )}
          {kdpPackBusy ? "Building pack..." : "Download KDP listing pack (.zip)"}
        </button>
      </section>

      <AudioExportSection
        bookId={bookId}
        isPro={isPro}
        canGenerate={hasPublishableChapter}
        chapters={chapters}
        defaultCollapsed
      />

      <footer className="relative z-10 mx-auto mt-12 max-w-3xl text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
      </footer>

      <BackToTop />
    </div>
  );
}

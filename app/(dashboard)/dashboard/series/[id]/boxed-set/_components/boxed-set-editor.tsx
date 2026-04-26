"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { upsertSeriesMetadataAction } from "@/app/(dashboard)/dashboard/series/metadata/actions";
import {
  parseFilenameFromDisposition,
  slugFileBase,
} from "@/components/book/export/export-download-utils";
import { TrimSizeSelector } from "@/components/book/export/TrimSizeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Download,
  FileArchive,
  Loader2,
  Save,
} from "@/lib/lucide-icons";
import { useGlobalProgressStore } from "@/stores/global-progress-store";
import type { TrimSizeId } from "@/lib/utils/schemas";

type BookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  word_count: number;
  chapter_count: number;
  cover_url: string | null;
  series_order: number;
};

type ExternalBookRow = {
  id: string;
  title: string;
};

type MetadataState = {
  boxedSetTitle: string | null;
  boxedSetDescription: string | null;
  readingOrderCopyMd: string | null;
  alsoByAuthorMd: string | null;
  dedicationMd: string | null;
  authorNoteMd: string | null;
  newsletterSignupMd: string | null;
  includedBookIds: string[] | null;
};

type Props = {
  series: { id: string; name: string; tagline: string | null };
  books: BookRow[];
  externalBooks: ExternalBookRow[];
  author: { displayName: string; bio: string | null };
  metadata: MetadataState;
};

/* -------------------------------------------------------------------------- */
/*  Defaults / heuristics                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Rough PDF size estimate. KDP paperback PDFs run ~1.5–2 KB/word including
 * embedded fonts and a cover. We warn when the estimated size crosses
 * 200 MB — single-book estimates rarely approach it, but 5+ book boxed sets
 * with dense prose can (per spec lines 322–323).
 */
const PDF_BYTES_PER_WORD = 1800;
const PDF_WARN_THRESHOLD_BYTES = 200 * 1024 * 1024;

function composeReadingOrderDefault(seriesName: string, books: BookRow[]): string {
  const lines = [`## Reading order — ${seriesName}`, ""];
  for (const b of books) {
    lines.push(`${b.series_order}. ${b.title}`);
  }
  return lines.join("\n");
}

function composeAlsoByDefault(external: ExternalBookRow[]): string {
  if (external.length === 0) return "";
  return [
    "**Also available**",
    "",
    ...external.map((b) => `- ${b.title}`),
  ].join("\n");
}

function composeNewsletterDefault(authorName: string): string {
  return [
    "## Stay in the loop",
    "",
    authorName
      ? `Get early access to new releases, bonus chapters, and behind-the-scenes notes from ${authorName}.`
      : "Get early access to new releases, bonus chapters, and behind-the-scenes notes.",
    "",
    "Sign up at **yourauthor.com/newsletter** — one email per month, no spam, unsubscribe anytime.",
  ].join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function BoxedSetEditor({
  series,
  books,
  externalBooks,
  author,
  metadata,
}: Props) {
  // --- Inclusion list --------------------------------------------------------

  // Default selection: persisted list if present, otherwise every book with
  // status = "complete" (matches spec line 311). If no book is marked
  // complete yet, default to all books so the user can still preview a draft
  // boxed set without having to click every checkbox.
  const defaultSelected = useMemo(() => {
    if (metadata.includedBookIds && metadata.includedBookIds.length > 0) {
      return new Set(metadata.includedBookIds);
    }
    const completes = books.filter((b) => b.status === "complete").map((b) => b.id);
    if (completes.length > 0) return new Set(completes);
    return new Set(books.map((b) => b.id));
  }, [books, metadata.includedBookIds]);

  const [selected, setSelected] = useState<Set<string>>(defaultSelected);

  // --- Editable copy blocks --------------------------------------------------

  const [boxedSetTitle, setBoxedSetTitle] = useState(
    metadata.boxedSetTitle ?? `The Complete ${series.name}`,
  );
  const [boxedSetDescription, setBoxedSetDescription] = useState(
    metadata.boxedSetDescription ?? "",
  );
  const [dedication, setDedication] = useState(metadata.dedicationMd ?? "");
  const [authorNote, setAuthorNote] = useState(metadata.authorNoteMd ?? "");
  const [readingOrder, setReadingOrder] = useState(
    metadata.readingOrderCopyMd ?? composeReadingOrderDefault(series.name, books),
  );
  const [aboutAuthor, setAboutAuthor] = useState(author.bio ?? "");
  const [alsoBy, setAlsoBy] = useState(
    metadata.alsoByAuthorMd ?? composeAlsoByDefault(externalBooks),
  );
  const [newsletter, setNewsletter] = useState(
    metadata.newsletterSignupMd ?? composeNewsletterDefault(author.displayName),
  );

  const [trimSize, setTrimSize] = useState<TrimSizeId>("us-trade");
  const [compileBusy, setCompileBusy] = useState(false);

  const [savePending, startSave] = useTransition();

  // --- Derived values --------------------------------------------------------

  const includedBooks = useMemo(
    () => books.filter((b) => selected.has(b.id)),
    [books, selected],
  );

  const totals = useMemo(() => {
    const words = includedBooks.reduce((s, b) => s + (b.word_count ?? 0), 0);
    const chapters = includedBooks.reduce((s, b) => s + (b.chapter_count ?? 0), 0);
    return { words, chapters };
  }, [includedBooks]);

  const estimatedPdfBytes = totals.words * PDF_BYTES_PER_WORD;
  const pdfWarn = estimatedPdfBytes >= PDF_WARN_THRESHOLD_BYTES;

  // --- Handlers --------------------------------------------------------------

  function toggleBook(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllComplete() {
    const completes = books.filter((b) => b.status === "complete").map((b) => b.id);
    setSelected(new Set(completes));
  }

  function selectAll() {
    setSelected(new Set(books.map((b) => b.id)));
  }

  async function saveMetadata() {
    const includedBookIds = Array.from(selected);
    const res = await upsertSeriesMetadataAction(series.id, {
      boxed_set_title: boxedSetTitle.trim() || null,
      boxed_set_description: boxedSetDescription.trim() || null,
      reading_order_copy_md: readingOrder.trim() || null,
      also_by_author_list_md: alsoBy.trim() || null,
      boxed_set_dedication_md: dedication.trim() || null,
      boxed_set_author_note_md: authorNote.trim() || null,
      newsletter_signup_copy_md: newsletter.trim() || null,
      boxed_set_included_book_ids: includedBookIds.length > 0 ? includedBookIds : null,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not save boxed-set details.");
      return;
    }
    toast.success("Saved boxed-set details.");
  }

  async function compile() {
    if (selected.size === 0) {
      toast.error("Pick at least one book to include.");
      return;
    }
    setCompileBusy(true);
    useGlobalProgressStore.getState().start();
    try {
      const res = await fetch("/api/series/compile-boxed-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          seriesId: series.id,
          trimSize,
          includedBookIds: Array.from(selected),
          frontMatter: {
            boxedSetTitle: boxedSetTitle.trim() || null,
            dedicationMd: dedication.trim() || null,
            authorNoteMd: authorNote.trim() || null,
            readingOrderCopyMd: readingOrder.trim() || null,
          },
          backMatter: {
            aboutAuthorMd: aboutAuthor.trim() || null,
            alsoByAuthorMd: alsoBy.trim() || null,
            newsletterSignupMd: newsletter.trim() || null,
          },
        }),
      });

      if (!res.ok) {
        let msg = "Could not compile your boxed set.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      const blob = await res.blob();
      const fromHeader = parseFilenameFromDisposition(res.headers.get("Content-Disposition"));
      const name = fromHeader ?? `${slugFileBase(boxedSetTitle || series.name)}-boxed-set.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Boxed set compiled · ${formatBytes(blob.size)}`);
    } catch {
      toast.error("Network error while compiling the boxed set.");
    } finally {
      useGlobalProgressStore.getState().stop();
      setCompileBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
        <Link href="/dashboard" className="text-gold hover:underline">
          Library
        </Link>{" "}
        /{" "}
        <Link href="/dashboard/series" className="text-gold hover:underline">
          Series
        </Link>{" "}
        /{" "}
        <Link
          href={`/dashboard/series/${series.id}`}
          className="text-gold hover:underline"
        >
          {series.name}
        </Link>{" "}
        / Boxed set
      </p>

      <header className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-editorial-cream">
            Boxed-set compilation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-editorial-muted">
            Combine the books in <strong>{series.name}</strong> into a single
            download with shared front- and back-matter. Every field is
            optional — we fall back to sensible defaults.
          </p>
        </div>
        <Link
          href={`/dashboard/series/${series.id}`}
          className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> Back to series
        </Link>
      </header>

      {/* ------------------ Book selection --------------------------- */}

      <section className="mt-8 rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg text-editorial-cream">
              Books in this boxed set
            </h2>
            <p className="text-xs text-editorial-muted">
              Defaults to books marked <em>complete</em>. Order is fixed by the
              series reading order.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllComplete}
              className="rounded-md border border-border/60 px-3 py-1.5 text-xs text-editorial-cream transition hover:border-gold/50 hover:bg-editorial-bg/50"
            >
              Only complete
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md border border-border/60 px-3 py-1.5 text-xs text-editorial-cream transition hover:border-gold/50 hover:bg-editorial-bg/50"
            >
              Select all
            </button>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {books.map((b) => {
            const checked = selected.has(b.id);
            return (
              <li
                key={b.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
                  checked
                    ? "border-gold/40 bg-gold/5"
                    : "border-border/60 bg-background/40"
                }`}
              >
                <input
                  id={`b-${b.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBook(b.id)}
                  className="h-4 w-4 accent-gold"
                />
                <div className="flex h-12 w-9 shrink-0 overflow-hidden rounded-sm bg-editorial-card/60">
                  {b.cover_url ? (
                    <Image
                      src={b.cover_url}
                      alt=""
                      width={36}
                      height={48}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="m-auto text-[10px] text-editorial-muted">
                      no cover
                    </span>
                  )}
                </div>
                <label htmlFor={`b-${b.id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm text-editorial-cream">
                      #{b.series_order} {b.title}
                    </span>
                    <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted">
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-editorial-muted">
                    {b.chapter_count} chapter{b.chapter_count === 1 ? "" : "s"} ·{" "}
                    {(b.word_count ?? 0).toLocaleString()} words
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-editorial-muted">
          <span>
            <strong className="text-editorial-cream">
              {includedBooks.length}
            </strong>{" "}
            of {books.length} books
          </span>
          <span>
            <strong className="text-editorial-cream">
              {totals.chapters}
            </strong>{" "}
            chapters
          </span>
          <span>
            <strong className="text-editorial-cream">
              {totals.words.toLocaleString()}
            </strong>{" "}
            words
          </span>
        </div>
      </section>

      {/* ------------------ Front matter ----------------------------- */}

      <section className="mt-8 rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="font-serif text-lg text-editorial-cream">
          Shared front matter
        </h2>
        <p className="text-xs text-editorial-muted">
          The title, copyright, reading-order, dedication, and author-note
          pages rendered at the start of the boxed set.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <Label htmlFor="bs-title">Series title page</Label>
            <Input
              id="bs-title"
              className="mt-1"
              value={boxedSetTitle}
              onChange={(e) => setBoxedSetTitle(e.target.value)}
              placeholder={`The Complete ${series.name}`}
            />
            <p className="mt-1 text-[11px] text-editorial-muted">
              Auto-populated — edit to taste. Appears on the title page and in
              the file name.
            </p>
          </div>

          <div>
            <Label htmlFor="bs-ro">Reading-order page</Label>
            <textarea
              id="bs-ro"
              className="mt-1 w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={readingOrder}
              onChange={(e) => setReadingOrder(e.target.value)}
              placeholder="## Reading order\n\n1. Book One\n2. Book Two"
            />
            <p className="mt-1 text-[11px] text-editorial-muted">
              Markdown. Include cover thumbnails or blurbs here if you want
              them on the reading-order page.
            </p>
          </div>

          <div>
            <Label htmlFor="bs-ded">Series-level dedication</Label>
            <textarea
              id="bs-ded"
              className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              placeholder={`For every reader who stayed with ${series.name} to the final page.`}
            />
          </div>

          <div>
            <Label htmlFor="bs-note">Author note / preface</Label>
            <textarea
              id="bs-note"
              className="mt-1 w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={authorNote}
              onChange={(e) => setAuthorNote(e.target.value)}
              placeholder={`When I first sat down to write ${series.name}…`}
            />
          </div>

          <div>
            <Label htmlFor="bs-desc">Boxed-set blurb (optional)</Label>
            <textarea
              id="bs-desc"
              className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={boxedSetDescription}
              onChange={(e) => setBoxedSetDescription(e.target.value)}
              placeholder="Marketing blurb for the boxed-set edition (KDP / Amazon description)."
            />
            <p className="mt-1 text-[11px] text-editorial-muted">
              Not rendered in the DOCX — saved for KDP/Amazon listing later.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------ Back matter ------------------------------ */}

      <section className="mt-8 rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="font-serif text-lg text-editorial-cream">
          Shared back matter
        </h2>
        <p className="text-xs text-editorial-muted">
          Combined author bio, "also by" cross-promo, and newsletter signup
          appended to the end of the boxed set.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <Label htmlFor="bs-ab">About the author</Label>
            <textarea
              id="bs-ab"
              className="mt-1 w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={aboutAuthor}
              onChange={(e) => setAboutAuthor(e.target.value)}
              placeholder="Pulled from your profile bio. Expand with awards, location, forthcoming work, etc."
            />
            <p className="mt-1 text-[11px] text-editorial-muted">
              Pre-filled from your profile bio. Edits here apply only to this
              boxed-set export.
            </p>
          </div>

          <div>
            <Label htmlFor="bs-also">Also by this author</Label>
            <textarea
              id="bs-also"
              className="mt-1 w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={alsoBy}
              onChange={(e) => setAlsoBy(e.target.value)}
              placeholder="- Other series: Book One\n- Standalone novella"
            />
            {externalBooks.length > 0 ? (
              <p className="mt-1 text-[11px] text-editorial-muted">
                Pre-filled with {externalBooks.length} book
                {externalBooks.length === 1 ? "" : "s"} from outside this
                series.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-editorial-muted">
                You have no books outside this series yet — add cross-promos
                manually.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bs-nl">Newsletter signup pitch</Label>
            <textarea
              id="bs-nl"
              className="mt-1 w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newsletter}
              onChange={(e) => setNewsletter(e.target.value)}
              placeholder="Sign up at yourauthor.com/newsletter"
            />
            <p className="mt-1 text-[11px] text-editorial-muted">
              Editable template. Replace the placeholder URL with your mailing
              list before you publish.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------ Save + compile --------------------------- */}

      <div className="sticky bottom-4 mt-8 flex flex-col gap-2 rounded-xl border border-border/60 bg-background/80 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={savePending}
          onClick={() => startSave(() => void saveMetadata())}
          className="gap-1.5"
        >
          {savePending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </Button>
      </div>

      {/* ------------------ Export ----------------------------------- */}

      <TrimSizeSelector
        value={trimSize}
        onChange={setTrimSize}
        disabled={compileBusy}
      />

      {pdfWarn ? (
        <aside className="relative z-10 mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-5 py-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-medium text-amber-100">
              Large PDF likely (~
              {(estimatedPdfBytes / 1024 / 1024).toFixed(0)} MB est.)
            </p>
            <p className="mt-1 text-xs text-amber-100/80">
              EPUB boxed sets stay small (2–5 MB). Interior PDFs for a
              {" "}{includedBooks.length}-book set with {totals.words.toLocaleString()} words
              can exceed 200 MB — consider shipping EPUB first and keeping
              print-interior PDF per-book instead of as a single compile.
            </p>
          </div>
        </aside>
      ) : null}

      <section className="relative z-10 mx-auto mt-6 max-w-3xl rounded-xl border border-gold/25 bg-gold/5 px-5 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
            <BookOpen className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold/90">
              Export
            </p>
            <h3 className="mt-0.5 font-serif text-lg text-editorial-cream sm:text-xl">
              Compile the boxed set
            </h3>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
          Bundles every selected book into a single manuscript with shared
          front- and back-matter. Delivered as <strong>.docx</strong> — the
          same format as single-book exports, ready to upload to KDP or
          convert to EPUB / PDF with the tool of your choice.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={compileBusy || selected.size === 0}
            onClick={() => void compile()}
            className="gap-2"
          >
            {compileBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            {compileBusy
              ? "Compiling…"
              : `Compile boxed set (.docx)`}
          </Button>
          <span
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs text-editorial-muted"
            title="EPUB / PDF / KDP pack for boxed sets coming soon — use the single-book export for now."
          >
            <FileArchive className="h-3.5 w-3.5" aria-hidden />
            EPUB · PDF · KDP pack (coming soon)
          </span>
        </div>
      </section>

      <footer className="relative z-10 mx-auto mt-12 max-w-3xl text-center">
        <Link
          href={`/dashboard/series/${series.id}`}
          className="inline-flex items-center gap-2 text-sm text-gold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to series
        </Link>
      </footer>
    </div>
  );
}

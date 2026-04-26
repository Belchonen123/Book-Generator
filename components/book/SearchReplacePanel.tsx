"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { replaceInChapterAction } from "@/app/(dashboard)/projects/[id]/chapters/replace-in-chapter-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "@/lib/lucide-icons";
import { useBook } from "@/hooks/useBook";
import { cn } from "@/lib/utils/cn";
import type { Editor } from "@tiptap/core";
import {
  type BookTextSearchOptions,
  applyTextReplace,
  buildAllMatchesInText,
  contextAround,
} from "@/lib/utils/book-text-search";

export type BookSearchHit = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** 0-based index of this match among all matches in this chapter. */
  indexInChapter: number;
  matchText: string;
  context: string;
};

type SearchReplacePanelProps = {
  bookId: string;
  currentChapterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro: boolean;
  editor: Editor | null;
  /** Replace all matches in the open editor’s markdown (book search options). */
  onApplyReplaceInCurrentChapter: (
    find: string,
    replace: string,
    options: BookTextSearchOptions,
  ) => Promise<void>;
  /**
   * Jump the in-chapter find bar to a literal query and select match index
   * (for current chapter when search is non-regex; best effort otherwise).
   */
  onOpenInChapterFind: (
    query: string,
    caseSensitive: boolean,
    matchIndex: number,
  ) => void;
};

function groupByChapter(
  list: { hit: BookSearchHit; globalIndex: number }[],
): Map<string, { title: string; number: number; items: BookSearchHit[] }> {
  const m = new Map<string, { title: string; number: number; items: BookSearchHit[] }>();
  for (const { hit } of list) {
    const e = m.get(hit.chapterId) ?? {
      title: hit.chapterTitle,
      number: hit.chapterNumber,
      items: [],
    };
    e.items.push(hit);
    m.set(hit.chapterId, e);
  }
  return m;
}

export function SearchReplacePanel({
  bookId,
  currentChapterId,
  open,
  onOpenChange,
  isPro,
  editor,
  onApplyReplaceInCurrentChapter,
  onOpenInChapterFind,
}: SearchReplacePanelProps) {
  const router = useRouter();
  const { chapters, currentBook, loadBook } = useBook();
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [polishAfter, setPolishAfter] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [replaceAllBusy, setReplaceAllBusy] = useState(false);
  const [polishBusyIds, setPolishBusyIds] = useState<Set<string>>(() => new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (currentBook?.id === bookId && chapters.length > 0) {
      return;
    }
    setSearchBusy(true);
    setLoadError(null);
    void loadBook(bookId)
      .catch((e: Error) => {
        setLoadError(e.message || "Could not load book.");
      })
      .finally(() => {
        setSearchBusy(false);
      });
  }, [open, bookId, currentBook?.id, chapters.length, loadBook]);

  const options: BookTextSearchOptions = useMemo(
    () => ({ caseSensitive, wholeWord, useRegex }),
    [caseSensitive, wholeWord, useRegex],
  );

  const hits = useMemo(() => {
    if (!find.trim() && !useRegex) return [] as BookSearchHit[];
    const out: BookSearchHit[] = [];
    for (const ch of chapters) {
      const content = ch.content ?? "";
      const title = ch.title || `Chapter ${ch.chapter_number}`;
      const partMatches = buildAllMatchesInText(content, find, options);
      partMatches.forEach((m, i) => {
        out.push({
          chapterId: ch.id,
          chapterNumber: ch.chapter_number,
          chapterTitle: title,
          indexInChapter: i,
          matchText: m.matchText,
          context: contextAround(content, m.start, m.end),
        });
      });
    }
    return out;
  }, [chapters, find, options, useRegex]);

  const grouped = useMemo(() => {
    const list = hits.map((hit, globalIndex) => ({ hit, globalIndex }));
    return groupByChapter(list);
  }, [hits]);

  const onJump = useCallback(
    (hit: BookSearchHit) => {
      if (hit.chapterId !== currentChapterId) {
        router.push(`/projects/${bookId}/chapters/${hit.chapterId}`);
        onOpenChange(false);
        return;
      }
      if (useRegex) {
        onOpenInChapterFind(hit.matchText, true, hit.indexInChapter);
        return;
      }
      onOpenInChapterFind(find, caseSensitive, hit.indexInChapter);
    },
    [
      bookId,
      caseSensitive,
      currentChapterId,
      find,
      onOpenChange,
      onOpenInChapterFind,
      router,
      useRegex,
    ],
  );

  const onReplaceInCurrent = useCallback(async () => {
    if (!find.trim() && !useRegex) {
      toast.error("Enter a search term.");
      return;
    }
    try {
      await onApplyReplaceInCurrentChapter(find, replace, options);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed.");
    }
  }, [find, onApplyReplaceInCurrentChapter, options, replace, useRegex]);

  const onReplaceEntireBook = useCallback(async () => {
    if (!find.trim() && !useRegex) {
      toast.error("Enter a search term.");
      return;
    }
    if (chapters.length === 0) {
      toast.error("Chapters are not loaded yet.");
      return;
    }
    if (
      !confirm(
        "Replace in every chapter? This will save changes for each chapter and cannot be fully undone in one step.",
      )
    ) {
      return;
    }

    setReplaceAllBusy(true);
    setPolishBusyIds(new Set());
    try {
      const mutations: {
        id: string;
        before: string;
        after: string;
        count: number;
      }[] = [];

      for (const ch of chapters) {
        const content = ch.content ?? "";
        const { next, count } = applyTextReplace(content, find, replace, options);
        if (count === 0) continue;
        mutations.push({ id: ch.id, before: content, after: next, count });
      }

      if (mutations.length === 0) {
        toast.info("No matches in any chapter.");
        return;
      }

      for (const m of mutations) {
        const r = await replaceInChapterAction(bookId, m.id, m.after);
        if (!r.ok) {
          throw new Error(r.error ?? "Save failed.");
        }
      }

      toast.success(
        `Updated ${mutations.length} chapter${mutations.length === 1 ? "" : "s"}.`,
      );
      void loadBook(bookId);
      router.refresh();

      if (polishAfter && isPro) {
        for (const m of mutations) {
          setPolishBusyIds((prev) => new Set(prev).add(m.id));
          const res = await fetch("/api/ai/polish-replacements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookId,
              chapterId: m.id,
              originalText: m.before,
              replacedText: m.after,
              oldPhrase: find,
              newPhrase: replace,
            }),
          });
          const data = (await res.json().catch(() => null)) as
            | { content?: string; error?: string; code?: string }
            | null;
          if (!res.ok) {
            toast.error(data?.error ?? "Polish request failed.");
            setPolishBusyIds((prev) => {
              const n = new Set(prev);
              n.delete(m.id);
              return n;
            });
            break;
          }
          if (!data?.content) {
            toast.error("Polish returned empty text.");
            setPolishBusyIds((prev) => {
              const n = new Set(prev);
              n.delete(m.id);
              return n;
            });
            break;
          }
          const r2 = await replaceInChapterAction(bookId, m.id, data.content);
          if (!r2.ok) {
            toast.error(r2.error ?? "Could not save polished chapter.");
            setPolishBusyIds((prev) => {
              const n = new Set(prev);
              n.delete(m.id);
              return n;
            });
            break;
          }
          setPolishBusyIds((prev) => {
            const n = new Set(prev);
            n.delete(m.id);
            return n;
          });
        }
        void loadBook(bookId);
        router.refresh();
        toast.success("Polish pass finished.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed.");
    } finally {
      setReplaceAllBusy(false);
    }
  }, [
    bookId,
    caseSensitive,
    chapters,
    find,
    isPro,
    loadBook,
    options,
    polishAfter,
    replace,
    router,
    useRegex,
  ]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-black/40"
        aria-label="Close book search"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-editorial-bg shadow-xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Search and replace in book"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h2 className="font-serif text-lg font-semibold text-gold">Search in book</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          {searchBusy && chapters.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-editorial-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading book…
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="book-find">Search</Label>
            <Input
              id="book-find"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Search…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-replace">Replace with</Label>
            <Input
              id="book-replace"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace…"
            />
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1.5 text-editorial-cream">
              <input
                type="checkbox"
                className="accent-gold"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Case-sensitive
            </label>
            <label className="flex items-center gap-1.5 text-editorial-cream">
              <input
                type="checkbox"
                className="accent-gold"
                checked={wholeWord}
                onChange={(e) => {
                  if (e.target.checked) setUseRegex(false);
                  setWholeWord(e.target.checked);
                }}
                disabled={useRegex}
              />
              Whole word
            </label>
            <label className="flex items-center gap-1.5 text-editorial-cream">
              <input
                type="checkbox"
                className="accent-gold"
                checked={useRegex}
                onChange={(e) => {
                  if (e.target.checked) {
                    setWholeWord(false);
                  }
                  setUseRegex(e.target.checked);
                }}
              />
              Regex
            </label>
            <label
              className={cn(
                "flex items-center gap-1.5",
                isPro ? "text-editorial-cream" : "text-editorial-muted",
              )}
            >
              <input
                type="checkbox"
                className="accent-gold"
                checked={polishAfter && isPro}
                onChange={(e) => setPolishAfter(e.target.checked)}
                disabled={!isPro}
              />
              Polish awkward sentences after replace
              {!isPro ? " (Pro)" : null}
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void onReplaceInCurrent()}
              disabled={replaceAllBusy || !editor}
            >
              Replace in current chapter
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-gold text-editorial-bg hover:bg-gold/90"
              onClick={() => void onReplaceEntireBook()}
              disabled={replaceAllBusy}
            >
              {replaceAllBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                "Replace all"
              )}
            </Button>
          </div>

          <div>
            <p className="text-xs text-editorial-muted">
              {hits.length} match{hits.length === 1 ? "" : "es"}{" "}
              {polishAfter && isPro
                ? "· Pro polish runs up to 5 times per hour (rate-limited)."
                : null}
            </p>
          </div>

          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([chapterId, g]) => (
              <div key={chapterId} className="rounded-lg border border-border/50 bg-card/30 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-gold/90">
                    {g.number}. {g.title}
                  </h3>
                  {polishBusyIds.has(chapterId) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-editorial-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Polishing…
                    </span>
                  ) : null}
                </div>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-editorial-muted">
                  {g.items.map((h) => (
                    <li key={`${h.chapterId}-${h.indexInChapter}`}>
                      <button
                        type="button"
                        onClick={() => onJump(h)}
                        className="w-full text-left text-editorial-cream/90 hover:underline"
                      >
                        {h.context}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

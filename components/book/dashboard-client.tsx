"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Hash,
  PenLine,
  Sparkles,
  Type,
} from "@/lib/lucide-icons";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createBookAction,
  loadMoreDashboardBooksAction,
} from "@/app/(dashboard)/dashboard/actions";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Button } from "@/components/ui/button";
import { FREE_BOOK_LIMIT } from "@/lib/subscription/limits";
import type { SubscriptionTierDb } from "@/types/database.types";
import type { DashboardBook } from "@/types/book.types";

import { CreateSeriesModal } from "@/components/dashboard/CreateSeriesModal";
import { ProjectCard } from "./ProjectCard";

const OnboardingModal = dynamic(
  () => import("@/components/book/OnboardingModal").then((m) => m.OnboardingModal),
  { ssr: false, loading: () => null },
);

const ExampleBookModal = dynamic(
  () => import("@/components/book/ExampleBookModal").then((m) => m.ExampleBookModal),
  { ssr: false, loading: () => null },
);

export type DashboardLifetimeStats = {
  totalBooks: number;
  totalWordsWritten: number;
  chaptersGenerated: number;
  booksCompleted: number;
};

type DashboardClientProps = {
  books: DashboardBook[];
  seriesOptions: { id: string; name: string }[];
  hasMoreBooks: boolean;
  subscriptionTier: SubscriptionTierDb;
  bookCount: number;
  freeBookLimit: number;
  hasSeenOnboarding: boolean;
  greetingName: string;
  stats: DashboardLifetimeStats;
};

export function DashboardClient({
  books: initialBooks,
  seriesOptions,
  hasMoreBooks: initialHasMore,
  subscriptionTier,
  bookCount,
  freeBookLimit,
  hasSeenOnboarding,
  greetingName,
  stats,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notified = useRef(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding);
  const [isPending, startTransition] = useTransition();
  const [pagedBooks, setPagedBooks] = useState(initialBooks);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);
  const [createSeriesOpen, setCreateSeriesOpen] = useState(false);

  useEffect(() => {
    setShowOnboarding(!hasSeenOnboarding);
  }, [hasSeenOnboarding]);

  useEffect(() => {
    setPagedBooks(initialBooks);
    setHasMore(initialHasMore);
  }, [initialBooks, initialHasMore]);

  useEffect(() => {
    if (notified.current) {
      return;
    }
    const upgraded = searchParams.get("upgraded");
    if (upgraded === "true") {
      notified.current = true;
      toast.success("Welcome to Pro!", {
        description: "You now have unlimited books and chapter generation.",
      });
      router.replace("/dashboard", { scroll: false });
      return;
    }
    const err = searchParams.get("error");
    if (!err) {
      return;
    }
    notified.current = true;
    if (err === "limit") {
      toast.warning("You have reached the Free plan limit of three books.", {
        description:
          "Upgrade to Pro for unlimited projects, or delete a book to continue.",
      });
    } else if (err === "create") {
      toast.error("We could not create a new book. Please try again.");
    } else if (err === "profile") {
      toast.error("Your profile could not be loaded. Try refreshing the page.");
    } else if (err === "series") {
      toast.error("Series is a Pro feature.", { description: "Upgrade to Pro to open series tools." });
    }
    router.replace("/dashboard", { scroll: false });
  }, [router, searchParams]);

  const isFree = subscriptionTier === "free";
  const isPro = subscriptionTier === "pro";
  const slotsLabel = `${Math.min(bookCount, freeBookLimit)} of ${freeBookLimit} books used`;

  const { seriesGroups, standaloneBooks } = useMemo((): {
    seriesGroups: { id: string; name: string; books: DashboardBook[] }[];
    standaloneBooks: DashboardBook[];
  } => {
    const map = new Map<string, { name: string; books: DashboardBook[] }>();
    const stand: DashboardBook[] = [];
    for (const b of pagedBooks) {
      if (!b.seriesId) {
        stand.push(b);
        continue;
      }
      const g = map.get(b.seriesId) ?? { name: b.seriesName ?? "Series", books: [] };
      g.books.push(b);
      if (b.seriesName) g.name = b.seriesName;
      map.set(b.seriesId, g);
    }
    Array.from(map.values()).forEach((g) => {
      g.books.sort(
        (a: DashboardBook, c: DashboardBook) => (a.seriesOrder ?? 0) - (c.seriesOrder ?? 0),
      );
    });
    const groups = Array.from(map.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, g]) => ({ id, ...g }));
    stand.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return { seriesGroups: groups, standaloneBooks: stand };
  }, [pagedBooks]);

  const handleCreateBook = () => {
    if (isFree && bookCount >= FREE_BOOK_LIMIT) {
      setUpgradeOpen(true);
      return;
    }
    startTransition(() => {
      void createBookAction();
    });
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const handleLoadMore = async () => {
    setLoadMoreBusy(true);
    try {
      const { books: next, hasMore: more } = await loadMoreDashboardBooksAction(pagedBooks.length);
      setPagedBooks((prev) => [...prev, ...next]);
      setHasMore(more);
    } catch {
      toast.error("Could not load more books.");
    } finally {
      setLoadMoreBusy(false);
    }
  };

  return (
    <>
      <OnboardingModal open={showOnboarding} onClose={handleOnboardingClose} />
      <ExampleBookModal open={exampleOpen} onClose={() => setExampleOpen(false)} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <CreateSeriesModal
          open={createSeriesOpen}
          onClose={() => setCreateSeriesOpen(false)}
          isPro={isPro}
        />
        <ProUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Upgrade to Pro for unlimited books"
          description="The Free plan includes up to three manuscripts. Upgrade to Pro to start your fourth book and unlock unlimited chapter generation."
        />

        <div className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-editorial-cream sm:text-4xl">
              Your library
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-editorial-muted">
              Every row is a manuscript in motion—from first spark to export-ready chapters.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-editorial-muted">
              <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-editorial-cream">
                Plan:{" "}
                <span className="text-gold">{subscriptionTier === "pro" ? "Pro" : "Free"}</span>
              </span>
              {isFree ? (
                <span className="rounded-full border border-border bg-card/60 px-3 py-1">
                  {slotsLabel}
                </span>
              ) : (
                <span className="rounded-full border border-border bg-card/60 px-3 py-1">
                  Unlimited books
                </span>
              )}
            </div>
          </div>
          {bookCount > 0 ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {isPro ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gold/50 text-gold hover:bg-gold/10 sm:w-auto"
                  onClick={() => setCreateSeriesOpen(true)}
                >
                  Create series
                </Button>
              ) : null}
              <Button
                type="button"
                className="w-full shrink-0 bg-gold font-semibold text-editorial-bg hover:bg-gold/90 sm:w-auto"
                disabled={isPending}
                onClick={() => handleCreateBook()}
              >
                {isPending ? "Creating…" : "New Book"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border/70 bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <BookMarked className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Books created
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">{stats.totalBooks}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Type className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Words written
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">
                {stats.totalWordsWritten.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Hash className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Chapters generated
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">
                {stats.chaptersGenerated.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                Books completed
              </p>
              <p className="mt-0.5 font-serif text-2xl text-editorial-cream">{stats.booksCompleted}</p>
            </div>
          </div>
        </div>

        {stats.totalBooks === 0 ? (
          <section className="mt-12 rounded-3xl border border-gold/25 bg-gradient-to-b from-card/80 via-editorial-bg/90 to-editorial-bg px-6 py-12 sm:px-10 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Let&apos;s begin
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-editorial-cream sm:text-4xl">
                Welcome to ChapterAI, {greetingName}!
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-editorial-muted">
                You&apos;re one click away from your first manuscript. We&apos;ll help you shape the
                idea, draft every chapter, design a cover, and export for Amazon KDP.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Pitch your idea",
                  body: "Tell us what you want to write—genre, mood, or a messy paragraph.",
                },
                {
                  step: "2",
                  title: "Generate chapters",
                  body: "Approve an outline, then draft and refine each chapter in the studio.",
                },
                {
                  step: "3",
                  title: "Publish on Amazon",
                  body: "Export a KDP-ready Word file, cover art, and a personalized checklist.",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-border/70 bg-card/50 p-5 text-left shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-serif text-lg text-editorial-cream">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-editorial-muted">{item.body}</p>
                  {i < 2 ? (
                    <ArrowRight
                      className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-gold/50 sm:block"
                      aria-hidden
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-4">
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleCreateBook()}
                className="animate-chapterai-cta h-14 min-w-[260px] rounded-xl bg-gold px-10 text-base font-semibold text-editorial-bg shadow-lg hover:bg-gold/90 sm:h-16 sm:min-w-[300px] sm:text-lg"
              >
                {isPending ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-pulse" aria-hidden />
                    Creating your workspace…
                  </>
                ) : (
                  <>
                    <PenLine className="mr-2 h-5 w-5" aria-hidden />
                    Write Your First Book
                  </>
                )}
              </Button>
              <button
                type="button"
                className="text-sm text-gold/90 underline-offset-4 transition hover:text-gold hover:underline"
                onClick={() => setExampleOpen(true)}
              >
                See an example
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="mt-10 space-y-10">
              {seriesGroups.map((g) => (
                <section key={g.id}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-xl text-editorial-cream">{g.name}</h2>
                    <Link
                      prefetch
                      href={`/dashboard/series/${g.id}`}
                      className="text-sm text-gold hover:underline"
                    >
                      Open series
                    </Link>
                  </div>
                  <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {g.books.map((book) => (
                      <li key={book.id}>
                        <ProjectCard book={book} seriesOptions={seriesOptions} isPro={isPro} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {standaloneBooks.length > 0 ? (
                <section>
                  <h2 className="mb-3 font-serif text-xl text-editorial-muted">Standalones</h2>
                  <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {standaloneBooks.map((book) => (
                      <li key={book.id}>
                        <ProjectCard book={book} seriesOptions={seriesOptions} isPro={isPro} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border text-editorial-cream hover:bg-muted/40"
                  disabled={loadMoreBusy}
                  onClick={() => void handleLoadMore()}
                >
                  {loadMoreBusy ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

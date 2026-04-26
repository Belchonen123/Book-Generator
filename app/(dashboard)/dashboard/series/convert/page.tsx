import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { BookStatusDb } from "@/types/database.types";

import { ConvertWizard, type StandaloneBookRow } from "./_components/convert-wizard";

export const metadata = {
  title: "Convert books to a series — ChapterAI",
  robots: { index: false, follow: false },
};

/**
 * Guided wizard for turning multiple standalone projects into a single
 * series (Prompt 16 § 348-359). Server-side we only load the list of
 * eligible standalone books + codex counts so the user can make informed
 * selections. Everything downstream (codex-diff, merge decisions, final
 * write) happens via the `actions.ts` server actions.
 */
export default async function ConvertSeriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = profileRow?.subscription_tier === "pro";

  // Only books owned by the user that are not already attached to a series
  // qualify — merging books that already share a series would be a
  // different operation (and requires a different UX).
  const { data: books } = await supabase
    .from("books")
    .select(
      "id, title, subtitle, cover_url, status, word_count, updated_at",
    )
    .eq("user_id", user.id)
    .is("series_id", null)
    .order("updated_at", { ascending: false });

  const bookIds = (books ?? []).map((b) => b.id);

  const [{ data: chapterRows }, { data: codexRows }] = await Promise.all([
    bookIds.length
      ? supabase.from("chapters").select("book_id").in("book_id", bookIds)
      : Promise.resolve({ data: [] as { book_id: string }[] }),
    bookIds.length
      ? supabase
          .from("codex_entries")
          .select("book_id")
          .eq("user_id", user.id)
          .in("book_id", bookIds)
      : Promise.resolve({ data: [] as { book_id: string }[] }),
  ]);

  const chapterCountBy = new Map<string, number>();
  for (const r of chapterRows ?? []) {
    const id = r.book_id as string;
    chapterCountBy.set(id, (chapterCountBy.get(id) ?? 0) + 1);
  }
  const codexCountBy = new Map<string, number>();
  for (const r of codexRows ?? []) {
    const id = r.book_id as string;
    codexCountBy.set(id, (codexCountBy.get(id) ?? 0) + 1);
  }

  const rows: StandaloneBookRow[] = (books ?? []).map((b) => ({
    id: b.id,
    title: b.title ?? "Untitled",
    subtitle: b.subtitle ?? null,
    cover_url: b.cover_url ?? null,
    status: (b.status ?? "idea") as BookStatusDb,
    word_count: b.word_count ?? 0,
    chapterCount: chapterCountBy.get(b.id) ?? 0,
    codexCount: codexCountBy.get(b.id) ?? 0,
    updated_at: b.updated_at,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
        <Link href="/dashboard" className="text-gold hover:underline">
          Library
        </Link>{" "}
        /{" "}
        <Link href="/dashboard/series" className="text-gold hover:underline">
          Series
        </Link>{" "}
        / Convert
      </p>
      <h1 className="mt-2 font-serif text-3xl text-editorial-cream">
        Convert standalone books to a series
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-editorial-muted">
        Pick two or more finished or in-progress projects and we&apos;ll run a
        codex-diff to find entries that look like the same character or
        location across books. You choose which versions become canonical;
        the rest become per-book overlays.
      </p>

      {!isPro ? (
        <div className="mt-8 rounded-lg border border-border/60 bg-card/40 p-6">
          <h2 className="font-serif text-xl text-editorial-cream">
            Series is a Pro feature
          </h2>
          <p className="mt-2 text-sm text-editorial-muted">
            Upgrade to convert existing projects into a series and share
            characters, world notes, and arcs across every book.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-editorial-bg hover:bg-gold/90"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      ) : rows.length < 2 ? (
        <div className="mt-8 rounded-lg border border-border/60 bg-card/40 p-6">
          <h2 className="font-serif text-xl text-editorial-cream">
            Not enough standalone books
          </h2>
          <p className="mt-2 text-sm text-editorial-muted">
            You need at least two books that aren&apos;t already in a series.
            {rows.length === 0
              ? " Drafting a few projects first will unlock this wizard."
              : " One more project and you&apos;re good to go."}
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="text-xs text-gold hover:underline"
            >
              Back to library
            </Link>
          </div>
        </div>
      ) : (
        <ConvertWizard books={rows} />
      )}
    </div>
  );
}

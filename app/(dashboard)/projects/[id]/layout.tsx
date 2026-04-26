import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectProgressStepper } from "@/components/book/ProjectProgressStepper";
import { ProjectBookProvider } from "@/components/layout/project-book-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { SeriesKeyboardShortcuts } from "@/components/series/SeriesKeyboardShortcuts";
import { resolveChapterEntryId } from "@/lib/book/project-entry";
import { createClient } from "@/lib/supabase/server";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";
import type { BookTypeDb } from "@/types/database.types";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();

  const { data: book, error } = await supabase
    .from("books")
    .select("title")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !book) {
    return {
      title: "Project",
      robots: { index: false, follow: false },
    };
  }

  const rawTitle = book.title?.trim() || "Untitled";
  const safeTitle =
    rawTitle.length > 70 ? `${rawTitle.slice(0, 67).trimEnd()}…` : rawTitle;
  const writingTitle = `Writing: ${safeTitle}`;
  const desc = `Continue “${safeTitle}” in ChapterAI — outline, draft chapters, cover, and export.`;

  const path = `/projects/${params.id}`;
  const base = siteUrlString();

  return {
    title: writingTitle,
    description: desc,
    alternates: {
      canonical: path,
    },
    robots: { index: false, follow: false },
    openGraph: {
      title: `${writingTitle} | ChapterAI`,
      description: desc,
      url: `${base}${path}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${writingTitle} | ChapterAI`,
      description: desc,
      images: [`${metadataBaseUrl().origin}/og-image.png`],
    },
  };
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: book, error }, firstChapterIdPromise] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, status, book_type, series_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    resolveChapterEntryId(supabase, params.id),
  ]);

  if (error || !book) {
    notFound();
  }

  /** Same target as `project-entry-content` when sending users into the editor — not merely chapter 1. */
  const firstChapterId = firstChapterIdPromise;

  return (
    <ProjectBookProvider
      value={{
        bookId: book.id,
        bookTitle: book.title?.trim() || "Untitled",
        bookStatus: book.status,
        firstChapterId,
        bookType: (book.book_type ?? "fiction") as BookTypeDb,
        seriesId: book.series_id ?? null,
      }}
    >
      <div className="flex min-h-screen w-full flex-col bg-editorial-bg">
        <ProjectProgressStepper bookStatus={book.status} />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
      <SeriesKeyboardShortcuts seriesId={book.series_id ?? null} />
    </ProjectBookProvider>
  );
}

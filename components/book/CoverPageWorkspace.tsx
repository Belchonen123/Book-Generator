"use client";

import { useState } from "react";

import { AboutAuthorPanel } from "@/components/book/AboutAuthorPanel";
import { BackCoverCopyPanel } from "@/components/book/BackCoverCopyPanel";
import { BookMetadataPanel } from "@/components/book/BookMetadataPanel";
import { CoverGeneratorLazy } from "@/components/book/heavy-panels";
import type { Json } from "@/types/database.types";

type CoverMetadata = {
  title: string;
  subtitle: string | null;
  authorDisplayName: string | null;
};

export type CoverPageWorkspaceProps = {
  book: {
    id: string;
    title: string;
    subtitle: string | null;
    author_display_name: string | null;
    genre: string | null;
    refined_idea: Json | null;
    tone: string | null;
    cover_url: string | null;
    cover_prompt: string | null;
    back_cover_copy: string | null;
    about_author: string | null;
  };
  profile: {
    full_name: string | null;
    bio: string | null;
    pen_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function CoverPageWorkspace({ book, profile }: CoverPageWorkspaceProps) {
  const [metadata, setMetadata] = useState<CoverMetadata>({
    title: book.title,
    subtitle: book.subtitle,
    authorDisplayName: book.author_display_name,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <BookMetadataPanel
        bookId={book.id}
        initialTitle={book.title}
        initialSubtitle={book.subtitle}
        initialAuthorDisplayName={book.author_display_name}
        onDraftChange={setMetadata}
        onSaved={setMetadata}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0">
          <CoverGeneratorLazy
            bookId={book.id}
            bookTitle={metadata.title}
            bookSubtitle={metadata.subtitle}
            authorDisplayName={metadata.authorDisplayName}
            genre={book.genre}
            refinedIdea={book.refined_idea}
            tone={book.tone}
            initialCoverUrl={book.cover_url}
            initialCoverPrompt={book.cover_prompt}
          />
        </div>

        <aside className="min-w-0 space-y-6">
          <BackCoverCopyPanel
            bookId={book.id}
            initialBlurb={book.back_cover_copy}
          />
          <AboutAuthorPanel
            bookId={book.id}
            initialAboutAuthor={book.about_author}
            profileBio={profile?.bio ?? null}
            profilePenName={profile?.pen_name ?? null}
            profileFullName={profile?.full_name ?? null}
            profileAvatarUrl={profile?.avatar_url ?? null}
          />
        </aside>
      </div>
    </div>
  );
}

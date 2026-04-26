"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ChapterStatusDb } from "@/types/database.types";

import type { ChapterListItem } from "../types";

export type ChapterRealtimePayload = {
  id: string;
  status: ChapterStatusDb;
  word_count: number | null;
  title?: string | null;
  content?: string | null;
  updated_at?: string | null;
};

/**
 * Subscribes to chapter row updates for this book and fans them into the
 * sidebar list + current chapter title/status. Kept as a hook so the shell
 * doesn't own Supabase realtime wiring inline.
 */
export function useChapterRealtime({
  bookId,
  chapterId,
  onChapterRowUpdate,
  onCurrentChapterChanged,
  onContentChangedRemotely,
}: {
  bookId: string;
  chapterId: string;
  onChapterRowUpdate: (
    mutate: (prev: ChapterListItem[]) => ChapterListItem[],
  ) => void;
  onCurrentChapterChanged: (row: ChapterRealtimePayload) => void;
  onContentChangedRemotely?: (nextMd: string) => void;
}) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chapters-book-${bookId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chapters",
          filter: `book_id=eq.${bookId}`,
        },
        (payload) => {
          const row = payload.new as ChapterRealtimePayload;
          const previous =
            (payload.old as { content?: string | null } | null | undefined)?.content ?? null;
          onChapterRowUpdate((prev) =>
            prev.map((c) =>
              c.id === row.id
                ? {
                    ...c,
                    status: row.status,
                    word_count: row.word_count ?? c.word_count,
                    title: row.title ?? c.title,
                  }
                : c,
            ),
          );
          if (row.id === chapterId) {
            onCurrentChapterChanged(row);
            if (
              onContentChangedRemotely &&
              typeof row.content === "string" &&
              row.content !== previous
            ) {
              onContentChangedRemotely(row.content);
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    bookId,
    chapterId,
    onChapterRowUpdate,
    onCurrentChapterChanged,
    onContentChangedRemotely,
  ]);
}

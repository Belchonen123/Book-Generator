"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/realtime-js";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type BooksRow = Database["public"]["Tables"]["books"]["Row"];
type ChaptersRow = Database["public"]["Tables"]["chapters"]["Row"];

/**
 * Subscribe to Postgres changes for a single book row.
 * Returns an unsubscribe function for useEffect cleanup.
 */
export function subscribeToBook(
  bookId: string,
  callback: (payload: RealtimePostgresChangesPayload<BooksRow>) => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`books:${bookId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "books",
        filter: `id=eq.${bookId}`,
      },
      (payload) => callback(payload as RealtimePostgresChangesPayload<BooksRow>),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to Postgres changes for all chapters belonging to a book.
 * Returns an unsubscribe function for useEffect cleanup.
 */
export function subscribeToChapters(
  bookId: string,
  callback: (payload: RealtimePostgresChangesPayload<ChaptersRow>) => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`chapters:${bookId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chapters",
        filter: `book_id=eq.${bookId}`,
      },
      (payload) => callback(payload as RealtimePostgresChangesPayload<ChaptersRow>),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

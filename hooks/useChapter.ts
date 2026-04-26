"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { readDataStream } from "ai";

import { createClient } from "@/lib/supabase/client";
import { userFacingFetchError } from "@/lib/utils/client-fetch-errors";
import { CHAPTER_ROW_COLUMNS } from "@/lib/supabase/select-columns";
import type { Chapter } from "@/hooks/useBook";
import { useBookStore } from "@/hooks/useBook";

const SAVE_DEBOUNCE_MS = 750;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

async function readGenerateChapterStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  let accumulated = "";
  for await (const part of readDataStream(reader)) {
    if (part.type === "text") {
      accumulated += part.value;
      onDelta(accumulated);
    }
    if (part.type === "error") {
      throw new Error(String(part.value));
    }
  }
  onDelta(accumulated);
  return accumulated;
}

export function useChapter() {
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingContentRef = useRef(new Map<string, string>());

  const flushSave = useCallback(async (chapterId: string) => {
    const bookId = useBookStore.getState().currentBook?.id;
    const content = pendingContentRef.current.get(chapterId);
    if (!bookId || content === undefined) return;

    const words = countWords(content);
    const prev = useBookStore.getState().chapters.find((c) => c.id === chapterId);
    const prevBook = useBookStore.getState().currentBook;
    const snapshot =
      prev && prevBook
        ? {
            content: prev.content,
            status: prev.status,
            word_count: prev.word_count,
            bookWordCount: prevBook.word_count,
          }
        : null;

    if (prev && prevBook) {
      useBookStore.getState().updateChapter(chapterId, {
        content,
        status: "edited",
        word_count: words,
      });
      const optimisticTotal = useBookStore
        .getState()
        .chapters.reduce((acc, c) => acc + (c.word_count ?? 0), 0);
      useBookStore.setState({
        currentBook: { ...prevBook, word_count: optimisticTotal },
      });
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("chapters")
      .update({
        content,
        status: "edited",
        word_count: words,
      })
      .eq("id", chapterId)
      .eq("book_id", bookId);

    if (error) {
      if (snapshot && prevBook) {
        useBookStore.getState().updateChapter(chapterId, {
          content: snapshot.content,
          status: snapshot.status,
          word_count: snapshot.word_count,
        });
        useBookStore.setState({
          currentBook: { ...prevBook, word_count: snapshot.bookWordCount },
        });
      }
      toast.error("Could not save chapter. Your edit was reverted.");
      pendingContentRef.current.delete(chapterId);
      return;
    }

    useBookStore.getState().updateChapter(chapterId, {
      content,
      status: "edited",
      word_count: words,
    });

    pendingContentRef.current.delete(chapterId);

    const { data: rows } = await supabase.from("chapters").select("word_count").eq("book_id", bookId);
    if (rows) {
      const total = rows.reduce((acc, r) => acc + (r.word_count ?? 0), 0);
      await supabase.from("books").update({ word_count: total }).eq("id", bookId);
      const book = useBookStore.getState().currentBook;
      if (book) {
        useBookStore.setState({
          currentBook: { ...book, word_count: total },
        });
      }
    }
  }, []);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      const entries = Array.from(timers.entries());
      timers.clear();
      for (const [chapterId, timer] of entries) {
        clearTimeout(timer);
        void flushSave(chapterId);
      }
    };
  }, [flushSave]);

  const generateChapter = useCallback(async (chapterId: string) => {
    const { currentBook, isGenerating, setGenerating, updateChapter } = useBookStore.getState();
    if (!currentBook) {
      throw new Error("No book loaded. Call loadBook first.");
    }
    if (isGenerating) {
      throw new Error("A chapter is already being generated.");
    }

    const bookId = currentBook.id;
    setGenerating(true, chapterId);

    try {
      const res = await fetch("/api/ai/generate-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ bookId, chapterId }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        let message = "Generation failed.";
        if (contentType.includes("application/json")) {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        }
        throw new Error(message);
      }

      if (!res.body) {
        throw new Error("Empty response body.");
      }

      updateChapter(chapterId, { status: "generating", content: "" });

      try {
        const reader = res.body.getReader();
        await readGenerateChapterStream(reader, (text) => {
          useBookStore.getState().updateChapter(chapterId, {
            content: text,
            status: "generating",
          });
        });
      } catch (streamErr) {
        const supabase = createClient();
        const { data: row } = await supabase
          .from("chapters")
          .select(CHAPTER_ROW_COLUMNS)
          .eq("id", chapterId)
          .eq("book_id", bookId)
          .maybeSingle();
        if (row) {
          useBookStore.getState().updateChapter(chapterId, row as Chapter);
        }
        throw streamErr instanceof Error ? streamErr : new Error("Stream interrupted.");
      }

      const supabase = createClient();
      const { data: row, error } = await supabase
        .from("chapters")
        .select(CHAPTER_ROW_COLUMNS)
        .eq("id", chapterId)
        .eq("book_id", bookId)
        .single();

      if (!error && row) {
        useBookStore.getState().updateChapter(chapterId, row as Chapter);
      }

      const { data: bookRow } = await supabase
        .from("books")
        .select("word_count")
        .eq("id", bookId)
        .single();
      if (bookRow) {
        useBookStore.setState((s) =>
          s.currentBook
            ? { currentBook: { ...s.currentBook, word_count: bookRow.word_count } }
            : {},
        );
      }
    } catch (err) {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("chapters")
        .select(CHAPTER_ROW_COLUMNS)
        .eq("id", chapterId)
        .eq("book_id", bookId)
        .maybeSingle();
      if (row) {
        useBookStore.getState().updateChapter(chapterId, row as Chapter);
      }
      throw userFacingFetchError(err, "Chapter generation");
    } finally {
      setGenerating(false, null);
    }
  }, []);

  const saveChapter = useCallback(
    (chapterId: string, content: string) => {
      useBookStore.getState().updateChapter(chapterId, { content });

      pendingContentRef.current.set(chapterId, content);
      const existing = saveTimersRef.current.get(chapterId);
      if (existing) clearTimeout(existing);

      saveTimersRef.current.set(
        chapterId,
        setTimeout(() => {
          saveTimersRef.current.delete(chapterId);
          void flushSave(chapterId).catch(() => {
            /* caller may toast */
          });
        }, SAVE_DEBOUNCE_MS),
      );
    },
    [flushSave],
  );

  /** Same streaming flow as {@link generateChapter}; `generation_count` is incremented server-side when generation completes. */
  const regenerateChapter = useCallback(
    async (chapterId: string) => generateChapter(chapterId),
    [generateChapter],
  );

  return {
    generateChapter,
    saveChapter,
    regenerateChapter,
  };
}

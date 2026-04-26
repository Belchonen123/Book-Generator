"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { createClient } from "@/lib/supabase/client";
import {
  BOOK_ROW_COLUMNS,
  CHAPTER_ROW_COLUMNS,
  OUTLINE_ROW_COLUMNS,
} from "@/lib/supabase/select-columns";
import type { BookWithChapters } from "@/types/book.types";
import type { Database } from "@/types/database.types";

export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Outline = Database["public"]["Tables"]["outlines"]["Row"];

type BookRow = Database["public"]["Tables"]["books"]["Row"];

export type BookStoreState = {
  currentBook: BookWithChapters | null;
  chapters: Chapter[];
  outline: Outline | null;
  isGenerating: boolean;
  generatingChapterId: string | null;
};

type BookStoreActions = {
  setCurrentBook: (book: BookWithChapters | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  updateChapter: (chapterId: string, patch: Partial<Chapter>) => void;
  setOutline: (outline: Outline | null) => void;
  setGenerating: (isGenerating: boolean, generatingChapterId: string | null) => void;
  reset: () => void;
  loadBook: (bookId: string) => Promise<void>;
};

const initialState: BookStoreState = {
  currentBook: null,
  chapters: [],
  outline: null,
  isGenerating: false,
  generatingChapterId: null,
};

function mergeChapterList(
  list: Chapter[],
  chapterId: string,
  patch: Partial<Chapter>,
): Chapter[] {
  let hit = false;
  const next = list.map((c) => {
    if (c.id !== chapterId) return c;
    hit = true;
    return { ...c, ...patch };
  });
  if (!hit) return list;
  return next;
}

export const useBookStore = create<BookStoreState & BookStoreActions>((set, _get) => ({
  ...initialState,

  setCurrentBook: (book) =>
    set({
      currentBook: book,
      chapters: book?.chapters ?? [],
    }),

  setChapters: (chapters) =>
    set((state) => ({
      chapters,
      currentBook: state.currentBook ? { ...state.currentBook, chapters } : null,
    })),

  updateChapter: (chapterId, patch) =>
    set((state) => {
      const chapters = mergeChapterList(state.chapters, chapterId, patch);
      const currentBook = state.currentBook
        ? {
            ...state.currentBook,
            chapters: mergeChapterList(state.currentBook.chapters, chapterId, patch),
          }
        : null;
      return { chapters, currentBook };
    }),

  setOutline: (outline) => set({ outline }),

  setGenerating: (isGenerating, generatingChapterId) =>
    set({ isGenerating, generatingChapterId }),

  reset: () => set({ ...initialState }),

  loadBook: async (bookId) => {
    const supabase = createClient();
    const [bookRes, chaptersRes, outlineRes] = await Promise.all([
      supabase.from("books").select(BOOK_ROW_COLUMNS).eq("id", bookId).single(),
      supabase
        .from("chapters")
        .select(CHAPTER_ROW_COLUMNS)
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true }),
      supabase.from("outlines").select(OUTLINE_ROW_COLUMNS).eq("book_id", bookId).maybeSingle(),
    ]);

    if (bookRes.error) {
      throw new Error(bookRes.error.message || "Failed to load book.");
    }
    if (!bookRes.data) {
      throw new Error("Book not found.");
    }
    if (chaptersRes.error) {
      throw new Error(chaptersRes.error.message || "Failed to load chapters.");
    }
    if (outlineRes.error) {
      throw new Error(outlineRes.error.message || "Failed to load outline.");
    }

    const bookRow = bookRes.data as BookRow;
    const chapters = (chaptersRes.data ?? []) as Chapter[];
    const currentBook: BookWithChapters = { ...bookRow, chapters };

    set({
      currentBook,
      chapters,
      outline: outlineRes.data ?? null,
      isGenerating: false,
      generatingChapterId: null,
    });
  },
}));

export function useBook() {
  return useBookStore(
    useShallow((s) => ({
      currentBook: s.currentBook,
      chapters: s.chapters,
      outline: s.outline,
      isGenerating: s.isGenerating,
      generatingChapterId: s.generatingChapterId,
      setCurrentBook: s.setCurrentBook,
      setChapters: s.setChapters,
      updateChapter: s.updateChapter,
      setOutline: s.setOutline,
      setGenerating: s.setGenerating,
      reset: s.reset,
      loadBook: s.loadBook,
    })),
  );
}

import type { ChapterStatusDb } from "@/types/database.types";

export type ExportChapterRow = {
  id: string;
  chapter_number: number;
  title: string;
  status: ChapterStatusDb;
  /** True when chapter body has text (used for audiobook chapter picker). */
  hasAudioBody: boolean;
};

export type ExportPanelProps = {
  bookId: string;
  title: string;
  genre: string | null;
  wordCount: number;
  chapterCount: number;
  coverUrl: string | null;
  chapters: ExportChapterRow[];
  isPro: boolean;
};

import type { BookStatusDb, Database } from "@/types/database.types";

export enum SubscriptionTier {
  Free = "free",
  Pro = "pro",
}

export enum BookStatus {
  Idea = "idea",
  Refining = "refining",
  Outlining = "outlining",
  Writing = "writing",
  Editing = "editing",
  Cover = "cover",
  Complete = "complete",
}

export enum ChapterStatus {
  Pending = "pending",
  Generating = "generating",
  Draft = "draft",
  Edited = "edited",
  Approved = "approved",
}

/** Structured brief produced after idea refinement (AI or manual). */
export interface RefinedIdea {
  title: string;
  genre: string;
  targetAudience: string;
  premise: string;
  toneAndStyle: string;
  keyThemes: string[];
  estimatedChapters: number;
  estimatedWordCount: number;
}

export type {
  IdeaBriefFictionRoleBlock,
  RefinedIdeaBrief,
} from "@/lib/refined-idea/schema";
export { RefinedIdeaBriefSchema } from "@/lib/refined-idea/schema";

/** Outline segment stored in `outlines.sections` JSONB. */
export interface OutlineSection {
  title: string;
  description: string;
  chapter_count: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/** Serialized book row for dashboard / project cards. */
export type DashboardBook = {
  id: string;
  title: string;
  genre: string | null;
  status: BookStatusDb;
  word_count: number;
  chapter_count: number;
  updated_at: string;
  seriesId: string | null;
  seriesName: string | null;
  seriesOrder: number | null;
};

type BooksRow = Database["public"]["Tables"]["books"]["Row"];
type ChaptersRow = Database["public"]["Tables"]["chapters"]["Row"];

/** Single book with all related chapters (ordered by `chapter_number` in queries). */
export type BookWithChapters = BooksRow & {
  chapters: ChaptersRow[];
};

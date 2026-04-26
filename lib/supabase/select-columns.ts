/** Shared explicit `.select()` lists to keep payloads small and stable. */

export const BOOK_ROW_COLUMNS =
  "id, user_id, title, book_type, genre, target_audience, tone, raw_idea, refined_idea, character_bible, idea_conversation, status, cover_prompt, cover_url, kdp_instructions, word_count, chapter_count, created_at, updated_at" as const;

export const CHAPTER_ROW_COLUMNS =
  "id, book_id, chapter_number, title, outline_summary, content, word_count, status, generation_count, created_at, updated_at" as const;

export const OUTLINE_ROW_COLUMNS =
  "id, book_id, sections, approved, created_at, updated_at" as const;

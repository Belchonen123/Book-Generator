/** Free plan: max books per user (dashboard enforcement). */
export const FREE_BOOK_LIMIT = 3;

/** Free plan: max chapters per book before generation is blocked (matches generate-chapter API). */
export const FREE_MAX_CHAPTERS_PER_BOOK = 10;

/** First chapter number that requires Pro (11+). */
export const FREE_FIRST_LOCKED_CHAPTER_NUMBER = FREE_MAX_CHAPTERS_PER_BOOK + 1;

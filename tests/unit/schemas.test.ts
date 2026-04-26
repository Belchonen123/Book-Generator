import { describe, expect, it } from "vitest";

import {
  ChapterAssistRequestSchema,
  ChapterRequestSchema,
  CompileRequestSchema,
  CoverRequestSchema,
  KdpPackRequestSchema,
  OutlineRequestSchema,
  RefinementRequestSchema,
} from "@/lib/utils/schemas";

const BOOK_ID = "550e8400-e29b-41d4-a716-446655440000";
const CHAPTER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("Zod API request schemas", () => {
  it("RefinementRequestSchema accepts valid payloads and rejects bad UUIDs", () => {
    const ok = RefinementRequestSchema.safeParse({
      bookId: BOOK_ID,
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      userMessage: "Continue",
    });
    expect(ok.success).toBe(true);

    const badId = RefinementRequestSchema.safeParse({
      bookId: "not-a-uuid",
      messages: [{ role: "user", content: "x" }],
      userMessage: "y",
    });
    expect(badId.success).toBe(false);
  });

  it("OutlineRequestSchema accepts minimal and full payloads", () => {
    expect(
      OutlineRequestSchema.safeParse({ bookId: BOOK_ID }).success,
    ).toBe(true);
    expect(
      OutlineRequestSchema.safeParse({
        bookId: BOOK_ID,
        rawIdea: "idea",
        refinedIdeaOverride: "override",
      }).success,
    ).toBe(true);
    expect(OutlineRequestSchema.safeParse({ bookId: "x" }).success).toBe(false);
  });

  it("ChapterRequestSchema validates ids", () => {
    expect(
      ChapterRequestSchema.safeParse({ bookId: BOOK_ID, chapterId: CHAPTER_ID })
        .success,
    ).toBe(true);
    expect(
      ChapterRequestSchema.safeParse({
        bookId: BOOK_ID,
        chapterId: CHAPTER_ID,
        regenerateForOutline: true,
      }).success,
    ).toBe(true);
    expect(
      ChapterRequestSchema.safeParse({ bookId: BOOK_ID, chapterId: "nope" })
        .success,
    ).toBe(false);
  });

  it("CoverRequestSchema allows optional customPrompt", () => {
    expect(CoverRequestSchema.safeParse({ bookId: BOOK_ID }).success).toBe(true);
    expect(
      CoverRequestSchema.safeParse({
        bookId: BOOK_ID,
        customPrompt: "A moody skyline",
      }).success,
    ).toBe(true);
    expect(
      CoverRequestSchema.safeParse({ bookId: BOOK_ID, customPrompt: "" }).success,
    ).toBe(false);
  });

  it("CompileRequestSchema requires a UUID bookId", () => {
    expect(CompileRequestSchema.safeParse({ bookId: BOOK_ID }).success).toBe(
      true,
    );
    expect(CompileRequestSchema.safeParse({ bookId: "" }).success).toBe(false);
  });

  it("KdpPackRequestSchema requires a UUID bookId", () => {
    expect(KdpPackRequestSchema.safeParse({ bookId: BOOK_ID }).success).toBe(true);
    expect(KdpPackRequestSchema.safeParse({ bookId: "x" }).success).toBe(false);
  });

  it("ChapterAssistRequestSchema discriminates on action", () => {
    const expand = ChapterAssistRequestSchema.safeParse({
      action: "expand",
      bookId: BOOK_ID,
      chapterId: CHAPTER_ID,
      selectedText: "paragraph",
    });
    expect(expand.success).toBe(true);

    const tone = ChapterAssistRequestSchema.safeParse({
      action: "tone",
      bookId: BOOK_ID,
      chapterId: CHAPTER_ID,
      selectedText: "line",
      tone: "dramatic",
    });
    expect(tone.success).toBe(true);

    const badTone = ChapterAssistRequestSchema.safeParse({
      action: "tone",
      bookId: BOOK_ID,
      chapterId: CHAPTER_ID,
      selectedText: "line",
      tone: "silly",
    });
    expect(badTone.success).toBe(false);
  });
});

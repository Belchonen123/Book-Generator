/**
 * Prompt 16 § 397-406 (edge case #6): an arc whose start_book_id ==
 * end_book_id is declaring itself pinned to a single book. The save
 * must then reject any beat living in a different book.
 *
 * We test the pure helper directly — it only reads a single table,
 * `series_arc_beats`, so a narrow fake Supabase is enough.
 */
import { describe, it, expect } from "vitest";

import { validateArcBookSpan } from "@/app/(dashboard)/dashboard/series/arcs/_lib/validate-arc-span";

type BeatRow = { id: string; book_id: string | null };

function makeFakeSupabase(beats: BeatRow[], error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () =>
          Promise.resolve({ data: error ? null : beats, error }),
      }),
    }),
    // The helper uses `SupabaseClient<Database>`, but structurally only
    // needs `.from().select().eq()`. Cast at call site.
  };
}

describe("validateArcBookSpan", () => {
  it("accepts floating arcs (either endpoint null)", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([]),
      "arc-1",
      null,
      "book-1",
    );
    expect(result.ok).toBe(true);
  });

  it("accepts arcs whose start and end differ (multi-book is legal)", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([
        { id: "beat-1", book_id: "book-1" },
        { id: "beat-2", book_id: "book-2" },
      ]),
      "arc-1",
      "book-1",
      "book-3",
    );
    expect(result.ok).toBe(true);
  });

  it("accepts a single-book arc with all beats inside that book", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([
        { id: "beat-1", book_id: "book-1" },
        { id: "beat-2", book_id: "book-1" },
      ]),
      "arc-1",
      "book-1",
      "book-1",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a single-book arc with a beat in another book", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([
        { id: "beat-1", book_id: "book-1" },
        { id: "beat-2", book_id: "book-2" },
      ]),
      "arc-1",
      "book-1",
      "book-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/multiple books/i);
    }
  });

  it("ignores beats with no book_id (floating beats don't violate the pin)", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([
        { id: "beat-1", book_id: "book-1" },
        { id: "beat-2", book_id: null },
      ]),
      "arc-1",
      "book-1",
      "book-1",
    );
    expect(result.ok).toBe(true);
  });

  it("applies a pending insert override when validating a new beat", async () => {
    // Current state: one beat in book-1. We're about to insert a new
    // beat in book-2 on a single-book (book-1-only) arc → reject.
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([{ id: "beat-1", book_id: "book-1" }]),
      "arc-1",
      "book-1",
      "book-1",
      { beatId: null, newBookId: "book-2" },
    );
    expect(result.ok).toBe(false);
  });

  it("applies a pending move override (existing beat moved to a new book)", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([
        { id: "beat-1", book_id: "book-1" },
        { id: "beat-2", book_id: "book-1" },
      ]),
      "arc-1",
      "book-1",
      "book-1",
      { beatId: "beat-2", newBookId: "book-9" },
    );
    expect(result.ok).toBe(false);
  });

  it("fails closed when the beats query errors (don't silently save)", async () => {
    const result = await validateArcBookSpan(
      // @ts-expect-error fake client
      makeFakeSupabase([], { message: "boom" }),
      "arc-1",
      "book-1",
      "book-1",
    );
    expect(result.ok).toBe(false);
  });
});

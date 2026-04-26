/**
 * Prompt 16 § 408-421 (TESTING scenario #9): the "Convert standalone books
 * to series" wizard has to detect codex entries that refer to the same
 * canonical character across multiple books. These tests pin the
 * grouping key (`normalizeName`) and the per-field diff logic that
 * powers the merge review UI.
 */
import { describe, it, expect } from "vitest";

import {
  diffForGroup,
  normalizeName,
  type ConversionCodexInstance,
} from "@/app/(dashboard)/dashboard/series/convert/_lib/codex-diff";

function makeInstance(
  overrides: Partial<ConversionCodexInstance> = {},
): ConversionCodexInstance {
  return {
    entryId: "entry-1",
    bookId: "book-1",
    bookTitle: "Book One",
    summary: null,
    description_md: null,
    aliases: [],
    entryType: "character",
    custom_fields: {},
    ...overrides,
  };
}

describe("normalizeName", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeName("Elena")).toBe("elena");
    expect(normalizeName("ELENA")).toBe("elena");
    expect(normalizeName("  Elena ")).toBe("elena");
    expect(normalizeName("Elena  Kovač")).toBe("elena kovač");
  });

  it("is stable enough to group visually-different but equal names", () => {
    const variants = ["Elena", "elena", "ELENA", " Elena  ", "eleNa"];
    const normalized = variants.map(normalizeName);
    expect(new Set(normalized).size).toBe(1);
  });
});

describe("diffForGroup", () => {
  it("returns all false for a single-instance group (nothing to compare)", () => {
    const result = diffForGroup([
      makeInstance({ entryId: "only", summary: "hello" }),
    ]);
    expect(result).toEqual({
      summary: false,
      description_md: false,
      aliases: false,
      customFields: false,
    });
  });

  it("flags summary differences across instances", () => {
    const result = diffForGroup([
      makeInstance({ entryId: "a", summary: "Age 9 in book one." }),
      makeInstance({ entryId: "b", bookId: "book-2", summary: "Age 12 in book two." }),
    ]);
    expect(result.summary).toBe(true);
    expect(result.description_md).toBe(false);
  });

  it("treats whitespace-only diffs as equal (trims before comparison)", () => {
    const result = diffForGroup([
      makeInstance({ entryId: "a", description_md: "Shield bearer." }),
      makeInstance({
        entryId: "b",
        bookId: "book-2",
        description_md: "  Shield bearer.  ",
      }),
    ]);
    expect(result.description_md).toBe(false);
  });

  it("flags alias differences regardless of order", () => {
    const result = diffForGroup([
      makeInstance({ entryId: "a", aliases: ["Len", "Lena"] }),
      makeInstance({ entryId: "b", bookId: "book-2", aliases: ["Lena", "Len"] }),
    ]);
    // Same set, sorted comparison → no diff.
    expect(result.aliases).toBe(false);
  });

  it("flags alias differences when one side has an extra nickname", () => {
    const result = diffForGroup([
      makeInstance({ entryId: "a", aliases: ["Len"] }),
      makeInstance({ entryId: "b", bookId: "book-2", aliases: ["Len", "Lena"] }),
    ]);
    expect(result.aliases).toBe(true);
  });

  it("flags custom_fields divergence (deep equality)", () => {
    const result = diffForGroup([
      makeInstance({
        entryId: "a",
        custom_fields: { age: 9, role: "child" },
      }),
      makeInstance({
        entryId: "b",
        bookId: "book-2",
        custom_fields: { age: 12, role: "child" },
      }),
    ]);
    expect(result.customFields).toBe(true);
  });

  it("treats null and empty-object custom_fields as equal", () => {
    const result = diffForGroup([
      makeInstance({
        entryId: "a",
        custom_fields: {} as Record<string, unknown>,
      }),
      // Simulate a legacy row that returned null from Postgres.
      makeInstance({
        entryId: "b",
        bookId: "book-2",
        custom_fields: {} as Record<string, unknown>,
      }),
    ]);
    expect(result.customFields).toBe(false);
  });

  it("detects divergence in all four dimensions when the inputs disagree everywhere", () => {
    const result = diffForGroup([
      makeInstance({
        entryId: "a",
        summary: "Age 9",
        description_md: "Shy.",
        aliases: ["Len"],
        custom_fields: { age: 9 },
      }),
      makeInstance({
        entryId: "b",
        bookId: "book-2",
        summary: "Age 12",
        description_md: "Bold.",
        aliases: ["Lena"],
        custom_fields: { age: 12 },
      }),
    ]);
    expect(result).toEqual({
      summary: true,
      description_md: true,
      aliases: true,
      customFields: true,
    });
  });
});

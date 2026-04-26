import { describe, expect, it } from "vitest";

import { formatDate, formatWordCount, truncateText } from "@/lib/utils/format";

describe("formatWordCount", () => {
  it("formats plural and singular labels", () => {
    expect(formatWordCount(0)).toBe("0 words");
    expect(formatWordCount(1)).toBe("1 word");
    expect(formatWordCount(12400)).toBe("12,400 words");
  });

  it("respects custom labels", () => {
    expect(
      formatWordCount(2, { singular: "page", plural: "pages" }),
    ).toBe("2 pages");
    expect(
      formatWordCount(1, { singular: "page", plural: "pages" }),
    ).toBe("1 page");
  });

  it("floors non-integer and negative counts", () => {
    expect(formatWordCount(9.7)).toBe("9 words");
    expect(formatWordCount(-3)).toBe("0 words");
  });
});

describe("formatDate", () => {
  it("formats an ISO string with default pattern", () => {
    const s = formatDate("2026-04-19T15:30:00.000Z");
    expect(s.length).toBeGreaterThan(5);
    expect(s).toMatch(/2026/);
  });

  it("accepts Date values and timestamps with explicit patterns", () => {
    expect(formatDate(new Date(2026, 3, 19), "yyyy-MM-dd")).toBe("2026-04-19");
    const ms = Date.parse("2026-04-19T12:00:00.000Z");
    expect(formatDate(ms, "yyyy-MM-dd")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("truncateText", () => {
  it("returns original text when within limit", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("truncates with ellipsis", () => {
    expect(truncateText("abcdefghij", 6, "…")).toBe("abcde…");
  });

  it("handles maxLength zero", () => {
    expect(truncateText("hello", 0)).toBe("");
  });
});

import { describe, expect, it } from "vitest";

import { sanitizeText } from "@/lib/utils/sanitize";

describe("sanitizeText", () => {
  it("returns empty-ish input unchanged", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("strips HTML tags", () => {
    expect(sanitizeText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
    expect(sanitizeText("Before<div>inner</div>After")).toBe("BeforeinnerAfter");
  });

  it("removes script and style blocks", () => {
    expect(
      sanitizeText('<script>alert(1)</script><p>Safe</p>'),
    ).toBe("Safe");
    expect(
      sanitizeText('<style>.x{color:red}</style><span>OK</span>'),
    ).toBe("OK");
  });

  it("strips null bytes and trims", () => {
    expect(sanitizeText("  a\u0000b  ")).toBe("ab");
  });

  it("preserves comparison operators and math", () => {
    expect(sanitizeText("x < 5 && y > 3")).toBe("x < 5 && y > 3");
    expect(sanitizeText("a <= b")).toBe("a <= b");
    expect(sanitizeText("a > b ? c : d")).toBe("a > b ? c : d");
    expect(sanitizeText("diff: <n>")).toBe("diff: <n>");
  });

  it("still removes genuine HTML tags inline", () => {
    expect(sanitizeText("Hello <b>world</b>")).toBe("Hello world");
    expect(sanitizeText("<p>para</p>")).toBe("para");
  });

  it("removes HTML comments", () => {
    expect(sanitizeText("<!--hidden-->visible")).toBe("visible");
  });
});

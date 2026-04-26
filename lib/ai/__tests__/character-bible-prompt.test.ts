import { describe, expect, it, vi } from "vitest";

import {
  CHARACTER_BIBLE_CHAR_BUDGET,
  characterBibleToPromptText,
  trimCharacterBible,
} from "@/lib/ai/character-bible-prompt";
import * as errors from "@/lib/utils/errors";

describe("trimCharacterBible", () => {
  it("returns short text unchanged", () => {
    expect(trimCharacterBible("hello")).toBe("hello");
  });

  it("hard-truncates non-JSON over the char budget and appends a notice", () => {
    const huge = "x".repeat(50_000);
    const out = trimCharacterBible(huge);
    expect(out.length).toBeLessThanOrEqual(
      CHARACTER_BIBLE_CHAR_BUDGET + 120,
    );
    expect(out).toMatch(/\[Character bible truncated at context budget/);
  });

  it("structurally drops character sub-fields so JSON fits when removing fluff is enough", () => {
    const heavy = "z".repeat(20_000);
    const o = {
      setting_anchors: "place",
      characters: [
        {
          name: "A",
          relationships: { note: heavy },
          contradiction: heavy,
          nervous_habit: heavy,
        },
      ],
    };
    const s = JSON.stringify(o, null, 2);
    expect(s.length).toBeGreaterThan(CHARACTER_BIBLE_CHAR_BUDGET);
    const out = trimCharacterBible(s);
    expect(out).toMatch(/trimmed for context/);
    const jsonPart = out.split("\n\n[Character bible")[0] ?? "";
    const parsed = JSON.parse(jsonPart) as {
      characters: { relationships?: unknown; contradiction?: string }[];
    };
    expect(parsed.characters[0]!.relationships).toBeUndefined();
    expect(parsed.characters[0]!.contradiction).toBeUndefined();
  });
});

describe("characterBibleToPromptText (logging when trimmed)", () => {
  it("logs once when the serialized value exceeds the budget", () => {
    const spy = vi.spyOn(errors, "logServerError").mockImplementation(() => {});
    const long = { characters: Array.from({ length: 5 }, () => ({})) };
    (long as { pad?: string }).pad = "a".repeat(100_000);
    characterBibleToPromptText(long, { bookId: "b1" });
    expect(spy).toHaveBeenCalledWith(
      "character-bible-trim",
      "trim",
      expect.objectContaining({
        severity: "info",
        details: expect.objectContaining({
          bookId: "b1",
          originalLength: expect.any(Number),
          trimmedLength: expect.any(Number),
        }),
      }),
    );
    spy.mockRestore();
  });
});

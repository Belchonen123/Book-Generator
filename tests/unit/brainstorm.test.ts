import { describe, expect, it } from "vitest";

import {
  BRAINSTORM_PRESETS,
  BRAINSTORM_PRESET_IDS,
  getBrainstormPreset,
  isBrainstormPresetId,
} from "@/lib/ai/prompt-templates";
import { parseNumberedLines } from "@/lib/ai/brainstorm-parse";

describe("brainstorm presets", () => {
  it("exposes a preset for every id", () => {
    for (const id of BRAINSTORM_PRESET_IDS) {
      expect(BRAINSTORM_PRESETS[id]).toBeDefined();
      expect(BRAINSTORM_PRESETS[id].id).toBe(id);
      expect(BRAINSTORM_PRESETS[id].label.length).toBeGreaterThan(0);
    }
  });

  it("isBrainstormPresetId recognises every registered preset", () => {
    for (const id of BRAINSTORM_PRESET_IDS) {
      expect(isBrainstormPresetId(id)).toBe(true);
    }
  });

  it("isBrainstormPresetId rejects unknown values", () => {
    expect(isBrainstormPresetId("not-a-preset")).toBe(false);
    expect(isBrainstormPresetId("")).toBe(false);
  });

  it("getBrainstormPreset returns the preset row", () => {
    const p = getBrainstormPreset("character-names");
    expect(p.defaultCount).toBeGreaterThan(0);
    expect(p.temperature).toBeGreaterThan(0);
    expect(p.temperature).toBeLessThanOrEqual(1);
  });

  it("only the 'custom' preset is allowed to ship an empty starter prompt", () => {
    for (const id of BRAINSTORM_PRESET_IDS) {
      const p = BRAINSTORM_PRESETS[id];
      if (id === "custom") {
        expect(p.starterPrompt).toBe("");
      } else {
        expect(p.starterPrompt.length).toBeGreaterThan(20);
      }
    }
  });
});

describe("parseNumberedLines", () => {
  it("extracts a simple numbered list", () => {
    const raw = "1. First option\n2. Second option\n3. Third option\n";
    expect(parseNumberedLines(raw)).toEqual([
      "First option",
      "Second option",
      "Third option",
    ]);
  });

  it("accepts `1)` and `1]` separators", () => {
    const raw = "1) Alpha\n2] Beta\n3. Gamma";
    expect(parseNumberedLines(raw)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("ignores preamble and non-numbered lines", () => {
    const raw = [
      "Sure, here are ten options:",
      "",
      "1. Alpha",
      "Extra explanation that should be ignored.",
      "2. Beta",
      "- Bullet line",
      "3. Gamma",
    ].join("\n");
    expect(parseNumberedLines(raw)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("trims whitespace around item text", () => {
    const raw = "1.   Alpha   \n2.  Beta\t\n";
    expect(parseNumberedLines(raw)).toEqual(["Alpha", "Beta"]);
  });

  it("handles partial streams (incomplete last line)", () => {
    const raw = "1. Alpha\n2. Beta\n3. Ga";
    /* The regex requires at least one character after the number
     * marker, so "3. Ga" matches and we parse three items. */
    expect(parseNumberedLines(raw)).toEqual(["Alpha", "Beta", "Ga"]);
  });

  it("returns an empty list when no numbered line is present", () => {
    expect(parseNumberedLines("")).toEqual([]);
    expect(parseNumberedLines("No numbers here at all")).toEqual([]);
  });
});

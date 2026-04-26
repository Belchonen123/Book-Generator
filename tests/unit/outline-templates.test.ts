import { describe, expect, it } from "vitest";

import {
  OUTLINE_TEMPLATES,
  getOutlineTemplate,
  isOutlineTemplateId,
  listTemplatesForBookType,
  type OutlineTemplateId,
} from "@/lib/outline-templates";

const EXPECTED_IDS: ReadonlyArray<OutlineTemplateId> = [
  "save-the-cat",
  "heros-journey",
  "three-act",
  "seven-point",
  "snowflake",
  "romance-beat-sheet",
  "cozy-mystery",
  "kishotenketsu",
];

describe("outline templates registry", () => {
  it("ships exactly the documented eight templates", () => {
    expect(OUTLINE_TEMPLATES).toHaveLength(EXPECTED_IDS.length);
    const ids = OUTLINE_TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it("every template has a non-empty name, description, source, and at least 3 beats", () => {
    for (const t of OUTLINE_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.source.length).toBeGreaterThan(0);
      expect(t.bestFor.length).toBeGreaterThan(0);
      expect(t.bookTypes.length).toBeGreaterThan(0);
      expect(t.beats.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every beat has a non-empty title and summary", () => {
    for (const t of OUTLINE_TEMPLATES) {
      for (const b of t.beats) {
        expect(b.title.trim().length).toBeGreaterThan(0);
        expect(b.summary.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("Save the Cat has all 15 canonical beats", () => {
    const sc = getOutlineTemplate("save-the-cat");
    expect(sc).not.toBeNull();
    expect(sc!.beats).toHaveLength(15);
    const titles = sc!.beats.map((b) => b.title);
    expect(titles).toContain("Opening Image");
    expect(titles).toContain("Theme Stated");
    expect(titles).toContain("Midpoint");
    expect(titles).toContain("All Is Lost");
    expect(titles).toContain("Final Image");
  });

  it("Hero's Journey has the canonical 12 stages", () => {
    const hj = getOutlineTemplate("heros-journey");
    expect(hj).not.toBeNull();
    expect(hj!.beats).toHaveLength(12);
    const titles = hj!.beats.map((b) => b.title);
    expect(titles[0]).toBe("Ordinary World");
    expect(titles[titles.length - 1]).toContain("Elixir");
  });

  it("Kishotenketsu has exactly 4 beats and mentions no-conflict in description", () => {
    const k = getOutlineTemplate("kishotenketsu");
    expect(k).not.toBeNull();
    expect(k!.beats).toHaveLength(4);
    expect(k!.description.toLowerCase()).toContain("conflict");
  });
});

describe("helpers", () => {
  it("getOutlineTemplate returns null for unknown ids", () => {
    // @ts-expect-error deliberately pass an unknown id
    expect(getOutlineTemplate("not-real")).toBeNull();
  });

  it("isOutlineTemplateId narrows strings to valid ids", () => {
    for (const id of EXPECTED_IDS) {
      expect(isOutlineTemplateId(id)).toBe(true);
    }
    expect(isOutlineTemplateId("")).toBe(false);
    expect(isOutlineTemplateId("save_the_cat")).toBe(false);
  });

  it("listTemplatesForBookType filters by book type", () => {
    const fiction = listTemplatesForBookType("fiction");
    expect(fiction.length).toBeGreaterThan(0);
    for (const t of fiction) {
      expect(t.bookTypes).toContain("fiction");
    }

    const nonFiction = listTemplatesForBookType("non_fiction");
    /* At minimum the three-act template is non-fiction friendly. */
    expect(nonFiction.length).toBeGreaterThan(0);
    const ids = nonFiction.map((t) => t.id);
    expect(ids).toContain("three-act");
    /* Save the Cat is fiction only. */
    expect(ids).not.toContain("save-the-cat");
  });
});

import { describe, expect, it } from "vitest";

import {
  filterAndSort,
  type MentionCandidate,
} from "@/components/book/chat/mention-picker";

const CANDIDATES: MentionCandidate[] = [
  {
    type: "codex",
    id: "marcus-id",
    name: "Marcus Aurelius",
    aliases: ["Markie", "the emperor"],
    entryType: "character",
  },
  {
    type: "codex",
    id: "abigail-id",
    name: "Abigail",
    aliases: ["Abby"],
    entryType: "character",
  },
  {
    type: "codex",
    id: "rose-id",
    name: "The Rose of Atlas",
    aliases: [],
    entryType: "object",
  },
  {
    type: "chapter",
    id: "ch1-id",
    name: "The Fall",
    chapterNumber: 1,
  },
  {
    type: "chapter",
    id: "ch3-id",
    name: "Return of the Emperor",
    chapterNumber: 3,
  },
];

describe("filterAndSort (mention picker fuzzy match)", () => {
  it("returns chapters first when query is empty (author-flow heuristic)", () => {
    const result = filterAndSort(CANDIDATES, "");
    expect(result[0]?.type).toBe("chapter");
    expect(result[1]?.type).toBe("chapter");
    /* Chapters ordered by number ascending. */
    expect(result[0]).toMatchObject({ chapterNumber: 1 });
    expect(result[1]).toMatchObject({ chapterNumber: 3 });
  });

  it("prefix match on name beats inner match on another entry", () => {
    const result = filterAndSort(CANDIDATES, "mar");
    expect(result[0]?.id).toBe("marcus-id");
  });

  it("matches aliases on codex entries", () => {
    const result = filterAndSort(CANDIDATES, "abby");
    expect(result[0]?.id).toBe("abigail-id");
  });

  it("matches aliases case-insensitively", () => {
    const result = filterAndSort(CANDIDATES, "MARKIE");
    expect(result[0]?.id).toBe("marcus-id");
  });

  it("supports subsequence fuzzy match", () => {
    /* 'rof' ⊂ 'return of ...'  (return Of emperor). */
    const result = filterAndSort(CANDIDATES, "rof");
    expect(result.length).toBeGreaterThan(0);
    expect(result.map((r) => r.id)).toContain("ch3-id");
  });

  it("filters out candidates that do not contain the needle as a subsequence", () => {
    const result = filterAndSort(CANDIDATES, "zzz");
    expect(result).toEqual([]);
  });

  it("breaks ties in favour of codex over chapter", () => {
    /* Both 'emperor' (codex alias) and 'Return of the Emperor' (chapter)
     * contain 'emperor'. Tie on score → codex wins per the tie-breaker. */
    const result = filterAndSort(CANDIDATES, "emperor");
    /* The codex entry's alias 'the emperor' should score >= the chapter's
     * inner-match; and on ties codex wins. Either way codex must appear
     * before the chapter in the sorted list. */
    const marcusIdx = result.findIndex((r) => r.id === "marcus-id");
    const ch3Idx = result.findIndex((r) => r.id === "ch3-id");
    expect(marcusIdx).toBeGreaterThanOrEqual(0);
    expect(ch3Idx).toBeGreaterThanOrEqual(0);
    expect(marcusIdx).toBeLessThan(ch3Idx);
  });
});

import { describe, expect, it } from "vitest";

import {
  countSceneBeatDirectives,
  parseSceneBeatSegments,
} from "@/lib/editor/scene-beat-brackets";
import {
  SCENE_BEAT_LENGTH_WORDS,
  SCENE_BEAT_LENGTHS,
  SceneBeatRequestSchema,
} from "@/lib/utils/schemas";
import {
  filterSlashCommands,
  SLASH_COMMAND_ITEMS,
  slashItemKey,
} from "@/components/book/editor/slash-command-items";
import { markdownToHtml, turndown } from "@/components/book/chapter-editor/markdown";

describe("parseSceneBeatSegments", () => {
  it("returns an empty array for an empty input", () => {
    expect(parseSceneBeatSegments("")).toEqual([]);
  });

  it("returns a single text segment when there are no brackets", () => {
    const segs = parseSceneBeatSegments("Marcus enters the room quietly.");
    expect(segs).toEqual([
      { kind: "text", text: "Marcus enters the room quietly." },
    ]);
  });

  it("splits a single bracketed directive", () => {
    const segs = parseSceneBeatSegments(
      "Marcus opens the door. [slow down] Inside, Elena waits.",
    );
    expect(segs).toEqual([
      { kind: "text", text: "Marcus opens the door. " },
      { kind: "directive", text: "slow down" },
      { kind: "text", text: " Inside, Elena waits." },
    ]);
  });

  it("handles a directive at the start of the beat", () => {
    const segs = parseSceneBeatSegments("[open mid-action] He is already running.");
    expect(segs).toEqual([
      { kind: "directive", text: "open mid-action" },
      { kind: "text", text: " He is already running." },
    ]);
  });

  it("handles a directive at the end of the beat", () => {
    const segs = parseSceneBeatSegments("She doesn't answer. [end on dialogue]");
    expect(segs).toEqual([
      { kind: "text", text: "She doesn't answer. " },
      { kind: "directive", text: "end on dialogue" },
    ]);
  });

  it("treats unmatched `[` as literal text", () => {
    const segs = parseSceneBeatSegments("Stress test [no close bracket here");
    expect(segs).toEqual([
      { kind: "text", text: "Stress test [no close bracket here" },
    ]);
  });

  it("treats `[]` and whitespace-only brackets as literal", () => {
    const segs = parseSceneBeatSegments("Empty [] and [   ] brackets should be literal");
    expect(segs).toEqual([
      {
        kind: "text",
        text: "Empty [] and [   ] brackets should be literal",
      },
    ]);
  });

  it("supports multiple directives in one beat", () => {
    const segs = parseSceneBeatSegments(
      "[slow down] Marcus hesitates. [describe the smell] The hallway is cold.",
    );
    expect(segs).toEqual([
      { kind: "directive", text: "slow down" },
      { kind: "text", text: " Marcus hesitates. " },
      { kind: "directive", text: "describe the smell" },
      { kind: "text", text: " The hallway is cold." },
    ]);
  });

  it("treats nested brackets as one directive ending at the first `]`", () => {
    const segs = parseSceneBeatSegments("A [weird [nested] thing] here");
    /* First `[` opens at 'weird [nested', closes at the inner `]` -> directive
     * = 'weird [nested'. Then ' thing]' is literal text. */
    expect(segs).toEqual([
      { kind: "text", text: "A " },
      { kind: "directive", text: "weird [nested" },
      { kind: "text", text: " thing] here" },
    ]);
  });

  it("preserves the original text when segments are concatenated back", () => {
    const input =
      "Opening image. [slow down] Marcus enters. [describe the smell of the hallway] Elena waits.";
    const segs = parseSceneBeatSegments(input);
    const rebuilt = segs
      .map((s) => (s.kind === "directive" ? `[${s.text}]` : s.text))
      .join("");
    expect(rebuilt).toBe(input);
  });
});

describe("countSceneBeatDirectives", () => {
  it("counts zero for an empty beat", () => {
    expect(countSceneBeatDirectives("")).toBe(0);
  });

  it("counts zero for text without brackets", () => {
    expect(countSceneBeatDirectives("Plain prose, no brackets here.")).toBe(0);
  });

  it("counts all valid directives", () => {
    expect(
      countSceneBeatDirectives(
        "[slow down] Marcus waits. [describe the smell] [end on dialogue]",
      ),
    ).toBe(3);
  });

  it("ignores empty and whitespace-only brackets", () => {
    expect(countSceneBeatDirectives("[] [   ] [ok]")).toBe(1);
  });

  it("ignores an unmatched `[`", () => {
    expect(countSceneBeatDirectives("[valid] and [unclosed")).toBe(1);
  });
});

describe("SceneBeatRequestSchema", () => {
  it("defaults lengthHint to 'medium'", () => {
    const parsed = SceneBeatRequestSchema.parse({
      chapterId: "11111111-1111-1111-1111-111111111111",
      beatText: "Something happens.",
    });
    expect(parsed.lengthHint).toBe("medium");
  });

  it("accepts all three length hints", () => {
    for (const len of SCENE_BEAT_LENGTHS) {
      const parsed = SceneBeatRequestSchema.parse({
        chapterId: "11111111-1111-1111-1111-111111111111",
        beatText: "Something happens.",
        lengthHint: len,
      });
      expect(parsed.lengthHint).toBe(len);
    }
  });

  it("rejects an invalid lengthHint", () => {
    const res = SceneBeatRequestSchema.safeParse({
      chapterId: "11111111-1111-1111-1111-111111111111",
      beatText: "Something happens.",
      lengthHint: "xxxl",
    });
    expect(res.success).toBe(false);
  });

  it("rejects an empty beat", () => {
    const res = SceneBeatRequestSchema.safeParse({
      chapterId: "11111111-1111-1111-1111-111111111111",
      beatText: "   ",
    });
    expect(res.success).toBe(false);
  });

  it("rejects a non-uuid chapterId", () => {
    const res = SceneBeatRequestSchema.safeParse({
      chapterId: "not-a-uuid",
      beatText: "Something happens.",
    });
    expect(res.success).toBe(false);
  });

  it("exposes target word counts that strictly increase with length", () => {
    expect(SCENE_BEAT_LENGTH_WORDS.short).toBeLessThan(
      SCENE_BEAT_LENGTH_WORDS.medium,
    );
    expect(SCENE_BEAT_LENGTH_WORDS.medium).toBeLessThan(
      SCENE_BEAT_LENGTH_WORDS.long,
    );
  });
});

describe("slash-command-items (SceneBeat extensions)", () => {
  it("registers `/beat` as a scene-beat insert", () => {
    const item = SLASH_COMMAND_ITEMS.find((i) => i.trigger === "beat");
    expect(item?.kind).toBe("scene-beat");
    if (item?.kind === "scene-beat") {
      expect(item.defaultBeatText).toBeUndefined();
    }
  });

  it("registers `/continue` with a pre-filled default", () => {
    const item = SLASH_COMMAND_ITEMS.find((i) => i.trigger === "continue");
    expect(item?.kind).toBe("scene-beat");
    if (item?.kind === "scene-beat") {
      expect(item.defaultBeatText).toBe("Continue the scene.");
    }
  });

  it("preserves the inline-assist actions with unique triggers", () => {
    const inlineItems = SLASH_COMMAND_ITEMS.filter(
      (i) => i.kind === "inline-assist",
    );
    const triggers = inlineItems.map((i) => i.trigger);
    expect(new Set(triggers).size).toBe(triggers.length);
    /* The existing `beat` inline-action was renamed to `next` so the
     * SceneBeat `/beat` can take the `beat` trigger slot. */
    expect(triggers).toContain("next");
  });

  it("has unique triggers across the whole palette", () => {
    const triggers = SLASH_COMMAND_ITEMS.map((i) => i.trigger);
    expect(new Set(triggers).size).toBe(triggers.length);
  });

  it("filters by prefix", () => {
    const hits = filterSlashCommands("b");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.every((h) => h.trigger.startsWith("b"))).toBe(true);
    expect(hits[0].trigger).toBe("beat");
  });

  it("produces unique stable keys for every item", () => {
    const keys = SLASH_COMMAND_ITEMS.map(slashItemKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("scene-beat markdown round-trip", () => {
  it("scene-beat div survives html → markdown → html round-trip", () => {
    const html =
      '<p>before</p><div data-scene-beat="" data-beat-text="A meets B" data-status="generated" data-generated-prose="They meet." data-length-hint="medium" data-collapsed="false"></div><p>after</p>';
    const md = turndown.turndown(html);
    expect(md).toContain("data-scene-beat");
    expect(md).toContain('data-beat-text="A meets B"');
    expect(md).toContain('data-generated-prose="They meet."');
    const back = markdownToHtml(md);
    expect(back).toContain("data-scene-beat");
    expect(back).toContain('data-beat-text="A meets B"');
  });
});

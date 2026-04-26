import { describe, expect, it } from "vitest";

import pkg from "../../package.json";

/**
 * Guard against a silent major bump of the Vercel AI SDK.
 *
 * AI SDK v4 (mid-2024) renamed / moved several primitives we depend on:
 *   - `StreamingTextResponse` and `formatStreamPart`  (server)
 *   - `readDataStream`                                (client)
 *
 * They now live under `ai/rsc` or were removed entirely. Letting `npm install`
 * resolve to v4+ breaks chapter generation end-to-end with runtime errors
 * that would only surface once someone hits the editor.
 *
 * If you need to upgrade, plan a real migration:
 *   - app/api/ai/generate-chapter/route.ts
 *   - app/api/ai/refine-idea/route.ts
 *   - components/book/chapter-editor/ChapterEditor.tsx
 *   - hooks/useChapter.ts
 *   - lib/anthropic/* (if enabled)
 *
 * Then bump the spec below and delete this test.
 */
describe("ai SDK version lock", () => {
  it("pins `ai` to a v3.x range", () => {
    const spec = pkg.dependencies?.ai;
    expect(
      typeof spec === "string" && spec.length > 0,
      "package.json is missing an `ai` dependency",
    ).toBe(true);

    const s = (spec as string).trim();
    /* Accept ^3, ~3, 3.x.x, >=3 <4, etc. — anything whose first numeric
     * major is exactly 3. Reject 4+, wildcards ("*"), "latest", tags. */
    const majorMatch = s.match(/(\d+)/);
    expect(
      majorMatch != null,
      `\`ai\` spec "${s}" does not contain a numeric version`,
    ).toBe(true);
    const major = Number(majorMatch![1]);
    expect(
      major,
      `\`ai\` must be pinned to major 3.x; got "${s}" (major ${major}). ` +
        "See the top-of-file comment for what breaks on v4.",
    ).toBe(3);
  });
});

import { describe, expect, it } from "vitest";

import { mergeSavedCodexEntry } from "@/app/(dashboard)/projects/[id]/codex/_components/codex-page-content";
import type { CodexEntry } from "@/lib/codex/types";

function entry(description_md: string, updated_at = "2026-04-24T10:00:00.000Z"): CodexEntry {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    book_id: "22222222-2222-4222-8222-222222222222",
    entry_type: "character",
    name: "Aharon",
    aliases: [],
    summary: null,
    description_md,
    custom_fields: {},
    ai_scope: "on_match",
    relations: [],
    image_url: null,
    created_at: "2026-04-24T09:00:00.000Z",
    updated_at,
    scope: "project",
  };
}

describe("mergeSavedCodexEntry", () => {
  it("keeps newer pending textarea edits over an older save response", () => {
    const current = entry("first sentence plus newer typing");
    const saved = entry("first sentence", "2026-04-24T10:00:01.000Z");

    const merged = mergeSavedCodexEntry(current, saved, {
      description_md: "first sentence plus newer typing",
    });

    expect(merged.description_md).toBe("first sentence plus newer typing");
    expect(merged.updated_at).toBe("2026-04-24T10:00:01.000Z");
  });
});

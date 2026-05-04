import { describe, expect, it } from "vitest";

import {
  coerceFictionStructuralPayload,
  outlineFictionStructuralResponseSchema,
} from "@/lib/outline/fiction-outline-schemas";

describe("coerceFictionStructuralPayload", () => {
  it("uses common description aliases instead of falling back to a placeholder", () => {
    const out = coerceFictionStructuralPayload({
      chapters: [
        {
          number: "1",
          title: "The Locked Door",
          chapter_outline:
            "Mara tries to open the sealed archive, triggers an alarm, and must choose between saving her notes or keeping her cover intact.",
        },
      ],
    }) as { chapters: Array<{ description: string; number: number }> };

    expect(out.chapters[0].number).toBe(1);
    expect(out.chapters[0].description).toContain("sealed archive");
    expect(out.chapters[0].description).not.toMatch(/^TBD\b/i);
  });

  it("builds a usable description from craft fields when the model omits description", () => {
    const out = coerceFictionStructuralPayload({
      chapters: [
        {
          number: 1,
          title: "The False Signal",
          opening_psychological_move: "Open with Mara counting one fewer oxygen canister than yesterday.",
          chapter_ends_with: "The rescue beacon answers from inside the crater.",
          ending_opens_what: "Someone on the planet has been using her transmitter.",
        },
      ],
    }) as { chapters: Array<{ description: string }> };

    expect(out.chapters[0].description).toContain("oxygen canister");
    expect(out.chapters[0].description).toContain("rescue beacon");
  });

  it("fails schema validation instead of accepting a title-only TBD outline", () => {
    const out = coerceFictionStructuralPayload({
      chapters: [{ number: 1, title: "Thin Chapter", description: "TBD" }],
    });

    expect(outlineFictionStructuralResponseSchema.safeParse(out).success).toBe(false);
  });

  it("accepts legacy platform outline fields from the active template", () => {
    const out = coerceFictionStructuralPayload({
      chapters: [
        {
          chapter: "Ch. 1",
          working_title: "Shadows of the Past",
          emotional_contract: "The reader should feel hunted before they understand by whom.",
          opening_move: "Open with Mara deleting her own access logs before the audit bot arrives.",
          signature_detail: "A prayer ribbon caught in the cooling vent outside the archive.",
          what_changes: "Mara learns the directive was altered after her father signed it.",
          question_the_chapter_opens: "Who had admin rights after the dead founder's account was closed?",
          bridges_to_next: "The audit bot flags a live session from that supposedly closed account.",
        },
      ],
    });

    const parsed = outlineFictionStructuralResponseSchema.safeParse(out);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.chapters[0].number).toBe(1);
    expect(parsed.data.chapters[0].title).toBe("Shadows of the Past");
    expect(parsed.data.chapters[0].description).toContain("audit bot");
    expect(parsed.data.chapters[0].description).toContain("admin rights");
    expect(parsed.data.chapters[0].ending_opens_what).toContain("admin rights");
  });
});

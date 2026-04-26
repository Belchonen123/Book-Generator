import { describe, expect, it } from "vitest";

import {
  appendExpandOutlineAuthorInstruction,
  buildExpandOutlineSystemPrompt,
} from "@/lib/ai/prompt-templates";

describe("expand outline prompt helpers", () => {
  it("marks author expansion instructions as mandatory in the system prompt", () => {
    const system = buildExpandOutlineSystemPrompt(
      "lean harder into the mentor's backstory",
    );

    expect(system).toContain("AUTHOR EXPANSION INSTRUCTIONS");
    expect(system).toContain("mandatory and highest priority");
    expect(system).toContain("visibly satisfy");
  });

  it("adds the author expansion instruction to the user prompt lines", () => {
    const lines = ["Current outline:\nA mentor arrives."];

    appendExpandOutlineAuthorInstruction(
      lines,
      "lean harder into the mentor's backstory",
    );

    const prompt = lines.join("\n");
    expect(prompt).toContain(
      "AUTHOR EXPANSION INSTRUCTIONS (mandatory, highest priority):",
    );
    expect(prompt).toContain("lean harder into the mentor's backstory");
    expect(prompt).toContain("Make these instructions visibly affect");
  });
});

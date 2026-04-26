import { describe, expect, it } from "vitest";

function finalizeGenerationAfterStream(params: {
  displayInEditor: boolean;
  cancelled: boolean;
}): "abort" | "flush" {
  if (params.displayInEditor && params.cancelled) {
    throw new DOMException("Chapter generation aborted by user", "AbortError");
  }
  return "flush";
}

describe("chapter generation cancellation", () => {
  it("treats a completed reader as aborted when the user cancelled mid-stream", () => {
    expect(() =>
      finalizeGenerationAfterStream({
        displayInEditor: true,
        cancelled: true,
      }),
    ).toThrowError(/aborted by user/i);
  });

  it("allows normal flush when the stream completed without cancellation", () => {
    expect(
      finalizeGenerationAfterStream({
        displayInEditor: true,
        cancelled: false,
      }),
    ).toBe("flush");
  });

  it("does not force abort semantics for non-editor/background generation", () => {
    expect(
      finalizeGenerationAfterStream({
        displayInEditor: false,
        cancelled: true,
      }),
    ).toBe("flush");
  });
});

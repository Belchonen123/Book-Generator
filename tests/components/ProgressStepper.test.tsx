import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressStepper } from "@/components/book/ProgressStepper";

describe("ProgressStepper", () => {
  it("highlights the writing step when status is writing", () => {
    const { container } = render(
      <ProgressStepper currentStatus="writing" />,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.textContent?.trim()).toBe("4");
  });

  it("highlights the final step with a check icon when complete", () => {
    const { container } = render(
      <ProgressStepper currentStatus="complete" />,
    );
    const current = container.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.querySelector("svg")).not.toBeNull();
  });

  it("links each step to workflow URLs when bookId is set", () => {
    const { getByRole } = render(
      <ProgressStepper
        currentStatus="writing"
        bookId="book-1"
        firstChapterId="chap-1"
      />,
    );
    expect(
      getByRole("link", { name: /idea — go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-1/idea");
    expect(
      getByRole("link", { name: /write — go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-1/chapters/chap-1");
    expect(
      getByRole("link", { name: /done — go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-1/export");
  });

  it("sends write/edit to outline when no chapter id yet", () => {
    const { getByRole } = render(
      <ProgressStepper
        currentStatus="outlining"
        bookId="book-2"
        firstChapterId={null}
      />,
    );
    expect(
      getByRole("link", { name: /write — go to this step/i }).getAttribute("href"),
    ).toBe("/projects/book-2/outline");
  });
});

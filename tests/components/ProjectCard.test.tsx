import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { ProjectCard } from "@/components/book/ProjectCard";
import type { DashboardBook } from "@/types/book.types";

vi.mock("next/link", () => {
  function MockLink(
    props: PropsWithChildren<
      { href: string; prefetch?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>
    >,
  ) {
    const { children, href, prefetch: _prefetch, ...rest } = props;
    return (
      <a
        href={href}
        {...rest}
        onClick={(event) => {
          event.preventDefault();
          rest.onClick?.(event);
        }}
      >
        {children}
      </a>
    );
  }
  return { default: MockLink };
});

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/app/(dashboard)/dashboard/actions", () => ({
  deleteBookAction: vi.fn().mockResolvedValue({ ok: true }),
  renameBookAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const book: DashboardBook = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "My Novel",
  genre: "Science Fiction",
  status: "writing",
  word_count: 1200,
  chapter_count: 3,
  updated_at: "2026-04-19T12:00:00.000Z",
};

describe("ProjectCard", () => {
  it("renders title, genre, and status", () => {
    render(<ProjectCard book={book} />);
    screen.getByRole("heading", { level: 2, name: "My Novel" });
    screen.getByText("Science Fiction");
    screen.getByText("Writing");
  });

  it("exposes the project link and handles click", () => {
    render(<ProjectCard book={book} />);
    const link = screen.getByRole("link", { name: /my novel/i });
    expect(link.getAttribute("href")).toBe(
      "/projects/550e8400-e29b-41d4-a716-446655440000",
    );
    fireEvent.click(link);
  });

  it("opens the actions menu when the menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectCard book={book} />);
    await user.click(screen.getByRole("button", { name: /book actions/i }));
    screen.getByRole("menu");
    screen.getByRole("menuitem", { name: /rename/i });
  });
});

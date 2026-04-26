"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  BookOpen,
  Check,
  Download,
  ImageIcon,
  LayoutDashboard,
  Library,
  Lightbulb,
  ListTree,
  Quote,
  Settings,
  Sparkles,
  Wand2,
  X,
} from "@/lib/lucide-icons";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";
import { useProjectBook } from "@/components/layout/project-book-context";
import { Button } from "@/components/ui/button";
import { bookStatusIndex } from "@/lib/book/workflow";
import { useProjectSidebarStore } from "@/stores/project-sidebar-store";
import type { BookStatusDb } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

type NavStep = "idea" | "outline" | "chapters" | "cover" | "export";

const STEPS: {
  key: NavStep;
  label: string;
  Icon: typeof Lightbulb;
  href: (bookId: string, firstChapterId: string | null) => string;
}[] = [
  {
    key: "idea",
    label: "Idea",
    Icon: Lightbulb,
    href: (bookId) => `/projects/${bookId}/idea`,
  },
  {
    key: "outline",
    label: "Outline",
    Icon: ListTree,
    href: (bookId) => `/projects/${bookId}/outline`,
  },
  {
    key: "chapters",
    label: "Chapters",
    Icon: BookOpen,
    href: (bookId, first) =>
      first ? `/projects/${bookId}/chapters/${first}` : `/projects/${bookId}/outline`,
  },
  {
    key: "cover",
    label: "Cover",
    Icon: ImageIcon,
    href: (bookId) => `/projects/${bookId}/cover`,
  },
  {
    key: "export",
    label: "Export",
    Icon: Download,
    href: (bookId) => `/projects/${bookId}/export`,
  },
];

function activeStepFromPath(pathname: string): NavStep {
  if (pathname.includes("/export")) return "export";
  if (pathname.includes("/cover")) return "cover";
  if (pathname.includes("/pacing")) return "chapters";
  if (pathname.includes("/chapters/")) return "chapters";
  if (pathname.includes("/outline")) return "outline";
  return "idea";
}

function stepCompleted(step: NavStep, bookStatus: BookStatusDb): boolean {
  const i = bookStatusIndex(bookStatus);
  switch (step) {
    case "idea":
      return i >= bookStatusIndex("outlining");
    case "outline":
      return i >= bookStatusIndex("writing");
    case "chapters":
      return i >= bookStatusIndex("cover");
    case "cover":
      return i >= bookStatusIndex("complete");
    case "export":
      return bookStatus === "complete";
    default:
      return false;
  }
}

type SidebarBodyProps = {
  compact: boolean;
  onNavigate?: () => void;
};

function SidebarBody({ compact, onNavigate }: SidebarBodyProps) {
  const pathname = usePathname() ?? "";
  const { bookId, bookTitle, bookStatus, firstChapterId, bookType } = useProjectBook();
  const profile = useDashboardProfile();
  const active = activeStepFromPath(pathname);

  const initials =
    profile.fullName?.trim()?.charAt(0)?.toUpperCase() ??
    profile.email?.charAt(0)?.toUpperCase() ??
    "?";

  return (
    <>
      {compact ? (
        <div className="shrink-0 border-b border-border/60 px-2 py-4 lg:px-4">
          <Link
            prefetch
            href="/dashboard"
            className="flex items-center justify-center gap-2 lg:justify-start"
            title="ChapterAI — Dashboard"
          >
            <Sparkles className="h-6 w-6 shrink-0 text-gold lg:hidden" aria-hidden />
            <span className="hidden font-serif text-lg font-semibold tracking-tight text-gold lg:inline">
              ChapterAI
            </span>
          </Link>
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
          <Link
            prefetch
            href="/dashboard"
            className="flex min-h-11 items-center gap-2 font-serif text-lg font-semibold tracking-tight text-gold"
            title="ChapterAI — Dashboard"
            onClick={onNavigate}
          >
            <Sparkles className="h-6 w-6 shrink-0 text-gold" aria-hidden />
            ChapterAI
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-editorial-muted hover:text-editorial-cream"
            aria-label="Close menu"
            onClick={onNavigate}
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      )}

      <div className={cn("shrink-0 border-b border-border/40 py-3", compact ? "px-2 lg:px-3" : "px-3")}>
        <p
          className={cn(
            "truncate text-[10px] font-medium uppercase tracking-wide text-editorial-muted",
            compact ? "text-center lg:text-left lg:text-xs" : "text-left text-xs",
          )}
          title={bookTitle}
        >
          <span className={cn(!compact ? "inline" : "hidden lg:inline")}>Project · </span>
          <span className={cn(compact && "lg:font-normal")}>{bookTitle}</span>
        </p>
      </div>

      <nav
        className={cn(
          "mx-2 my-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-xl border border-border/50 bg-editorial-bg/35 p-2",
          compact ? "lg:mx-2 lg:my-2" : "mx-3 my-3",
        )}
        aria-label="Project workflow"
      >
        {STEPS.map(({ key, label, Icon, href }) => {
          const to = href(bookId, firstChapterId);
          const isActive = active === key;
          const done = stepCompleted(key, bookStatus);
          return (
            <Link
              prefetch
              key={key}
              href={to}
              title={label}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg border text-sm transition-colors",
                compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
                isActive
                  ? "border-gold/35 bg-gold/12 text-gold shadow-[0_0_0_1px_rgba(201,168,76,0.15)]"
                  : "border-transparent text-editorial-muted hover:border-border/60 hover:bg-muted/35 hover:text-editorial-cream",
              )}
            >
              <span
                className={cn(
                  "relative flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-editorial-bg/70 transition-colors group-hover:border-border",
                  compact ? "h-9 w-9" : "h-11 w-11",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {done ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-medium",
                  compact ? "hidden lg:inline" : "inline",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
        <Link
          prefetch
          href={`/projects/${bookId}/style`}
          title="Voice & Style — per-project prose sample for AI generation"
          onClick={onNavigate}
          className={cn(
            "mt-1 flex items-center gap-3 rounded-lg border text-sm transition-colors",
            compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
            pathname.includes("/style")
              ? "border-gold/35 bg-gold/12 text-gold shadow-[0_0_0_1px_rgba(201,168,76,0.15)]"
              : "border-transparent text-editorial-muted hover:border-border/60 hover:bg-muted/35 hover:text-editorial-cream",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-editorial-bg/70",
              compact ? "h-9 w-9" : "h-11 w-11",
            )}
          >
            <Quote className="h-4 w-4" aria-hidden />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              compact ? "hidden lg:inline" : "inline",
            )}
          >
            Voice &amp; Style
          </span>
        </Link>
        <Link
          prefetch
          href={`/projects/${bookId}/codex`}
          title="Codex — characters, locations, and lore the AI auto-references"
          onClick={onNavigate}
          className={cn(
            "mt-1 flex items-center gap-3 rounded-lg border text-sm transition-colors",
            compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
            pathname.includes("/codex")
              ? "border-gold/35 bg-gold/12 text-gold shadow-[0_0_0_1px_rgba(201,168,76,0.15)]"
              : "border-transparent text-editorial-muted hover:border-border/60 hover:bg-muted/35 hover:text-editorial-cream",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-editorial-bg/70",
              compact ? "h-9 w-9" : "h-11 w-11",
            )}
          >
            <Library className="h-4 w-4" aria-hidden />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              compact ? "hidden lg:inline" : "inline",
            )}
          >
            Codex
          </span>
        </Link>
        <Link
          prefetch
          href={`/projects/${bookId}/prompts`}
          title="Prompt templates — override the AI system prompts for this project"
          onClick={onNavigate}
          className={cn(
            "mt-1 flex items-center gap-3 rounded-lg border text-sm transition-colors",
            compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
            pathname.includes("/prompts")
              ? "border-gold/35 bg-gold/12 text-gold shadow-[0_0_0_1px_rgba(201,168,76,0.15)]"
              : "border-transparent text-editorial-muted hover:border-border/60 hover:bg-muted/35 hover:text-editorial-cream",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-editorial-bg/70",
              compact ? "h-9 w-9" : "h-11 w-11",
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              compact ? "hidden lg:inline" : "inline",
            )}
          >
            Prompts
          </span>
        </Link>
        <Link
          prefetch
          href={`/projects/${bookId}/brainstorm`}
          title="Brainstorm — 10 options for names, titles, twists, anything, with thumbs-up keepers"
          onClick={onNavigate}
          className={cn(
            "mt-1 flex items-center gap-3 rounded-lg border text-sm transition-colors",
            compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
            pathname.includes("/brainstorm")
              ? "border-gold/35 bg-gold/12 text-gold shadow-[0_0_0_1px_rgba(201,168,76,0.15)]"
              : "border-transparent text-editorial-muted hover:border-border/60 hover:bg-muted/35 hover:text-editorial-cream",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-editorial-bg/70",
              compact ? "h-9 w-9" : "h-11 w-11",
            )}
          >
            <Wand2 className="h-4 w-4" aria-hidden />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              compact ? "hidden lg:inline" : "inline",
            )}
          >
            Brainstorm
          </span>
        </Link>
        {bookType === "fiction" ? (
          <Link
            prefetch
            href={`/projects/${bookId}/pacing`}
            title="Pacing — scene beats and tension (Pro, fiction only)"
            onClick={onNavigate}
            className={cn(
              "mt-1 flex items-center gap-3 rounded-lg border text-sm transition-colors",
              compact ? "px-2 py-2.5 lg:px-3" : "min-h-11 px-3 py-2",
              pathname.includes("/pacing")
                ? "border-gold/35 bg-gold/12 text-gold shadow-[0_0_0_1px_rgba(201,168,76,0.15)]"
                : "border-transparent text-editorial-muted hover:border-border/60 hover:bg-muted/35 hover:text-editorial-cream",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-editorial-bg/70",
                compact ? "h-9 w-9" : "h-11 w-11",
              )}
            >
              <Activity className="h-4 w-4" aria-hidden />
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-medium",
                compact ? "hidden lg:inline" : "inline",
              )}
            >
              Pacing
            </span>
          </Link>
        ) : null}
      </nav>

      <div className={cn("shrink-0 border-t border-border/60", compact ? "p-2 lg:p-3" : "p-3")}>
        <Link
          prefetch
          href="/dashboard/settings"
          className={cn(
            "mb-1 flex items-center gap-2 rounded-lg text-xs font-medium text-editorial-muted transition hover:bg-muted/30 hover:text-gold",
            compact ? "justify-center py-2 lg:justify-start lg:px-3 lg:text-sm" : "min-h-11 px-3 py-2 text-sm",
          )}
          onClick={onNavigate}
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(compact ? "hidden lg:inline" : "inline")}>Settings</span>
        </Link>
        <Link
          prefetch
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-lg text-xs font-medium text-editorial-muted transition hover:bg-muted/30 hover:text-gold",
            compact ? "justify-center py-2 lg:justify-start lg:px-3 lg:text-sm" : "min-h-11 px-3 py-2 text-sm",
          )}
          onClick={onNavigate}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn(compact ? "hidden lg:inline" : "inline")}>Back to Dashboard</span>
        </Link>
      </div>

      <div className={cn("shrink-0 border-t border-border/60", compact ? "p-2 lg:p-3" : "p-3")}>
        <div
          className={cn(
            "flex gap-2",
            compact ? "flex-col items-center lg:flex-row lg:items-center" : "flex-row items-center",
          )}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-editorial-bg text-xs font-semibold text-gold">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className={cn("min-w-0 flex-1", compact ? "hidden lg:block" : "block")}>
            <p className="truncate text-sm font-medium text-editorial-cream">
              {profile.fullName?.trim() || profile.email}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                profile.subscriptionTier === "pro"
                  ? "bg-gold/20 text-gold"
                  : "bg-muted text-editorial-muted",
              )}
            >
              {profile.subscriptionTier === "pro" ? "Pro" : "Free"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const mobileOpen = useProjectSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useProjectSidebarStore((s) => s.setMobileOpen);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <div className="md:hidden" aria-hidden={!mobileOpen}>
        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-[1px]"
              aria-label="Close menu"
              onClick={closeMobile}
            />
            <aside
              className="fixed inset-y-0 left-0 z-[60] flex h-[100dvh] w-[min(280px,100vw)] flex-col border-r border-border/70 bg-card/95 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Project navigation"
            >
              <SidebarBody compact={false} onNavigate={closeMobile} />
            </aside>
          </>
        ) : null}
      </div>

      <aside
        className={cn(
          "hidden h-full min-h-0 w-16 shrink-0 flex-col border-r border-border/70 bg-card/50 md:flex md:flex-col lg:w-[240px]",
        )}
      >
        <SidebarBody compact />
      </aside>
    </>
  );
}

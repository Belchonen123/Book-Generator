"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  CreditCard,
  Library,
  LogOut,
  Settings,
  UserRound,
} from "@/lib/lucide-icons";
import { toast } from "sonner";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

function LogoMark() {
  return (
    <Link
      prefetch
      href="/dashboard"
      className="font-serif text-lg font-semibold tracking-tight text-gold transition-opacity hover:opacity-90"
    >
      ChapterAI
    </Link>
  );
}

export type HeaderProps = {
  title: string;
  /**
   * Number of series in status='active'. Renders as a small gold badge next
   * to the "Series" nav link when > 0; hidden otherwise to keep the nav
   * clean for users who haven't started a series yet.
   */
  activeSeriesCount?: number;
};

export function Header({ title, activeSeriesCount = 0 }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const profile = useDashboardProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const seriesActive = pathname.startsWith("/dashboard/series");

  const initials =
    profile.fullName?.trim()?.charAt(0)?.toUpperCase() ??
    profile.email?.charAt(0)?.toUpperCase() ??
    "?";

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.replace("/login");
    router.refresh();
  };

  const onBilling = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Billing portal unavailable.");
    } finally {
      setBillingLoading(false);
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-editorial-bg/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="flex w-28 shrink-0 items-center gap-3 sm:w-36">
          <LogoMark />
        </div>
        <h1 className="min-w-0 flex-1 text-center font-serif text-lg font-medium text-editorial-cream sm:text-xl">
          {title}
        </h1>
        <nav
          aria-label="Primary"
          className="hidden shrink-0 items-center gap-1 sm:flex"
        >
          <Link
            prefetch
            href="/dashboard/series"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              seriesActive
                ? "bg-gold/15 text-gold"
                : "text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream",
            )}
          >
            <Library className="h-4 w-4" aria-hidden />
            Series
            {activeSeriesCount > 0 ? (
              <span
                className={cn(
                  "ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  seriesActive
                    ? "bg-gold text-editorial-bg"
                    : "bg-gold/20 text-gold",
                )}
                aria-label={`${activeSeriesCount} active series`}
                title={`${activeSeriesCount} active series`}
              >
                {activeSeriesCount > 99 ? "99+" : activeSeriesCount}
              </span>
            ) : null}
          </Link>
        </nav>
        <div className="relative flex w-28 shrink-0 justify-end sm:w-36" ref={menuRef}>
          <button
            type="button"
            className={cn(
              "relative flex h-10 w-10 max-md:min-h-[44px] max-md:min-w-[44px] items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-gold transition hover:border-gold/40",
              menuOpen && "border-gold/50 ring-2 ring-gold/20",
            )}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default bg-transparent"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-12 z-40 min-w-[200px] rounded-lg border border-border bg-card py-1 shadow-xl"
                role="menu"
              >
                <Link
                  prefetch
                  href="/profile"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-cream hover:bg-muted/50"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound className="h-4 w-4 text-gold" aria-hidden />
                  Profile
                </Link>
                <Link
                  prefetch
                  href="/dashboard/settings"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-cream hover:bg-muted/50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 text-gold" aria-hidden />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  disabled={billingLoading}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-editorial-cream hover:bg-muted/50 disabled:opacity-50"
                  onClick={() => void onBilling()}
                >
                  <CreditCard className="h-4 w-4 text-gold" aria-hidden />
                  {billingLoading ? "Opening…" : "Billing"}
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-editorial-cream hover:bg-muted/50"
                  onClick={() => void onSignOut()}
                >
                  <LogOut className="h-4 w-4 text-editorial-muted" aria-hidden />
                  Sign out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

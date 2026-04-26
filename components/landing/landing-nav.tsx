import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function LandingNav({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/70 bg-editorial-bg/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight text-gold sm:text-2xl"
        >
          ChapterAI
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-editorial-muted md:flex">
          <a
            href="#features"
            className="transition-colors hover:text-editorial-cream"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="transition-colors hover:text-editorial-cream"
          >
            Pricing
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-editorial-cream"
          >
            How it Works
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <nav className="flex max-w-[55vw] items-center justify-end gap-1 text-xs font-medium text-editorial-muted md:hidden">
            <a
              href="#features"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1 hover:bg-muted/30 hover:text-editorial-cream"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1 hover:bg-muted/30 hover:text-editorial-cream"
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-1 hover:bg-muted/30 hover:text-editorial-cream"
            >
              How
            </a>
          </nav>
          <Button
            asChild
            className="bg-gold px-3 text-xs font-semibold text-editorial-bg shadow-sm hover:bg-gold/90 sm:px-4 sm:text-sm"
          >
            <Link href="/signup">Start Writing Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

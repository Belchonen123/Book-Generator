import Link from "next/link";

import { Button } from "@/components/ui/button";

import { GenreCycle } from "./genre-cycle";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(201,168,76,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="reveal-scroll text-xs font-semibold uppercase tracking-[0.2em] text-gold/90">
          AI book studio
        </p>
        <h1 className="reveal-scroll mt-5 font-serif text-[clamp(2.25rem,6vw+1rem,4.5rem)] font-semibold leading-[1.1] tracking-tight text-editorial-cream">
          Your Book.
          <br />
          Written.
        </h1>
        <p className="reveal-scroll mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-editorial-muted sm:text-xl">
          Turn a rough idea into a structured outline, full-length chapters, a
          professional cover, and a print-ready{" "}
          <span className="text-editorial-cream">.docx</span>—then walk into
          Kindle Direct Publishing with confidence. One calm workflow from pitch
          to publish.
        </p>
        <p className="reveal-scroll mt-8 text-base text-editorial-muted sm:text-lg">
          Built for every kind of book—including your next{" "}
          <GenreCycle />
          <span className="text-editorial-cream">.</span>
        </p>
        <div className="reveal-scroll mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <Button
            asChild
            size="lg"
            className="min-w-[200px] bg-gold text-base font-semibold text-editorial-bg hover:bg-gold/90"
          >
            <Link href="/signup">Start Free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-w-[200px] border-border text-editorial-cream hover:bg-secondary hover:text-editorial-cream"
          >
            <a href="#how-it-works">See How it Works</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

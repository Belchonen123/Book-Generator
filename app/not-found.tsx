import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-editorial-bg px-4 py-16 text-center text-editorial-cream">
      <p className="font-serif text-sm font-medium uppercase tracking-[0.2em] text-gold/90">
        ChapterAI
      </p>
      <h1 className="mt-4 font-serif text-4xl font-semibold text-gold sm:text-5xl">404</h1>
      <p className="mt-4 text-lg text-editorial-cream">This page doesn&apos;t exist</p>
      <blockquote className="mx-auto mt-8 max-w-lg border-l-2 border-gold/40 pl-5 text-left text-sm italic leading-relaxed text-editorial-muted">
        &ldquo;I have always imagined that Paradise will be a kind of library.&rdquo;
        <footer className="mt-2 not-italic text-xs text-gold/80">— Jorge Luis Borges</footer>
      </blockquote>
      <Button
        asChild
        className="mt-10 bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
      >
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

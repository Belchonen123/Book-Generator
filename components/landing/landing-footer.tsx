import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/70 bg-editorial-bg px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <p className="font-serif text-2xl font-semibold text-gold">ChapterAI</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-editorial-muted">
            Built for writers. Powered by AI.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-editorial-muted">
          <a href="#features" className="hover:text-editorial-cream">
            Features
          </a>
          <a href="#pricing" className="hover:text-editorial-cream">
            Pricing
          </a>
          <a href="#how-it-works" className="hover:text-editorial-cream">
            How it Works
          </a>
          <Link href="/login" className="hover:text-editorial-cream">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-editorial-cream">
            Sign up
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-center text-xs text-editorial-muted/80">
        © {new Date().getFullYear()} ChapterAI. Kindle Direct Publishing and
        Amazon are trademarks of Amazon.com, Inc. ChapterAI is not affiliated
        with Amazon.
      </p>
    </footer>
  );
}

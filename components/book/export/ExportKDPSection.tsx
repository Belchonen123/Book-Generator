import type { ReactNode } from "react";
import {
  BookOpen,
  DollarSign,
  Eye,
  FileUp,
  Globe,
  Grid3x3,
  ImageIcon,
  Languages,
  Lightbulb,
  PenLine,
  Rocket,
  Sparkles,
  Tags,
  TrendingUp,
  UserPlus,
} from "@/lib/lucide-icons";
import Link from "next/link";

const KDP_BASE = "https://kdp.amazon.com";

const stepCards: {
  n: number;
  Icon: typeof UserPlus;
  children: ReactNode;
}[] = [
  {
    n: 1,
    Icon: UserPlus,
    children: (
      <>
        Create your KDP account at{" "}
        <Link
          href={KDP_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gold underline-offset-2 hover:underline"
        >
          kdp.amazon.com
        </Link>
      </>
    ),
  },
  {
    n: 2,
    Icon: BookOpen,
    children: <>Click &quot;Create&quot; → Kindle eBook or Paperback</>,
  },
  {
    n: 3,
    Icon: PenLine,
    children: <>Enter your book title, subtitle, author name, and description</>,
  },
  {
    n: 4,
    Icon: Languages,
    children: <>Set language, publication date, and add relevant keywords (7 allowed)</>,
  },
  {
    n: 5,
    Icon: Grid3x3,
    children: <>Choose 2 categories that best match your book</>,
  },
  {
    n: 6,
    Icon: FileUp,
    children: (
      <>
        Upload your manuscript (.docx is accepted — upload the file you just downloaded from
        ChapterAI)
      </>
    ),
  },
  {
    n: 7,
    Icon: Eye,
    children: <>Use KDP&apos;s previewer to review formatting</>,
  },
  {
    n: 8,
    Icon: ImageIcon,
    children: <>Upload your cover image (minimum 2560 × 1600px — use the cover you generated)</>,
  },
  {
    n: 9,
    Icon: DollarSign,
    children: (
      <>Set your pricing (70% royalty available for books priced $2.99–$9.99)</>
    ),
  },
  {
    n: 10,
    Icon: Globe,
    children: <>Select territories (choose &quot;worldwide&quot; unless you have regional restrictions)</>,
  },
  {
    n: 11,
    Icon: Rocket,
    children: <>Click &quot;Publish&quot; — your book goes live within 24–72 hours</>,
  },
];

export function ExportKDPSection() {
  return (
    <section className="mt-14 border-t border-editorial-muted/25 pt-12">
      <h2 className="font-serif text-2xl text-gold sm:text-3xl">
        What&apos;s Next — Publishing on Amazon KDP
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-editorial-muted">
        Follow these steps on{" "}
        <Link
          href={KDP_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline-offset-2 hover:underline"
        >
          Kindle Direct Publishing
        </Link>{" "}
        to take your manuscript from download to live listing.
      </p>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {stepCards.map(({ n, Icon, children }) => (
          <li
            key={n}
            className="flex gap-4 rounded-xl border border-editorial-muted/20 bg-editorial-card/80 p-5 shadow-sm backdrop-blur-sm"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-gold/90">
                Step {n}
              </span>
              <p className="mt-1 text-sm leading-relaxed text-editorial-cream">{children}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-5">
          <div className="flex items-center gap-2 text-gold">
            <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-editorial-cream">Keyword research</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
            Mix single words with short phrases readers actually search (e.g. genre + trope +
            setting). Reuse terms from your description; avoid stuffing unrelated buzzwords.
          </p>
        </div>
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-5">
          <div className="flex items-center gap-2 text-gold">
            <TrendingUp className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-editorial-cream">Pricing strategy</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
            For the 70% royalty band, stay within $2.99–$9.99. Launch slightly lower to gather
            early reviews, then nudge up once social proof is in place.
          </p>
        </div>
        <div className="rounded-xl border border-gold/25 bg-gold/5 p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-gold">
            <Tags className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-semibold text-editorial-cream">Category selection</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
            Pick the two BISAC-style categories that best fit your story — one broad, one niche.
            Misleading categories hurt conversions and can trigger KDP quality checks.
          </p>
        </div>
      </div>

      <p className="mt-8 flex flex-wrap items-center gap-2 text-xs text-editorial-muted">
        <Sparkles className="h-4 w-4 shrink-0 text-gold/80" aria-hidden />
        <span>
          Use the <strong className="text-editorial-cream">KDP listing pack</strong> at the top of
          this page for AI-generated listing copy and a downloadable publishing walkthrough (ZIP).
          Listing text is also saved to your project when you generate that pack.
        </span>
      </p>
    </section>
  );
}

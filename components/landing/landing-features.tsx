import {
  BookOpenCheck,
  FileDown,
  ImageIcon,
  MessagesSquare,
  PencilLine,
  Route,
} from "@/lib/lucide-icons";

const features = [
  {
    title: "AI Idea Refinement",
    body: "A patient editorial dialogue that pulls out audience, stakes, and voice—then hands you a crisp brief you can trust.",
    icon: MessagesSquare,
  },
  {
    title: "Chapter-by-Chapter Generation",
    body: "Outline-first drafting with streaming output, so each chapter lands with intent instead of wandering filler.",
    icon: BookOpenCheck,
  },
  {
    title: "Inline Editing",
    body: "Bold, headings, and a familiar editor surface—tighten prose where it matters without fighting the toolchain.",
    icon: PencilLine,
  },
  {
    title: "DALL-E Cover Art",
    body: "Brief-driven cover prompts tuned for genre shelves, then high-resolution art you can drop into KDP specs.",
    icon: ImageIcon,
  },
  {
    title: "One-Click .docx Export",
    body: "Title page, table of contents, and chapter breaks compiled server-side—download and upload, not rebuild from scratch.",
    icon: FileDown,
  },
  {
    title: "KDP Publishing Guide",
    body: "Step-by-step Amazon KDP guidance matched to your book: categories, keywords, pricing bands, and cover dimensions.",
    icon: Route,
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-scroll mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-editorial-cream sm:text-4xl">
            Everything a serious draft needs
          </h2>
          <p className="mt-4 text-editorial-muted">
            ChapterAI is built for authors who want manuscript-grade output—not a
            toy chat window that forgets yesterday&apos;s plot twist.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.title}
                className="reveal-scroll group rounded-xl border border-border/80 bg-card/50 p-6 transition-colors hover:border-gold/35 hover:bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/10 text-gold transition-colors group-hover:bg-gold/15">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-editorial-cream">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
                  {f.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

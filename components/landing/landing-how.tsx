import {
  BookOpen,
  ListOrdered,
  MessageSquareText,
  Rocket,
  Wand2,
} from "@/lib/lucide-icons";

const steps = [
  {
    n: 1,
    title: "Pitch Your Idea",
    body: "Drop a paragraph or a messy brain-dump. ChapterAI captures tone, audience, and what success looks like for this book.",
    icon: MessageSquareText,
  },
  {
    n: 2,
    title: "Refine the Concept",
    body: "A focused editorial chat sharpens premise, genre, and promise—so the manuscript has a spine before a single chapter ships.",
    icon: Wand2,
  },
  {
    n: 3,
    title: "Approve the Outline",
    body: "Drag-and-drop structure, edit chapter cards, then lock an outline that every later chapter will honor.",
    icon: ListOrdered,
  },
  {
    n: 4,
    title: "Generate Chapters",
    body: "Stream full chapters in your voice, revise in the editor, and keep continuity tight as the page count climbs.",
    icon: BookOpen,
  },
  {
    n: 5,
    title: "Publish on Amazon",
    body: "Export a polished .docx, pair it with a DALL·E cover, and follow a KDP-ready checklist straight into Kindle Direct Publishing.",
    icon: Rocket,
  },
] as const;

export function LandingHow() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-b border-border/60 bg-editorial-card/30 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-scroll mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-editorial-cream sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-editorial-muted">
            Five deliberate stages—no blank-page paralysis, no fifty-tab chaos.
            You steer; the model drafts.
          </p>
        </div>
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.n}
                className="reveal-scroll relative rounded-xl border border-border/80 bg-card/60 p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="mt-4 block font-serif text-sm font-semibold text-gold">
                  Step {step.n}
                </span>
                <h3 className="mt-1 font-serif text-lg font-semibold text-editorial-cream">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

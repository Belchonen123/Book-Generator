import Link from "next/link";
import { Check } from "@/lib/lucide-icons";

import { Button } from "@/components/ui/button";

import { ProCheckoutButton } from "./pro-checkout-button";

const freeFeatures = [
  "Up to 3 active books",
  "Up to 10 chapters per book",
  "Idea refinement chat",
  "Outline editor & approval flow",
  "Chapter streaming & editor",
];

const proFeatures = [
  "Unlimited books",
  "Unlimited chapters",
  "Everything in Free",
  "Priority generation queue",
  "Remove “Published with ChapterAI” from exports (when enabled)",
];

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-t border-border/60 bg-editorial-card/25 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-scroll mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-editorial-cream sm:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-4 text-editorial-muted">
            Start free while you prove the workflow. Move to Pro when the
            manuscript—and your ambition—outgrow the caps.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="reveal-scroll flex flex-col rounded-2xl border border-border/80 bg-card/60 p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-editorial-muted">
              Free
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold text-editorial-cream">
              $0
            </p>
            <p className="mt-2 text-sm text-editorial-muted">
              For writers validating tone, structure, and pace before they scale
              up.
            </p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-editorial-cream">
              {freeFeatures.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant="outline"
              className="mt-10 border-border text-editorial-cream hover:bg-secondary hover:text-editorial-cream"
            >
              <Link href="/signup">Start Writing Free</Link>
            </Button>
          </div>
          <div className="reveal-scroll relative flex flex-col overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/10 to-card p-8 shadow-md">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              Pro
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold text-editorial-cream">
              $19
              <span className="text-lg font-normal text-editorial-muted">
                /month
              </span>
            </p>
            <p className="mt-2 text-sm text-editorial-muted">
              When you are shipping multiple titles or long nonfiction without
              chapter ceilings.
            </p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-editorial-cream">
              {proFeatures.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {line}
                </li>
              ))}
            </ul>
            <ProCheckoutButton />
            <p className="mt-4 text-center text-xs text-editorial-muted">
              Secure checkout powered by Stripe. You can manage billing anytime
              from your account.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

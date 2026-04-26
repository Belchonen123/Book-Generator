"use client";

import { Check, Ruler } from "@/lib/lucide-icons";

import { TRIM_SIZE_OPTIONS } from "@/lib/docx/trim-sizes";
import type { TrimSizeId } from "@/lib/utils/schemas";

type Props = {
  value: TrimSizeId;
  onChange: (next: TrimSizeId) => void;
  disabled?: boolean;
};

export function TrimSizeSelector({ value, onChange, disabled }: Props) {
  return (
    <section
      aria-labelledby="trim-size-heading"
      className="relative z-10 mx-auto mt-10 max-w-3xl rounded-2xl border border-editorial-muted/25 bg-editorial-card/60 p-6 shadow-sm"
    >
      <header className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <Ruler className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold/90">
            Book Size
          </p>
          <h3
            id="trim-size-heading"
            className="mt-0.5 font-serif text-lg text-editorial-cream sm:text-xl"
          >
            Choose your trim size
          </h3>
        </div>
      </header>

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-editorial-muted">
        Pick the page size your manuscript will ship in. Margins, chapter
        openers, sidebars, and running headers all adjust automatically to look
        beautiful at the size you choose. Default is{" "}
        <strong className="text-editorial-cream">US Letter (8.5 x 11 in)</strong>.
      </p>

      <div
        role="radiogroup"
        aria-labelledby="trim-size-heading"
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        {TRIM_SIZE_OPTIONS.map((opt) => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={selected}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={[
                "group relative flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition",
                selected
                  ? "border-gold/70 bg-gold/10 shadow-[0_0_0_1px_rgba(201,168,76,0.4)]"
                  : "border-editorial-muted/25 bg-editorial-bg/50 hover:border-gold/40 hover:bg-editorial-bg/70",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="font-serif text-base text-editorial-cream">
                  {opt.label}
                </span>
                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full border transition",
                    selected
                      ? "border-gold bg-gold text-editorial-bg"
                      : "border-editorial-muted/50 bg-transparent text-transparent",
                  ].join(" ")}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              </div>
              <p className="text-xs leading-snug text-editorial-muted">
                {opt.description}
              </p>
              <p className="text-[11px] uppercase tracking-widest text-gold/80">
                {opt.widthIn.toFixed(2)} &times; {opt.heightIn.toFixed(2)} in
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

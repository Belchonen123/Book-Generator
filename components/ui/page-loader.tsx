import { Loader2 } from "@/lib/lucide-icons";

type Props = {
  label?: string;
  /**
   * When true (default) the loader fills the viewport. Set false to render it
   * inline inside a card / panel.
   */
  fullScreen?: boolean;
};

/**
 * Branded loading placeholder used by route-level `loading.tsx` files and
 * any async boundary that doesn't already render a tailored skeleton. Keeps
 * the UI from feeling frozen while a screen compiles or fetches.
 */
export function PageLoader({
  label = "Loading…",
  fullScreen = true,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-editorial-muted"
          : "flex flex-col items-center justify-center gap-3 py-8 text-editorial-muted"
      }
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-gold/15 motion-reduce:animate-none"
        />
        <span
          aria-hidden
          className="absolute inset-1 rounded-full border border-gold/30"
        />
        <Loader2
          className="h-7 w-7 animate-spin text-gold motion-reduce:animate-none"
          aria-hidden
        />
      </div>
      <p className="font-serif text-sm tracking-wide text-editorial-cream/90">
        {label}
      </p>
      <span className="sr-only">Loading, please wait.</span>
    </div>
  );
}

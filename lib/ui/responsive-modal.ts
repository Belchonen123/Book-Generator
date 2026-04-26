import { cn } from "@/lib/utils/cn";

/** Full-viewport flex shell: mobile bottom sheet, desktop centered dialog. */
export function responsiveModalRoot(className?: string) {
  return cn(
    "fixed inset-0 flex max-md:items-end md:items-center max-md:justify-stretch md:justify-center max-md:p-0 md:p-4",
    className,
  );
}

export function responsiveModalBackdrop() {
  return "absolute inset-0 bg-black/70 max-md:backdrop-blur-[1px]";
}

/** Scrollable panel: near full-screen on mobile (bottom sheet), card on md+. */
export function responsiveModalPanel(className?: string) {
  return cn(
    "relative z-10 w-full overflow-y-auto border border-border bg-card shadow-2xl",
    "max-md:max-h-[100dvh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:border-t",
    "md:max-h-[min(90vh,900px)] md:rounded-xl",
    className,
  );
}

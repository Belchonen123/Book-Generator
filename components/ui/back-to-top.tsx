"use client";

import { ArrowUp } from "@/lib/lucide-icons";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const THRESHOLD_PX = 400;

type BackToTopProps = {
  /** When set, listen to this element’s scroll; otherwise use the window. */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  /** Re-bind when layout changes (e.g. chapter id) so ref points at the new scroll container. */
  bindKey?: string | number;
  className?: string;
};

export function BackToTop({ scrollContainerRef, bindKey, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    if (scrollContainerRef?.current) {
      setVisible(scrollContainerRef.current.scrollTop > THRESHOLD_PX);
      return;
    }
    setVisible(window.scrollY > THRESHOLD_PX);
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (el) {
      el.addEventListener("scroll", update, { passive: true });
      update();
      return () => el.removeEventListener("scroll", update);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [scrollContainerRef, bindKey, update]);

  const scrollTop = useCallback(() => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollContainerRef]);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      aria-label="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full border border-gold/35 bg-card/95 text-gold shadow-lg backdrop-blur-sm transition hover:bg-gold/15",
        className,
      )}
      onClick={scrollTop}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </Button>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[project-error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-serif text-2xl text-gold">This project hit a snag</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-editorial-muted">
        Refresh the page or return to your dashboard. If the problem continues, try again in a few
        minutes.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Button type="button" variant="outline" className="border-gold/40 text-editorial-cream" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

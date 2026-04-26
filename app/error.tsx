"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-editorial-bg px-4 py-16 font-sans text-editorial-cream antialiased">
      <div className="max-w-md text-center">
        <p className="font-serif text-2xl text-gold">Something went wrong</p>
        <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
          We hit an unexpected error. Your work is likely safe — try again, or head back to your
          library.
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
    </div>
  );
}

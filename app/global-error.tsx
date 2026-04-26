"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-editorial-bg px-4 font-sans text-editorial-cream antialiased">
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
      </body>
    </html>
  );
}

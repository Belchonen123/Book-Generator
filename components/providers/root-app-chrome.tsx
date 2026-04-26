"use client";

import { NavigationProgressBar } from "@/components/providers/navigation-progress-bar";
import { PageTransition } from "@/components/providers/page-transition";

export function RootAppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavigationProgressBar />
      <PageTransition>{children}</PageTransition>
    </>
  );
}

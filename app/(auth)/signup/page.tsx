import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { SignupForm } from "./signup-form";

const DESC =
  "Create a free ChapterAI account to plan your book, refine ideas with AI, and draft chapters for Kindle Direct Publishing.";

export const metadata: Metadata = {
  title: "Create account",
  description: DESC,
  alternates: {
    canonical: "/signup",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Create account | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/signup`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create account | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

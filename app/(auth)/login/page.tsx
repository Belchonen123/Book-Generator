import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { LoginForm } from "./login-form";

const DESC =
  "Sign in to ChapterAI to continue writing, generate chapters with AI, and export your book for Amazon KDP.";

export const metadata: Metadata = {
  title: "Sign in",
  description: DESC,
  alternates: {
    canonical: "/login",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sign in | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/login`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign in | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

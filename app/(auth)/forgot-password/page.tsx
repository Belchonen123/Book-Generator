import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { ForgotPasswordForm } from "./forgot-password-form";

const DESC =
  "Reset your ChapterAI password — we'll email a secure link to set a new one.";

export const metadata: Metadata = {
  title: "Reset password",
  description: DESC,
  alternates: {
    canonical: "/forgot-password",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Reset password | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/forgot-password`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reset password | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loading…
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}

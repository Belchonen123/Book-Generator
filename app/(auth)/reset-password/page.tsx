import type { Metadata } from "next";
import { Suspense } from "react";

import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { ResetPasswordForm } from "./reset-password-form";

const DESC = "Choose a new password for your ChapterAI account.";

export const metadata: Metadata = {
  title: "Set new password",
  description: DESC,
  alternates: {
    canonical: "/reset-password",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Set new password | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/reset-password`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Set new password | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card/80 p-8 text-center text-editorial-muted">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

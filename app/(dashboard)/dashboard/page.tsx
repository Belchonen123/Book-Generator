import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardGridSkeleton } from "@/components/layout/skeletons";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

import { DashboardContent } from "./_components/dashboard-content";

const DESC =
  "Manage your manuscripts, start new books, and open projects to write with ChapterAI.";

export const metadata: Metadata = {
  title: "Your Books",
  description: DESC,
  alternates: {
    canonical: "/dashboard",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your Books | ChapterAI",
    description: DESC,
    url: `${siteUrlString()}/dashboard`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Books | ChapterAI",
    description: DESC,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardGridSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

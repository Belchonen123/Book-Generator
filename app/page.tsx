import type { Metadata } from "next";

import { LandingJsonLd } from "@/components/landing/landing-json-ld";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { SITE_DESCRIPTION } from "@/lib/seo/constants";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "ChapterAI — From idea to KDP-ready manuscript",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ChapterAI — From idea to KDP-ready manuscript",
    description: SITE_DESCRIPTION,
    url: siteUrlString(),
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ChapterAI" }],
  },
  twitter: {
    title: "ChapterAI — From idea to KDP-ready manuscript",
    description: SITE_DESCRIPTION,
    images: [`${metadataBaseUrl().origin}/og-image.png`],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-cream">
      <LandingJsonLd />
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHow />
        <LandingFeatures />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}

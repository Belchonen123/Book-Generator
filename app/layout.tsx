import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

import { OfflineServiceWorkerAndBanner } from "@/components/providers/offline-service-worker";
import { RootAppChrome } from "@/components/providers/root-app-chrome";
import { SITE_DESCRIPTION } from "@/lib/seo/constants";
import { metadataBaseUrl, siteUrlString } from "@/lib/seo/site-url";

const base = metadataBaseUrl();
const origin = siteUrlString();

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--next-dm-sans",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--next-playfair",
});

export const metadata: Metadata = {
  metadataBase: base,
  title: {
    default: "ChapterAI",
    template: "%s | ChapterAI",
  },
  description: SITE_DESCRIPTION,
  applicationName: "ChapterAI",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: origin,
    siteName: "ChapterAI",
    title: "ChapterAI",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChapterAI — AI-assisted book writing for KDP authors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChapterAI",
    description: SITE_DESCRIPTION,
    images: [`${origin}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-editorial-bg font-sans text-editorial-cream antialiased">
        <RootAppChrome>{children}</RootAppChrome>
        <OfflineServiceWorkerAndBanner />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

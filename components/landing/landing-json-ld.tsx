import { SITE_DESCRIPTION } from "@/lib/seo/constants";
import { siteUrlString } from "@/lib/seo/site-url";

export function LandingJsonLd() {
  const url = siteUrlString();
  const structured = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ChapterAI",
    description: SITE_DESCRIPTION,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier with paid Pro upgrade",
    },
    url,
    image: `${url}/og-image.png`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
    />
  );
}

import type { MetadataRoute } from "next";

import { siteUrlString } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrlString();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/projects", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

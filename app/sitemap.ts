import type { MetadataRoute } from "next";

import { siteUrlString } from "@/lib/seo/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrlString();
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}

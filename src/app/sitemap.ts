import type { MetadataRoute } from "next";
import { SITE_URL, TOOLS } from "@/lib/site";

/** No timestamps, so the sitemap prerenders as a static file. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...TOOLS.map((tool) => ({ url: `${SITE_URL}/${tool.slug}`, changeFrequency: "monthly" as const, priority: tool.localOnly ? 0.6 : 0.9 })),
    { url: `${SITE_URL}/api`, changeFrequency: "monthly", priority: 0.7 },
  ];
}

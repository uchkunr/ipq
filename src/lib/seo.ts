import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, toolBySlug } from "@/lib/site";

/** Title, description, canonical and social tags for one tool page. */
export function toolMetadata(slug: string, title?: string): Metadata {
  const tool = toolBySlug(slug);
  if (!tool) return {};
  const pageTitle = title ?? tool.name;
  return {
    title: pageTitle,
    description: tool.short,
    keywords: tool.keywords,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: `${pageTitle} – ${SITE_NAME}`,
      description: tool.short,
      url: `${SITE_URL}/${slug}`,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${pageTitle} – ${SITE_NAME}`, description: tool.short },
  };
}

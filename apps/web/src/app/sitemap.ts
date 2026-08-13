import type { MetadataRoute } from "next";
import { penPalResources } from "@/lib/content/pen-pal-resources";
import { speakingGuides } from "@/lib/content/speaking-guides";
import { absoluteSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteSiteUrl("/")
    },
    { url: absoluteSiteUrl("/how-it-works") },
    { url: absoluteSiteUrl("/guides") },
    ...speakingGuides.map((guide) => ({ url: absoluteSiteUrl(`/guides/${guide.slug}`) })),
    { url: absoluteSiteUrl("/pen-pals") },
    ...penPalResources.map((resource) => ({ url: absoluteSiteUrl(`/pen-pals/${resource.slug}`) }))
  ];
}

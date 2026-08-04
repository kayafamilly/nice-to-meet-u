import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteSiteUrl("/"),
      images: [
        absoluteSiteUrl("/people/maya-language-session.png"),
        absoluteSiteUrl("/people/kenji-language-session.png"),
        absoluteSiteUrl("/people/amina-language-session.png"),
        absoluteSiteUrl("/people/ben-language-session.png")
      ]
    },
    { url: absoluteSiteUrl("/how-it-works") }
  ];
}

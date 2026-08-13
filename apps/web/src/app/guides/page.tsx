import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { speakingGuides } from "@/lib/content/speaking-guides";

const description = "Practical speaking-practice guides for Spanish, English, French, German, Japanese, and Korean learners.";

export const metadata: Metadata = {
  title: "Language Speaking Practice Guides",
  description,
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Language Speaking Practice Guides | NiceToMeetU",
    description,
    url: "/guides",
    siteName: "NiceToMeetU",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Illustration of a small online language practice group" }]
  },
  twitter: { card: "summary_large_image", title: "Language Speaking Practice Guides | NiceToMeetU", description, images: ["/og.png"] }
};

export default function SpeakingGuidesPage() {
  return (
    <main>
      <SiteHeader />
      <section className="shell page-shell guide-index">
        <p className="eyebrow">Speaking practice resources</p>
        <h1 className="page-title editorial">Make room for the conversations that move a language forward.</h1>
        <p className="hero-copy">Choose a language, use a practical guide, and build a simple 30-minute conversation plan before you practise with other learners.</p>
        <section className="resource-bridge card soft" aria-labelledby="pen-pal-resource-link">
          <h2 id="pen-pal-resource-link">Already enjoy cultural exchange by message?</h2>
          <p>Use a pen pal conversation topic as the starting point for your next live practice session.</p>
          <Link className="text-link" href={"/pen-pals" as Route}>Explore pen pal resources <span aria-hidden="true">→</span></Link>
        </section>
        <div className="guide-grid">
          {speakingGuides.map((guide) => (
            <article className="guide-card card" key={guide.slug}>
              <p className="eyebrow">{guide.language}</p>
              <h2>{guide.seoTitle}</h2>
              <p>{guide.seoDescription}</p>
              <Link className="text-link" href={`/guides/${guide.slug}` as Route}>Read the {guide.language} guide <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

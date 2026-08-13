import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { penPalResources } from "@/lib/content/pen-pal-resources";

const description = "Original resources for adults who want online pen pals, meaningful cultural exchange, and regular language speaking practice.";

export const metadata: Metadata = {
  title: "Online Pen Pals and Language Exchange",
  description,
  alternates: { canonical: "/pen-pals" },
  openGraph: {
    title: "Online Pen Pals and Language Exchange | NiceToMeetU",
    description,
    url: "/pen-pals",
    siteName: "NiceToMeetU",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Illustration of a small international language practice group" }]
  },
  twitter: { card: "summary_large_image", title: "Online Pen Pals and Language Exchange | NiceToMeetU", description, images: ["/og.png"] }
};

export default function PenPalHubPage() {
  return (
    <main>
      <SiteHeader />
      <section className="shell page-shell guide-index">
        <p className="eyebrow">Language exchange resources</p>
        <h1 className="page-title editorial">Keep the curiosity of a pen pal exchange moving forward.</h1>
        <p className="hero-copy">Writing to someone in another place can open a window into language and culture. These practical resources help adults build respectful exchanges, find better questions, and add regular speaking practice when they are ready.</p>
        <section className="resource-bridge card soft" aria-labelledby="pen-pal-hub-boundary">
          <h2 id="pen-pal-hub-boundary">From correspondence to conversation</h2>
          <p>NiceToMeetU is not a private pen-pal directory. It is a place for adult learners to practise live in small international groups, with one language and one focused 30-minute conversation at a time.</p>
          <Link className="text-link" href={"/guides" as Route}>Explore language speaking guides <span aria-hidden="true">→</span></Link>
        </section>
        <div className="guide-grid">
          {penPalResources.map((resource) => (
            <article className="guide-card card" key={resource.slug}>
              <p className="eyebrow">Pen pal resource</p>
              <h2>{resource.label}</h2>
              <p>{resource.seoDescription}</p>
              <Link className="text-link" href={`/pen-pals/${resource.slug}` as Route}>Read the guide <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

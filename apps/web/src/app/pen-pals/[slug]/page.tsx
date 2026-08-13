import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PenPalPromptPicker } from "@/components/pen-pal-prompt-picker";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { penPalResourceForSlug, penPalResources, type PenPalResource } from "@/lib/content/pen-pal-resources";
import { absoluteSiteUrl } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return penPalResources.map((resource) => ({ slug: resource.slug }));
}

function resourceForParams(params: { slug: string }): PenPalResource {
  const resource = penPalResourceForSlug(params.slug);
  if (!resource) notFound();
  return resource;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resource = resourceForParams(await params);
  const path = `/pen-pals/${resource.slug}`;

  return {
    title: resource.seoTitle,
    description: resource.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      title: `${resource.seoTitle} | NiceToMeetU`,
      description: resource.seoDescription,
      url: path,
      siteName: "NiceToMeetU",
      locale: "en_US",
      type: "article",
      images: [{ url: "/og.png", width: 1672, height: 941, alt: "Illustration of a small international language practice group" }]
    },
    twitter: { card: "summary_large_image", title: `${resource.seoTitle} | NiceToMeetU`, description: resource.seoDescription, images: ["/og.png"] }
  };
}

function articleStructuredData(resource: PenPalResource) {
  const canonicalUrl = absoluteSiteUrl(`/pen-pals/${resource.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: resource.h1,
    description: resource.seoDescription,
    mainEntityOfPage: canonicalUrl,
    inLanguage: "en",
    publisher: { "@id": `${absoluteSiteUrl()}#organization` }
  };
}

export default async function PenPalResourcePage({ params }: PageProps) {
  const resource = resourceForParams(await params);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = JSON.stringify(articleStructuredData(resource)).replaceAll("<", "\\u003c");
  const relatedGuidePath = `/guides/${resource.relatedGuideSlug}` as Route;

  return (
    <main>
      <SiteHeader />
      <article className="shell page-shell guide-page">
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
        <p className="eyebrow">Pen pal and language exchange</p>
        <h1 className="page-title editorial">{resource.h1}</h1>
        <p className="guide-introduction">{resource.introduction}</p>
        <div className="guide-content">
          {resource.sections.map((section) => (
            <section className="guide-section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </div>
        {resource.promptGroups ? <PenPalPromptPicker groups={resource.promptGroups} /> : null}
        <section className="resource-bridge card soft" aria-labelledby="related-speaking-guide-title">
          <p className="eyebrow">Keep practising</p>
          <h2 id="related-speaking-guide-title">Take the topic into a {resource.relatedGuideLanguage} conversation</h2>
          <p>Use a familiar topic from your correspondence to make the first minutes of a small-group speaking session easier.</p>
          <Link className="text-link" href={relatedGuidePath}>Read the {resource.relatedGuideLanguage} speaking guide <span aria-hidden="true">→</span></Link>
        </section>
        <section className="guide-faq" aria-labelledby="pen-pal-faq-title">
          <p className="eyebrow">Common questions</p>
          <h2 id="pen-pal-faq-title">Questions about pen pals and language exchange</h2>
          <div className="stack">
            {resource.faqs.map((faq) => (
              <details className="guide-faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="guide-cta card soft">
          <div>
            <p className="eyebrow">Put the exchange into practice</p>
            <h2>Ready to make speaking regular?</h2>
            <p>Join a small international group to practise the language you are learning in a focused 30-minute session.</p>
          </div>
          <div className="guide-cta-actions">
            <Link className="button accent" href="/register">Start practising <span aria-hidden="true">→</span></Link>
            <Link className="button secondary" href={"/pen-pals" as Route}>Explore pen pal resources</Link>
          </div>
        </section>
      </article>
      <PublicFooter />
    </main>
  );
}

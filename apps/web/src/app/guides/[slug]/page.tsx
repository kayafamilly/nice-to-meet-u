import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PracticePlanBuilder } from "@/components/practice-plan-builder";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { guideForSlug, speakingGuides, type SpeakingGuide } from "@/lib/content/speaking-guides";
import { absoluteSiteUrl } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return speakingGuides.map((guide) => ({ slug: guide.slug }));
}

function guideForParams(params: { slug: string }): SpeakingGuide {
  const guide = guideForSlug(params.slug);
  if (!guide) notFound();
  return guide;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = guideForParams(await params);
  const path = `/guides/${guide.slug}`;

  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      title: `${guide.seoTitle} | NiceToMeetU`,
      description: guide.seoDescription,
      url: path,
      siteName: "NiceToMeetU",
      locale: "en_US",
      type: "article",
      images: [{ url: "/og.png", width: 1672, height: 941, alt: "Illustration of a small online language practice group" }]
    },
    twitter: { card: "summary_large_image", title: `${guide.seoTitle} | NiceToMeetU`, description: guide.seoDescription, images: ["/og.png"] }
  };
}

function articleStructuredData(guide: SpeakingGuide) {
  const canonicalUrl = absoluteSiteUrl(`/guides/${guide.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.seoDescription,
    mainEntityOfPage: canonicalUrl,
    inLanguage: "en",
    publisher: { "@id": `${absoluteSiteUrl()}#organization` }
  };
}

export default async function SpeakingGuidePage({ params }: PageProps) {
  const guide = guideForParams(await params);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const structuredData = JSON.stringify(articleStructuredData(guide)).replaceAll("<", "\\u003c");

  return (
    <main>
      <SiteHeader />
      <article className="shell page-shell guide-page">
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
        <p className="eyebrow">{guide.language} speaking practice</p>
        <h1 className="page-title editorial">{guide.h1}</h1>
        <p className="guide-introduction">{guide.introduction}</p>
        <div className="guide-content">
          {guide.sections.map((section) => (
            <section className="guide-section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </div>
        <PracticePlanBuilder language={guide.language} themes={guide.plannerThemes} />
        <section className="guide-faq" aria-labelledby="guide-faq-title">
          <p className="eyebrow">Common questions</p>
          <h2 id="guide-faq-title">Questions about {guide.language} speaking practice</h2>
          <div className="stack">
            {guide.faqs.map((faq) => (
              <details className="guide-faq-item" key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="guide-cta card soft">
          <div>
            <p className="eyebrow">Put the plan into practice</p>
            <h2>Ready to make speaking regular?</h2>
            <p>Join a small international group to practise the language you are learning in a focused 30-minute session.</p>
          </div>
          <div className="guide-cta-actions">
            <Link className="button accent" href="/register">Start practising <span aria-hidden="true">→</span></Link>
            <Link className="button secondary" href={"/guides" as Route}>Explore all guides</Link>
          </div>
        </section>
      </article>
      <PublicFooter />
    </main>
  );
}

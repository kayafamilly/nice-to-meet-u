import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

const description = "See how NiceToMeetU connects two to four international people for focused 30-minute video sessions in the language they want to practise.";

export const metadata: Metadata = {
  title: "How Language Speaking Sessions Work",
  description,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Language Speaking Sessions Work | NiceToMeetU",
    description,
    url: "/how-it-works",
    siteName: "NiceToMeetU",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "A small international group practising a language together" }]
  },
  twitter: { card: "summary_large_image", title: "How Language Speaking Sessions Work | NiceToMeetU", description, images: ["/og.png"] }
};

export default function HowItWorksPage() {
  return (
    <main>
      <SiteHeader />
      <section className="shell page-shell">
        <p className="eyebrow">Speaking practice made accessible</p>
        <h1 className="page-title editorial">The practice your language course cannot give you.</h1>
        <p className="hero-copy">Many learners understand a language but have nowhere to speak it in everyday life. NiceToMeetU fills that gap with regular video sessions for two to four people practising the same language together.</p>
        <div className="grid">
          <article className="card stack"><span className="step-number">1</span><h2>Select the language you want to improve</h2><p>Sessions are organised by practice language. Choose the one you are currently learning and want to keep active through real use.</p></article>
          <article className="card stack"><span className="step-number">2</span><h2>Find a session that fits your life</h2><p>Browse by language and time. Because everything happens online, you can practise even when nobody around you speaks that language.</p></article>
          <article className="card stack"><span className="step-number">3</span><h2>Meet two to four fellow learners</h2><p>Everyone joins to practise the same language. The small group gives each person enough room to speak, make mistakes, listen and participate.</p></article>
          <article className="card stack"><span className="step-number">4</span><h2>Keep your language alive</h2><p>No lesson, homework or teacher. Just a useful social moment with international people that helps vocabulary return, fluency grow and speaking feel natural.</p></article>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

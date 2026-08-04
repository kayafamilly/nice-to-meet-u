import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Language Speaking Practice in Small Groups",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Language Speaking Practice in Small Groups | NiceToMeetU",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "NiceToMeetU",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "A small international group practising a language together" }]
  },
  twitter: { card: "summary_large_image", title: "Language Speaking Practice in Small Groups | NiceToMeetU", description: SITE_DESCRIPTION, images: ["/og.png"] }
};

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="shell hero">
        <div>
          <p className="eyebrow">Lessons help you learn. Speaking helps you progress.</p>
          <h1>Don&apos;t just learn a language. Keep speaking it.</h1>
          <p className="hero-copy">You can take courses, learn grammar and build vocabulary — but without people to speak with, your progress slows down and your confidence fades. NiceToMeetU connects you to small international groups focused on one shared goal: practising the language you want to improve.</p>
          <div className="hero-actions"><Link className="button accent" href="/register">Start practising <span aria-hidden="true">→</span></Link><Link className="button secondary" href="/how-it-works">See how sessions work</Link></div>
        </div>
        <div className="conversation-stage" aria-label="A small international language practice group">
          <span className="floating-word one">Hola, Maya!</span><span className="floating-word two">Nice to meet you 👋</span>
          <div className="conversation-grid">
            <div className="conversation-face"><Image src="/people/maya-language-session.png" alt="Maya practising a language online from Paris" fill sizes="(max-width: 900px) 45vw, 22vw" priority /><span>Maya · Paris</span></div>
            <div className="conversation-face"><Image src="/people/kenji-language-session.png" alt="Kenji practising a language online from Tokyo" fill sizes="(max-width: 900px) 45vw, 22vw" priority /><span>Kenji · Tokyo</span></div>
            <div className="conversation-face"><Image src="/people/amina-language-session.png" alt="Amina practising a language online from London" fill sizes="(max-width: 900px) 45vw, 22vw" /><span>Amina · London</span></div>
            <div className="conversation-face"><Image src="/people/ben-language-session.png" alt="Ben practising a language online from Montréal" fill sizes="(max-width: 900px) 45vw, 22vw" /><span>Ben · Montréal</span></div>
          </div>
        </div>
      </section>
      <section className="shell proof-row" aria-label="NiceToMeetU session facts">
        <div className="proof"><strong>30 min</strong><span>Dedicated speaking time</span></div><div className="proof"><strong>2–4 people</strong><span>Small social groups</span></div><div className="proof"><strong>1 language</strong><span>One shared practice goal</span></div><div className="proof"><strong>Global</strong><span>Practise from any country</span></div>
      </section>
      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">The missing step after the lesson</p><h2>Turn what you have learned into a language you can actually speak.</h2></div><div className="grid">
        <article className="card stack"><span className="step-number">1</span><h2>Choose the language to practise</h2><p>Tell us which language you are learning and want to use more often. Your level does not need to be perfect — the purpose is to speak and improve.</p></article>
        <article className="card stack"><span className="step-number">2</span><h2>Join a small speaking group</h2><p>Find a session based on that language and a time. Meet two to four international learners who came to practise the same language.</p></article>
        <article className="card stack"><span className="step-number">3</span><h2>Practise regularly and keep progressing</h2><p>Talk, listen, search for your words and try again. These are not classes — they are social moments that turn passive knowledge into real speaking confidence.</p></article>
      </div></div></section>
      <footer className="shell public-footer"><span className="brand"><span className="brand-mark">N</span>NiceToMeetU</span><p className="small-copy">Learn in class. Progress by speaking.</p></footer>
    </main>
  );
}

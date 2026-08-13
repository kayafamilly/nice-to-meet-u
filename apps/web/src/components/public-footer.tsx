import Link from "next/link";
import type { Route } from "next";

export function PublicFooter() {
  return (
    <footer className="shell public-footer">
      <Link className="brand" href="/" aria-label="NiceToMeetU home">
        <span className="brand-mark">N</span>
        <strong>NiceToMeetU</strong>
      </Link>
      <nav className="public-footer-links" aria-label="Public resources">
        <Link href="/how-it-works">How it works</Link>
        <Link href={"/guides" as Route}>Speaking guides</Link>
        <Link href={"/pen-pals" as Route}>Pen pal resources</Link>
        <Link href="/register">Start practising</Link>
      </nav>
      <p className="small-copy">Learn in class. Progress by speaking.</p>
    </footer>
  );
}

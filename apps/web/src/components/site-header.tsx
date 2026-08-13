import Link from "next/link";
import type { Route } from "next";

export function SiteHeader() {
  return (
    <header className="shell nav">
      <Link className="brand" href="/" aria-label="NiceToMeetU home"><span className="brand-mark">N</span><strong>NiceToMeetU</strong></Link>
      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/how-it-works">How it works</Link>
        <Link href={"/guides" as Route}>Guides</Link>
        <Link href={"/pen-pals" as Route}>Pen pals</Link>
        <Link href="/login">Log in</Link>
        <Link className="button accent" href="/register">Start practising</Link>
      </nav>
    </header>
  );
}

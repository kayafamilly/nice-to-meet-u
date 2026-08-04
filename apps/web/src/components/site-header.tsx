import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="shell nav">
      <Link className="brand" href="/" aria-label="NiceToMeetU home"><span className="brand-mark">N</span><strong>NiceToMeetU</strong></Link>
      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/login">Log in</Link>
        <Link className="button accent" href="/register">Start practising</Link>
      </nav>
    </header>
  );
}

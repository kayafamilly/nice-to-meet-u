import Link from "next/link";
import { EmailVerificationForm } from "@/components/email-verification-form";

export default function VerifyEmailPage() {
  return <main className="auth-page"><div className="auth-shell"><aside className="auth-art"><Link className="brand" href="/"><span className="brand-mark">N</span>NiceToMeetU</Link><div><p className="eyebrow">One secure step</p><h2 className="editorial" style={{ fontSize: "3.4rem" }}>Your conversations start with a real connection.</h2><p>Confirm your address, then join small international groups built around the language you want to practise.</p></div></aside><section className="auth-panel"><EmailVerificationForm /></section></div></main>;
}

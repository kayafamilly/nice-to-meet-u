import Link from "next/link";
import { PasswordResetRequestForm } from "@/components/password-reset-form";

export default function ForgotPasswordPage() {
  return <main className="auth-page"><div className="auth-shell"><aside className="auth-art"><Link className="brand" href="/"><span className="brand-mark">N</span>NiceToMeetU</Link><div><p className="eyebrow">Keep speaking</p><h2 className="editorial" style={{ fontSize: "3.4rem" }}>Your next conversation can wait a minute.</h2><p>Reset your password securely, then return to your language groups.</p></div></aside><section className="auth-panel"><PasswordResetRequestForm /></section></div></main>;
}

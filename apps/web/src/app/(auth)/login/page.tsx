import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="auth-page"><div className="auth-shell"><aside className="auth-art"><Link className="brand" href="/"><span className="brand-mark">N</span>NiceToMeetU</Link><div><p className="eyebrow">Real speaking creates real progress</p><h2 className="editorial" style={{ fontSize: "3.4rem" }}>Keep the language active.</h2><p>Come back to practise, meet your next group and continue where your course stopped.</p></div></aside><section className="auth-panel"><AuthForm mode="login" /><p className="auth-switch">New here? <Link className="text-button" href="/register">Create an account</Link></p></section></div></main>;
}

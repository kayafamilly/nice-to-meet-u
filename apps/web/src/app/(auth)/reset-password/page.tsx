import Link from "next/link";
import type { Route } from "next";
import { PasswordResetConfirmForm } from "@/components/password-reset-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <main className="auth-page"><div className="auth-shell"><aside className="auth-art"><Link className="brand" href="/"><span className="brand-mark">N</span>NiceToMeetU</Link><div><p className="eyebrow">One last step</p><h2 className="editorial" style={{ fontSize: "3.4rem" }}>Choose a password only you know.</h2></div></aside><section className="auth-panel">{token ? <PasswordResetConfirmForm token={token} /> : <div className="stack"><p className="error">This reset link is incomplete.</p><Link className="button secondary" href={"/forgot-password" as Route}>Request another link</Link></div>}</section></div></main>;
}

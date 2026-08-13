"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { csrfToken } from "@/lib/client/csrf";

export function ManagementLoginForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/management/login", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() }, body: JSON.stringify({ password: formData.get("password") }) });
      const body = await response.json().catch(() => ({})) as { error?: string; attemptsRemaining?: number };
      if (!response.ok) { setError(body.error === "LOCKED" ? "Too many attempts. Try again in 15 minutes." : `Incorrect password.${typeof body.attemptsRemaining === "number" ? ` ${body.attemptsRemaining} attempts remaining.` : ""}`); return; }
      router.replace("/management"); router.refresh();
    } catch { setError("Management is temporarily unavailable."); } finally { setPending(false); }
  }
  return <form className="management-login-card stack" action={submit}><div><p className="eyebrow">Private operations</p><h1>Platform management</h1><p>Secure, read-only access to NiceToMeetU activity.</p></div><label className="field">Owner password<input name="password" type="password" autoComplete="current-password" required autoFocus /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button violet" disabled={pending}>{pending ? "Checking…" : "Open management"}</button><Link className="text-button" href="/">← Back to NiceToMeetU</Link></form>;
}

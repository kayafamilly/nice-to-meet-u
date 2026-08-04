"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { csrfToken } from "@/lib/client/csrf";
import { rememberVerification } from "@/components/email-verification-form";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const body = mode === "login"
      ? { email, password: formData.get("password") }
      : { displayName: formData.get("displayName"), email, password: formData.get("password"), isAdultConfirmed: formData.get("adult") === "on" };
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => ({})) as { error?: string; emailSent?: boolean };
      if (!response.ok) {
        if (mode === "login" && result.error === "EMAIL_VERIFICATION_REQUIRED") {
          rememberVerification(email);
          router.replace("/verify-email" as Route);
          return;
        }
        if (mode === "login" && result.error === "INVALID_CREDENTIALS") throw new Error("Incorrect email or password.");
        throw new Error("We could not complete your request. Please check your information.");
      }
      if (mode === "register") {
        rememberVerification(email, result.emailSent === false);
        router.replace("/verify-email" as Route);
        return;
      }
      router.replace("/app");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unexpected error");
    } finally {
      setPending(false);
    }
  }

  return <form className="stack" action={submit}>
    <div>
      <p className="eyebrow">{mode === "login" ? "Welcome back" : "Start speaking regularly"}</p>
      <h1>{mode === "login" ? "Your next practice session is waiting." : "Make speaking part of how you learn."}</h1>
      <p>{mode === "login" ? "Return to your language groups and keep building real speaking confidence." : "Create your profile, choose the language you want to improve and meet international learners who want to practise it too."}</p>
    </div>
    {mode === "register" && <label className="field">Display name<input name="displayName" minLength={2} maxLength={40} required autoComplete="nickname" /></label>}
    <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
    <label className="field">Password<input name="password" type="password" minLength={12} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
    {mode === "login" && <div className="inline-actions"><Link className="text-button" href={"/forgot-password" as Route}>Forgot your password?</Link><Link className="text-button" href={"/verify-email" as Route}>Verify your email</Link></div>}
    {mode === "register" && <label className="check-row"><input name="adult" type="checkbox" required /><span>I confirm that I am at least 18 years old and will practise respectfully with every member of my group.</span></label>}
    {error && <p className="error" role="alert">{error}</p>}
    <button className="button accent" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
  </form>;
}

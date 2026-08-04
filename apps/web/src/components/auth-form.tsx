"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";

type AuthMode = "login" | "register";

function csrf(): string | undefined {
  return document.cookie.split("; ").find((entry) => entry.startsWith("ntmy-csrf="))?.split("=")[1];
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    const body = mode === "login"
      ? { email: formData.get("email"), password: formData.get("password") }
      : { displayName: formData.get("displayName"), email: formData.get("email"), password: formData.get("password"), isAdultConfirmed: formData.get("adult") === "on" };
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() ?? "" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error("We could not complete your request. Please check your information.");
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
    {mode === "login" && <Link className="text-button" href={"/forgot-password" as Route}>Forgot your password?</Link>}
    {mode === "register" && <label className="check-row"><input name="adult" type="checkbox" required /><span>I confirm that I am at least 18 years old and will practise respectfully with every member of my group.</span></label>}
    {error && <p className="error" role="alert">{error}</p>}
    <button className="button accent" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
  </form>;
}

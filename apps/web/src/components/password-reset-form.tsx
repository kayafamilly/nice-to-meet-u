"use client";

import { useState } from "react";
import Link from "next/link";
import { csrfToken } from "@/lib/client/csrf";

export function PasswordResetRequestForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ email: formData.get("email") })
      });
      if (!response.ok) throw new Error("Unable to request a reset link right now. Please try again later.");
      setMessage("If an account exists for this email, a reset link has been sent.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a reset link.");
    } finally {
      setPending(false);
    }
  }

  return <form className="stack" action={submit}>
    <div><p className="eyebrow">Password reset</p><h1>Find your way back.</h1><p>Enter your account email and we will send you a secure reset link.</p></div>
    <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
    <button className="button accent" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    <Link className="text-button" href="/login">← Back to login</Link>
  </form>;
}

export function PasswordResetConfirmForm({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true); setError(null); setMessage(null);
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
    if (password !== passwordConfirm) { setError("Passwords do not match."); setPending(false); return; }
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ token, password, passwordConfirm })
      });
      if (!response.ok) setError("This reset link is invalid or has expired.");
      else setMessage("Your password has been changed. You can now log in.");
    } catch {
      setError("Unable to reset the password right now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <form className="stack" action={submit}>
    <div><p className="eyebrow">Choose a new password</p><h1>Secure your account.</h1><p>Use at least 12 characters.</p></div>
    <label className="field">New password<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label>
    <label className="field">Confirm password<input name="passwordConfirm" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
    {!message && <button className="button accent" disabled={pending || !token}>{pending ? "Saving…" : "Save new password"}</button>}
    <Link className="text-button" href="/login">← Back to login</Link>
  </form>;
}

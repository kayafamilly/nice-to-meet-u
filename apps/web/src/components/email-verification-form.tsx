"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { csrfToken } from "@/lib/client/csrf";

type ConfirmationState = "idle" | "verifying" | "verified" | "invalid";

const EMAIL_STORAGE_KEY = "ntmy-verification-email";
const DELIVERY_STORAGE_KEY = "ntmy-verification-delivery";

export function rememberVerification(email: string, deliveryFailed = false): void {
  try {
    window.sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
    if (deliveryFailed) window.sessionStorage.setItem(DELIVERY_STORAGE_KEY, "failed");
    else window.sessionStorage.removeItem(DELIVERY_STORAGE_KEY);
  } catch {}
}

export function EmailVerificationForm() {
  const confirmationToken = useRef<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>("idle");
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let storedEmail = "";
    let storedDeliveryFailed = false;
    try {
      storedEmail = window.sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
      storedDeliveryFailed = window.sessionStorage.getItem(DELIVERY_STORAGE_KEY) === "failed";
    } catch {}

    if (confirmationToken.current === undefined) {
      confirmationToken.current = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (confirmationToken.current) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    const token = confirmationToken.current;
    queueMicrotask(() => {
      if (!active) return;
      setEmail(storedEmail);
      setDeliveryFailed(storedDeliveryFailed);
      if (!token) return;
      setConfirmationState("verifying");
      void fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ token })
      }).then((response) => {
        if (!active) return;
        setConfirmationState(response.ok ? "verified" : "invalid");
        if (response.ok) {
          try {
            window.sessionStorage.removeItem(DELIVERY_STORAGE_KEY);
          } catch {}
        }
      }).catch(() => { if (active) setConfirmationState("invalid"); });
    });
    return () => { active = false; };
  }, []);

  async function resend(formData: FormData) {
    setResendPending(true);
    setResendError(null);
    setResendMessage(null);
    const requestedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
    try {
      const response = await fetch("/api/auth/email-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ email: requestedEmail })
      });
      if (!response.ok) throw new Error("Unable to send a verification email right now. Please try again later.");
      rememberVerification(requestedEmail);
      setDeliveryFailed(false);
      setResendMessage("If this address belongs to an unverified account, a new confirmation email has been sent.");
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Unable to send a verification email.");
    } finally {
      setResendPending(false);
    }
  }

  if (confirmationState === "verifying") {
    return <div className="stack" aria-live="polite"><div><p className="eyebrow">Email confirmation</p><h1>Confirming your email…</h1><p>Please keep this page open for a moment.</p></div></div>;
  }

  if (confirmationState === "verified") {
    return <div className="stack"><div><p className="eyebrow">Email confirmed</p><h1>You are ready to meet your group.</h1><p>Your address is confirmed. Log in to create your language profile and start practising.</p></div><p className="success" role="status">Your NiceToMeetU account is now active.</p><Link className="button accent" href="/login">Continue to login</Link></div>;
  }

  return <form className="stack" action={resend}>
    <div>
      <p className="eyebrow">Check your inbox</p>
      <h1>Confirm your email to continue.</h1>
      <p>We sent a confirmation link to your email address. Open it to activate your account before logging in.</p>
    </div>
    {confirmationState === "invalid" && <p className="error" role="alert">This confirmation link is invalid or has expired. Request a new one below.</p>}
    {deliveryFailed && <p className="notice" role="status">The first email could not be delivered. Check the address below and request a new link.</p>}
    <label className="field">Email<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
    {resendError && <p className="error" role="alert">{resendError}</p>}
    {resendMessage && <p className="success" role="status">{resendMessage}</p>}
    <button className="button accent" disabled={resendPending}>{resendPending ? "Sending…" : "Resend confirmation email"}</button>
    <Link className="text-button" href="/login">← Back to login</Link>
  </form>;
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { csrfToken } from "@/lib/client/csrf";

type ConfirmationState = "idle" | "verifying" | "verified" | "invalid";
type VerificationSource = "registration" | "login" | "manual";

const EMAIL_STORAGE_KEY = "ntmy-verification-email";
const DELIVERY_STORAGE_KEY = "ntmy-verification-delivery";
const SOURCE_STORAGE_KEY = "ntmy-verification-source";

export function rememberVerification(
  email: string,
  deliveryFailed = false,
  source: VerificationSource = "manual"
): void {
  try {
    window.sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
    window.sessionStorage.setItem(SOURCE_STORAGE_KEY, source);
    if (deliveryFailed) window.sessionStorage.setItem(DELIVERY_STORAGE_KEY, "failed");
    else window.sessionStorage.removeItem(DELIVERY_STORAGE_KEY);
  } catch {}
}

export function EmailVerificationForm() {
  const confirmationToken = useRef<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>("idle");
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [source, setSource] = useState<VerificationSource>("manual");
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let storedEmail = "";
    let storedDeliveryFailed = false;
    let storedSource: VerificationSource = "manual";
    try {
      storedEmail = window.sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
      storedDeliveryFailed = window.sessionStorage.getItem(DELIVERY_STORAGE_KEY) === "failed";
      const savedSource = window.sessionStorage.getItem(SOURCE_STORAGE_KEY);
      if (savedSource === "registration" || savedSource === "login") storedSource = savedSource;
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
      setSource(storedSource);
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
            window.sessionStorage.removeItem(EMAIL_STORAGE_KEY);
            window.sessionStorage.removeItem(DELIVERY_STORAGE_KEY);
            window.sessionStorage.removeItem(SOURCE_STORAGE_KEY);
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
      rememberVerification(requestedEmail, false, source);
      setDeliveryFailed(false);
      setResendMessage("If this address belongs to an unverified account, a confirmation link has been sent. Check your inbox and spam folder.");
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
    return <div className="stack"><div><p className="eyebrow">Email confirmed</p><h1>Your account is now active.</h1><p>Your email has been confirmed. You can now log in, create your language profile and join speaking sessions.</p></div><p className="success" role="status">Confirmation complete. Login is now enabled.</p><Link className="button accent" href="/login">Continue to login</Link></div>;
  }

  const isBlockedLogin = source === "login";
  const isRegistration = source === "registration";
  const heading = isBlockedLogin
    ? "Confirm your email before logging in."
    : isRegistration
      ? "One last step: confirm your email."
      : "Send a new confirmation email.";
  const introduction = isBlockedLogin
    ? "Your account exists, but login is blocked until you confirm your email. Open the confirmation link we sent you or request a new one below."
    : isRegistration
      ? "Your account has been created, but it is not active yet. Open the confirmation link we sent you before trying to log in."
      : "Enter the email address used for your account. If it belongs to an unverified account, we will send a new confirmation link.";

  return <form className="stack" action={resend}>
    <div>
      <p className="eyebrow">{isBlockedLogin ? "Email verification required" : isRegistration ? "Account created" : "Email verification"}</p>
      <h1>{heading}</h1>
      <p>{introduction}</p>
    </div>
    {isBlockedLogin && <p className="notice" role="status">You cannot log in until your email is confirmed.</p>}
    {confirmationState === "invalid" && <p className="error" role="alert">This confirmation link is invalid, has already been used or has expired. Request a new one below.</p>}
    {deliveryFailed && <p className="notice" role="status">Your account was created, but we could not send the first email. Check the address below and request a new confirmation link.</p>}
    <label className="field">Email<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
    {resendError && <p className="error" role="alert">{resendError}</p>}
    {resendMessage && <p className="success" role="status">{resendMessage}</p>}
    <button className="button accent" disabled={resendPending}>{resendPending ? "Sending…" : "Resend confirmation email"}</button>
    <Link className="text-button" href="/login">← Back to login</Link>
  </form>;
}

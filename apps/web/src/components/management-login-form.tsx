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
      if (!response.ok) { setError(body.error === "LOCKED" ? "Trop de tentatives. Réessayez dans 15 minutes." : `Mot de passe incorrect.${typeof body.attemptsRemaining === "number" ? ` ${body.attemptsRemaining} tentative(s) restante(s).` : ""}`); return; }
      router.replace("/management"); router.refresh();
    } catch { setError("Le dashboard est momentanément indisponible."); } finally { setPending(false); }
  }
  return <form className="management-login-card stack" action={submit}><div><p className="eyebrow">Espace privé</p><h1>Pilotage NiceToMeetU</h1><p>Accès sécurisé et consultatif aux indicateurs de la plateforme.</p></div><label className="field">Mot de passe administrateur<input name="password" type="password" autoComplete="current-password" required autoFocus /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button violet" disabled={pending}>{pending ? "Vérification…" : "Ouvrir le dashboard"}</button><Link className="text-button" href="/">← Retour au site</Link></form>;
}

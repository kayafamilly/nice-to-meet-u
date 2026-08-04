"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchableLanguageSelect } from "@/components/searchable-language-select";
import { DeviceLocalTime, DeviceTimeZone } from "@/components/device-local-time";
import { csrfToken } from "@/lib/client/csrf";
import { apiErrorMessage } from "@/lib/client/api-error";
import type { Language, PracticeLanguage, Profile, SessionHistory } from "@/types/api";

type PracticeSlot = { languageId: string; level: PracticeLanguage["level"] };
const emptyPracticeSlot = (): PracticeSlot => ({ languageId: "", level: "intermediate" });

function SessionList({ title, sessions }: { title: string; sessions: SessionHistory["upcoming"] }) {
  return <section className="stack"><div className="section-label"><h2>{title}</h2><span className="status-pill">{sessions.length}</span></div>{sessions.length === 0 ? <div className="empty-state"><p>No sessions here yet.</p></div> : <div className="history-list">{sessions.map((session) => <Link className="history-item" href={`/app/sessions/${session.id}`} key={`${session.id}-${session.reservationStatus}`}><strong>{session.languageName} speaking session</strong><span><DeviceLocalTime value={session.startsAt} options={{ dateStyle: "medium", timeStyle: "short" }} /></span><span>{session.role === "native" ? "Native" : "Practice"} · {session.reservationStatus.replace("_", " ")}</span><span className="history-link">View →</span></Link>)}</div>}</section>;
}

export function ProfileForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<SessionHistory>({ upcoming: [], past: [] });
  const [languages, setLanguages] = useState<Language[]>([]);
  const [practiceLanguages, setPracticeLanguages] = useState<PracticeSlot[]>([emptyPracticeSlot(), emptyPracticeSlot(), emptyPracticeSlot()]);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void Promise.all([fetch("/api/app/profile", { cache: "no-store" }), fetch("/api/app/profile/sessions", { cache: "no-store" }), fetch("/api/app/languages", { cache: "no-store" })]).then(async ([profileResponse, historyResponse, languageResponse]) => {
      if (!profileResponse.ok || !historyResponse.ok || !languageResponse.ok) throw new Error("Unable to load profile");
      const loadedProfile = await profileResponse.json() as Profile;
      setProfile(loadedProfile); setPracticeLanguages([...loadedProfile.practiceLanguages.map(({ id, level }) => ({ languageId: id, level })), emptyPracticeSlot(), emptyPracticeSlot()].slice(0, 3)); setDisplayName(loadedProfile.displayName); setHistory(await historyResponse.json() as SessionHistory); setLanguages(await languageResponse.json() as Language[]);
    }).catch(() => setError("Unable to load your profile."));
  }, []);

  useEffect(() => {
    let active = true;
    const refreshHistory = () => void fetch("/api/app/profile/sessions", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<SessionHistory> : Promise.reject(new Error()))
      .then((loaded) => { if (active) setHistory(loaded); })
      .catch(() => undefined);
    const onVisibilityChange = () => { if (document.visibilityState === "visible") refreshHistory(); };
    const timer = window.setInterval(refreshHistory, 30_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, []);

  function selectedLanguageIds(currentId: string) { return [...(profile?.nativeLanguages.map((language) => language.id) ?? []), ...practiceLanguages.map((language) => language.languageId)].filter((id) => id && id !== currentId); }
  function setPracticeLanguage(index: number, languageId: string) { setPracticeLanguages((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, languageId } : value)); }
  function setPracticeLevel(index: number, level: PracticeLanguage["level"]) { setPracticeLanguages((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, level } : value)); }

  async function save() {
    const activePracticeLanguages = practiceLanguages.filter((language) => language.languageId);
    if (!activePracticeLanguages.length) { setError("Choose at least one practice language."); return; }
    setPending(true); setError(null); setSaved(false);
    try {
      const response = await fetch("/api/app/profile", { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() }, body: JSON.stringify({ displayName, practiceLanguages: activePracticeLanguages, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
      if (!response.ok) throw new Error("Unable to save profile.");
      if (profile) { const languageById = new Map(languages.map((language) => [language.id, language])); setProfile({ ...profile, displayName, practiceLanguages: activePracticeLanguages.map((entry) => ({ ...languageById.get(entry.languageId)!, level: entry.level })) }); }
      setSaved(true); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save profile."); } finally { setPending(false); }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account? Future reservations will be cancelled and your personal data will be anonymised.")) return;
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/app/profile", { method: "DELETE", headers: { "X-CSRF-Token": csrfToken() } });
      if (!response.ok) throw new Error(await apiErrorMessage(response, { HOST_CANCEL_LOCKED: "A session you host already has other participants. Your account can be deleted after that session has finished." }, "Unable to delete the account."));
      router.replace("/"); router.refresh();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the account."); setPending(false); }
  }

  async function logOut() {
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken() } });
      if (!response.ok) throw new Error("Unable to log out.");
      router.replace("/login"); router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to log out.");
      setPending(false);
    }
  }

  if (!profile) return <main className="shell page-shell"><div className="empty-state"><p>{error ?? "Loading your profile…"}</p></div></main>;
  const initials = profile.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return <main className="shell page-shell">
    <section className="profile-hero"><span className="avatar large">{initials}</span><div><p className="eyebrow">Your speaking profile</p><h1 className="profile-name">{profile.displayName}</h1><p><DeviceTimeZone /> · {profile.nativeLanguages.length} native · {profile.practiceLanguages.length} practising</p></div></section>
    <div className="profile-layout"><section className="card stack"><div><p className="eyebrow">Languages & account</p><h2>Edit your details</h2></div><form className="stack" action={() => void save()}>
      <label className="field">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={40} required /></label>
      <section className="stack"><h3>Native languages</h3><div className="slot-group">{profile.nativeLanguages.map((language) => <span className="language-pill" key={language.id}>{language.name} · Native</span>)}</div><p className="small-copy">Contact support if a native language needs correcting.</p></section>
      <section className="stack"><h3>Practice languages</h3>{practiceLanguages.map((language, index) => <div className="date-time-grid" key={index}><SearchableLanguageSelect label={`Language ${index + 1}${index ? " (optional)" : ""}`} name={`practiceLanguageId-${index}`} languages={languages} value={language.languageId} onChange={(languageId) => setPracticeLanguage(index, languageId)} excludeLanguageIds={selectedLanguageIds(language.languageId)} required={index === 0} /><label className="field">Level<select value={language.level} disabled={!language.languageId} onChange={(event) => setPracticeLevel(index, event.target.value as PracticeLanguage["level"])}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div>)}</section>
      {error && <p className="error" role="alert">{error}</p>}{saved && <p className="success">Profile saved.</p>}<button className="button" disabled={pending}>Save changes</button>
    </form><div className="form-actions"><button className="button secondary" type="button" disabled={pending} onClick={() => void logOut()}>Log out</button><button className="text-button danger-button" type="button" disabled={pending} onClick={() => void deleteAccount()}>Delete account</button></div></section><aside className="stack"><SessionList title="Upcoming conversations" sessions={history.upcoming} /><SessionList title="Past & cancelled conversations" sessions={history.past} /></aside></div>
  </main>;
}

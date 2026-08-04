"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { csrfToken } from "@/lib/client/csrf";
import { apiErrorMessage } from "@/lib/client/api-error";
import { localDateValue, roundUpToQuarterHour } from "@/lib/domain/scheduling";
import { SearchableLanguageSelect } from "@/components/searchable-language-select";
import type { Language, Profile, SessionSummary } from "@/types/api";

const stepLabels = ["Language", "Time", "Review"];
function timeValue(date: Date): string { return date.toTimeString().slice(0, 5); }

export function CreateSessionForm() {
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [languageId, setLanguageId] = useState("");
  const [note, setNote] = useState("");
  const [earliest, setEarliest] = useState(() => roundUpToQuarterHour(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [date, setDate] = useState(localDateValue(earliest));
  const [time, setTime] = useState(timeValue(earliest));
  const minDate = localDateValue(earliest);
  const maxDate = `${new Date().getFullYear()}-12-31`;
  const selectedLanguage = languages.find((language) => language.id === languageId);
  const viewerRole = profile?.nativeLanguages.some((language) => language.id === languageId) ? "native" : "practice";
  const slots = useMemo(() => {
    const dayStart = date === minDate ? earliest : new Date(`${date}T00:00:00`);
    return Array.from({ length: Math.max(0, 96 - (dayStart.getHours() * 4 + Math.ceil(dayStart.getMinutes() / 15))) }, (_, index) => {
      const minutes = dayStart.getHours() * 60 + Math.ceil(dayStart.getMinutes() / 15) * 15 + index * 15;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    }).filter((slot) => slot <= "23:45");
  }, [date, earliest, minDate]);

  useEffect(() => {
    void Promise.all([fetch("/api/app/languages"), fetch("/api/app/profile", { cache: "no-store" })])
      .then(async ([languageResponse, profileResponse]) => {
        if (!languageResponse.ok || !profileResponse.ok) throw new Error();
        setLanguages(await languageResponse.json() as Language[]);
        setProfile(await profileResponse.json() as Profile);
      }).catch(() => setError("Unable to prepare the session creator."));
  }, []);

  function next() {
    setError(null);
    if (step === 0 && !languageId) return setError("Choose the conversation language.");
    if (step === 1 && (!date || !time)) return setError("Choose a date and time.");
    setStep((current) => Math.min(2, current + 1));
  }

  async function submit() {
    const startsAt = new Date(`${date}T${time}:00`);
    const currentEarliest = roundUpToQuarterHour(new Date(Date.now() + 2 * 60 * 60 * 1000));
    if (Number.isNaN(startsAt.getTime()) || startsAt < currentEarliest) {
      setEarliest(currentEarliest);
      setDate(localDateValue(currentEarliest));
      setTime(timeValue(currentEarliest));
      setStep(1);
      setError("The earliest available time changed while you were creating the session. Please confirm the refreshed time.");
      return;
    }
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/app/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ languageId, startsAt: startsAt.toISOString(), note: note.trim() })
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, {
        SCHEDULE_CONFLICT: "This time overlaps one of your upcoming conversations.",
        RESERVATION_LIMIT: "You already hold three upcoming registrations at the same time.",
        SUSPENDED: "New reservations are temporarily paused after repeated no-shows."
      }, "Unable to publish this session with the selected details."));
      const created = await response.json() as SessionSummary;
      router.replace(`/app/sessions/${created.id}?created=1`);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to create the session.");
    } finally { setPending(false); }
  }

  return <section className="wizard">
    <div style={{ textAlign: "center" }}><p className="eyebrow">Host a speaking moment</p><h1 className="page-title">Create a session</h1><p>Choose one language and a time. The group can grow from two to four people.</p></div>
    <div className="wizard-progress">{stepLabels.map((label, index) => <span className={`wizard-step${index <= step ? " active" : ""}`} key={label}>{label}</span>)}</div>
    <div className="card stack">
      {step === 0 && <><div><p className="eyebrow">Step 1 of 3</p><h2>What language will everyone practise?</h2></div><SearchableLanguageSelect label="Session language" name="languageId" languages={languages} value={languageId} onChange={setLanguageId} />{languageId && <div className="notice">You will appear as <strong>{viewerRole === "native" ? "Native" : "Practice"}</strong>. This label is informative and never limits who can join.</div>}</>}
      {step === 1 && <><div><p className="eyebrow">Step 2 of 3</p><h2>When should everyone meet?</h2><p>Sessions last 30 minutes and must be scheduled at least two hours ahead.</p></div><div className="date-time-grid"><label className="field">Date<input type="date" min={minDate} max={maxDate} value={date} onChange={(event) => { setDate(event.target.value); setTime(""); }} /></label><label className="field">Local time<select value={time} onChange={(event) => setTime(event.target.value)}><option value="" disabled>Select a time</option>{slots.map((slot) => <option key={slot}>{slot}</option>)}</select></label></div><p className="small-copy">Shown in {Intl.DateTimeFormat().resolvedOptions().timeZone || "your local timezone"}.</p></>}
      {step === 2 && <><div><p className="eyebrow">Step 3 of 3</p><h2>Review your session.</h2></div><article className="card soft stack"><div className="session-card-head"><span className="language-pill">{selectedLanguage?.name}</span><span className={`role-pill ${viewerRole}`}>You · {viewerRole === "native" ? "Native" : "Practice"}</span></div><p><strong>{new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }).format(new Date(`${date}T${time}:00`))}</strong> · 30 minutes</p><p className="small-copy">Two people are enough to open the room. Four is the maximum.</p></article><label className="field">Optional note<textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add useful context for the people joining, if you want." /></label><p className="notice">Publishing uses one of your three simultaneous upcoming registration places. It becomes available again after the session or cancellation.</p></>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions">{step > 0 ? <button className="button secondary" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : <span />}{step < 2 ? <button className="button" type="button" onClick={next}>Continue →</button> : <button className="button accent" type="button" disabled={pending} onClick={() => void submit()}>{pending ? "Publishing…" : "Publish session"}</button>}</div>
    </div>
  </section>;
}

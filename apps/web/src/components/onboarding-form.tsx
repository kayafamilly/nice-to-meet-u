"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { csrfToken } from "@/lib/client/csrf";
import { SearchableLanguageSelect } from "@/components/searchable-language-select";
import type { Language, PracticeLanguage } from "@/types/api";

type PracticeSlot = { languageId: string; level: PracticeLanguage["level"] };
const emptyPracticeSlot = (): PracticeSlot => ({ languageId: "", level: "intermediate" });
const steps = ["Native languages", "Practice languages", "Community rules"];

export function OnboardingForm() {
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [nativeLanguageIds, setNativeLanguageIds] = useState(["", "", ""]);
  const [practiceLanguages, setPracticeLanguages] = useState<PracticeSlot[]>([emptyPracticeSlot(), emptyPracticeSlot(), emptyPracticeSlot()]);

  useEffect(() => {
    void fetch("/api/app/languages", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<Language[]> : Promise.reject(new Error("Unable to load languages")))
      .then(setLanguages)
      .catch(() => setError("Unable to load the language catalogue. Please refresh the page."));
  }, []);

  function selectedLanguageIds(currentId: string) {
    return [...nativeLanguageIds, ...practiceLanguages.map((language) => language.languageId)].filter((id) => id && id !== currentId);
  }

  function goNext() {
    setError(null);
    if (step === 0 && !nativeLanguageIds.some(Boolean)) return setError("Choose at least one native language.");
    if (step === 1 && !practiceLanguages.some((language) => language.languageId)) return setError("Choose at least one practice language.");
    setStep((current) => Math.min(2, current + 1));
  }

  async function submit() {
    if (!rulesAccepted) return setError("Accept the community promise to continue.");
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/app/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({
          nativeLanguageIds: nativeLanguageIds.filter(Boolean),
          practiceLanguages: practiceLanguages.filter((language) => language.languageId),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          communityRulesAccepted: true
        })
      });
      if (!response.ok) throw new Error("Check your language choices and try again.");
      router.replace("/app/sessions");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to complete onboarding.");
    } finally {
      setPending(false);
    }
  }

  return <section className="wizard">
    <div style={{ textAlign: "center" }}><p className="eyebrow">Your speaking profile</p><h1 className="page-title">Let&apos;s make every conversation count.</h1><p>Three quick steps, then your first session is waiting.</p></div>
    <div className="wizard-progress">{steps.map((label, index) => <span className={`wizard-step${index <= step ? " active" : ""}`} key={label}>{label}</span>)}</div>
    <div className="card stack">
      {step === 0 && <><div><p className="eyebrow">Step 1 of 3</p><h2>Which languages feel like home?</h2><p>These identify you as a Native participant when a session uses that language. Add up to three.</p></div>{nativeLanguageIds.map((languageId, index) => <SearchableLanguageSelect key={index} label={`Native language ${index + 1}${index ? " (optional)" : ""}`} name={`native-${index}`} languages={languages} value={languageId} onChange={(next) => setNativeLanguageIds((current) => current.map((value, itemIndex) => itemIndex === index ? next : value))} excludeLanguageIds={selectedLanguageIds(languageId)} required={index === 0} />)}</>}
      {step === 1 && <><div><p className="eyebrow">Step 2 of 3</p><h2>What would you love to practise?</h2><p>Add up to three favourites. You can still join sessions in any available language.</p></div>{practiceLanguages.map((language, index) => <div className="date-time-grid" key={index}><SearchableLanguageSelect label={`Practice language ${index + 1}${index ? " (optional)" : ""}`} name={`practice-${index}`} languages={languages} value={language.languageId} onChange={(next) => setPracticeLanguages((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, languageId: next } : value))} excludeLanguageIds={selectedLanguageIds(language.languageId)} required={index === 0} /><label className="field">Current level<select value={language.level} disabled={!language.languageId} onChange={(event) => setPracticeLanguages((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, level: event.target.value as PracticeLanguage["level"] } : value))}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></div>)}</>}
      {step === 2 && <><div><p className="eyebrow">Step 3 of 3</p><h2>Your community promise.</h2><p>NiceToMeetU is for language practice, cultural curiosity and respectful conversation.</p></div><label className="check-row"><input type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)} /><span>I will arrive on time, respect every participant and never record a session.</span></label><div className="card soft"><strong>Your setup</strong><p className="small-copy">{nativeLanguageIds.filter(Boolean).length} native language(s) · {practiceLanguages.filter((language) => language.languageId).length} practice language(s) · {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}</p></div></>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions">{step > 0 ? <button className="button secondary" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : <span />}{step < 2 ? <button className="button" type="button" onClick={goNext}>Continue →</button> : <button className="button accent" type="button" disabled={pending} onClick={() => void submit()}>{pending ? "Saving…" : "Explore conversations →"}</button>}</div>
    </div>
  </section>;
}

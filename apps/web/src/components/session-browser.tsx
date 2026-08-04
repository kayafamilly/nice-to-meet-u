"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchableLanguageSelect } from "@/components/searchable-language-select";
import { SessionCard } from "@/components/session-card";
import { csrfToken } from "@/lib/client/csrf";
import { apiErrorMessage } from "@/lib/client/api-error";
import type { Language, ReservationBlockReason, SessionSummary } from "@/types/api";

const reasonLabels: Record<ReservationBlockReason, string> = {
  already_reserved: "Already reserved",
  session_full: "Session full",
  schedule_conflict: "Time conflict",
  reservation_limit: "3 simultaneous registrations already used",
  suspended: "Reservations paused",
  closed: "Reservations closed"
};

function monthValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateBounds(mode: "month" | "range", month: string, from: string, to: string): { from: string; to: string } | null {
  if (mode === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) return null;
    const start = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    const end = new Date(Number(match[1]), Number(match[2]), 1);
    return { from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() };
  }
  if (!from || !to) return null;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  if (start > end) return null;
  return { from: start.toISOString(), to: end.toISOString() };
}

export function SessionBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdId = searchParams.get("created");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageId, setLanguageId] = useState("");
  const [dateMode, setDateMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [availability, setAvailability] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(createdId ? "Your session is live and your place is reserved." : null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadLanguages = () => void fetch("/api/app/languages", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<Language[]> : Promise.reject(new Error()))
      .then((loaded) => {
        if (!active) return;
        setLanguages(loaded);
        setMonth((current) => {
          if (current) return current;
          const nearest = loaded.map((language) => language.nextSessionStartsAt).filter((value): value is string => Boolean(value)).sort()[0];
          return monthValue(nearest ?? new Date().toISOString());
        });
      }).catch(() => { if (active) setError("Unable to load languages."); });
    loadLanguages();
    const timer = window.setInterval(loadLanguages, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const bounds = useMemo(() => dateBounds(dateMode, month, rangeFrom, rangeTo), [dateMode, month, rangeFrom, rangeTo]);
  const requestKey = bounds ? `${bounds.from}|${bounds.to}|${languageId}` : null;
  const loading = languages.length === 0 || (requestKey !== null && loadedRequestKey !== requestKey);

  useEffect(() => {
    if (!bounds || !requestKey) return;
    let active = true;
    const params = new URLSearchParams({ from: bounds.from, to: bounds.to });
    if (languageId) params.set("languageId", languageId);
    const loadSessions = () => void fetch(`/api/app/sessions?${params}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<SessionSummary[]> : Promise.reject(new Error()))
      .then((loaded) => { if (active) { setSessions(loaded.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))); setLoadedRequestKey(requestKey); } })
      .catch(() => { if (active) { setError("Unable to load sessions."); setLoadedRequestKey(requestKey); } });
    const onVisibilityChange = () => { if (document.visibilityState === "visible") loadSessions(); };
    loadSessions();
    const timer = window.setInterval(loadSessions, 15_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [bounds, languageId, requestKey]);

  async function reloadSessions() {
    if (!bounds) return;
    const params = new URLSearchParams({ from: bounds.from, to: bounds.to });
    if (languageId) params.set("languageId", languageId);
    const response = await fetch(`/api/app/sessions?${params}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to refresh sessions.");
    setSessions((await response.json() as SessionSummary[]).sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)));
  }

  async function reserve(sessionId: string) {
    setPendingSessionId(sessionId); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/app/sessions/${sessionId}/reserve`, { method: "POST", headers: { "X-CSRF-Token": csrfToken() } });
      if (!response.ok) throw new Error(await apiErrorMessage(response, {
        SESSION_FULL: "All four places were just taken.",
        SCHEDULE_CONFLICT: "This overlaps one of your upcoming sessions.",
        RESERVATION_LIMIT: "You already hold three upcoming registrations at the same time.",
        SUSPENDED: "New reservations are temporarily paused after repeated no-shows."
      }, "That place just changed. We refreshed the session for you."));
      setSuccess("Your place is reserved. We will remind you before the session.");
      await reloadSessions(); router.refresh();
    } catch (reservationError) {
      setError(reservationError instanceof Error ? reservationError.message : "Unable to reserve this session.");
      try { await reloadSessions(); } catch {}
    } finally { setPendingSessionId(null); }
  }

  const visibleSessions = useMemo(() => bounds ? sessions : [], [bounds, sessions]);
  const personalSessions = useMemo(() => visibleSessions.filter((session) => session.viewerReservationStatus === "reserved"), [visibleSessions]);
  const personalIds = useMemo(() => new Set(personalSessions.map((session) => session.id)), [personalSessions]);
  const availableSessions = useMemo(() => visibleSessions
    .filter((session) => !personalIds.has(session.id))
    .filter((session) => availability !== "open" || session.viewerEligibility.canReserve)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)), [availability, personalIds, visibleSessions]);

  function clearFilters() {
    const nearest = languages.map((language) => language.nextSessionStartsAt).filter((value): value is string => Boolean(value)).sort()[0];
    setLanguageId(""); setDateMode("month"); setMonth(monthValue(nearest ?? new Date().toISOString())); setRangeFrom(""); setRangeTo(""); setAvailability("all");
  }

  return <div className="stack">
    <div className="filter-bar">
      <SearchableLanguageSelect label="Language" name="languageFilter" languages={languages} value={languageId} onChange={setLanguageId} required={false} showActivity />
      <label className="field">Date view<select value={dateMode} onChange={(event) => setDateMode(event.target.value as "month" | "range")}><option value="month">By month</option><option value="range">Custom period</option></select></label>
      {dateMode === "month" ? <label className="field">Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label> : <><label className="field">From<input type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label><label className="field">To<input type="date" value={rangeTo} min={rangeFrom || undefined} onChange={(event) => setRangeTo(event.target.value)} /></label></>}
      <label className="field">Availability<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All upcoming</option><option value="open">Open for me</option></select></label>
      <button className="button secondary" type="button" onClick={clearFilters}>Reset</button>
    </div>
    {dateMode === "range" && !bounds && <p className="notice">Choose a valid start and end date.</p>}
    {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}
    {loading ? <div className="empty-state"><p>Finding the closest sessions around the world…</p></div> : <div className="session-sections">
      {personalSessions.length > 0 && <section><div className="section-label"><div><p className="eyebrow">Your next sessions</p><h2>Ready when you are.</h2></div></div><div className="grid">{personalSessions.map((session) => <div className={session.id === createdId ? "created-session" : ""} key={session.id}><SessionCard session={session} /></div>)}</div></section>}
      <section><div className="section-label"><div><p className="eyebrow">Explore</p><h2>Closest sessions first.</h2></div><Link className="button" href="/app/sessions/new">Create a session</Link></div>{availableSessions.length === 0 ? <div className="empty-state"><h3>No matching sessions yet.</h3><p>Change the period, clear a filter or create the session you want to join.</p><Link className="button accent" href="/app/sessions/new">Create a session</Link></div> : <div className="grid">{availableSessions.map((session) => <div className="stack" key={session.id}><SessionCard session={session} />{session.viewerEligibility.canReserve ? <button className="button reserve-button" onClick={() => void reserve(session.id)} disabled={pendingSessionId !== null}>{pendingSessionId === session.id ? "Reserving…" : "Reserve my spot"}</button> : <button className="button reserve-button" disabled>{reasonLabels[session.viewerEligibility.reason ?? "closed"]}</button>}</div>)}</div>}</section>
    </div>}
  </div>;
}

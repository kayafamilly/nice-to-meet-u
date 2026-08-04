import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/app-user";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { ReservationActions } from "@/components/reservation-actions";
import { DeviceLocalTime } from "@/components/device-local-time";
import { SessionLiveActions } from "@/components/session-live-actions";
import type { ReservationBlockReason, SessionSummary } from "@/types/api";

export const dynamic = "force-dynamic";

const reasons: Record<ReservationBlockReason, string> = {
  already_reserved: "Your place is already reserved.",
  session_full: "All four places are reserved.",
  schedule_conflict: "This overlaps one of your upcoming sessions.",
  reservation_limit: "You already hold three upcoming registrations at the same time.",
  suspended: "New reservations are temporarily paused after repeated no-shows.",
  closed: "Reservations for this session are closed."
};

function ParticipantList({ session }: { session: SessionSummary }) {
  const openSpots = Math.max(0, session.capacity - session.participants.length);
  return <div className="participant-list">{session.participants.map((participant) => <div className="participant-slot" key={`${participant.role}-${participant.slot}`}><span className={`avatar participant-${participant.role}`}>{participant.initials}</span><div><strong>{participant.displayName}{participant.isViewer ? " (you)" : ""}</strong><p className="small-copy">{participant.isHost ? "Host · " : ""}{participant.role === "native" ? "Native speaker" : "Language learner"}</p></div><span className={`role-pill ${participant.role}`}>{participant.role === "native" ? "Native" : "Practice"}</span></div>)}{Array.from({ length: openSpots }, (_, index) => <div className="participant-slot open" key={`open-${index}`}><span className="avatar empty">+</span><div><strong>Open spot</strong><p className="small-copy">Any learner can join</p></div></div>)}</div>;
}

export default async function SessionDetailPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<{ created?: string }> }) {
  const { session: authSession } = await requireOnboardedUser();
  const { sessionId } = await params;
  let session: SessionSummary;
  try { session = await callBusinessRoute<SessionSummary>(`/api/ntmy/sessions/${sessionId}`, { method: "GET" }, authSession); } catch { notFound(); }
  const created = (await searchParams).created === "1";
  const reserved = session.viewerReservationStatus === "reserved";
  const upcoming = session.isUpcoming;
  const reportable = ["reserved", "attended", "no_show"].includes(session.viewerReservationStatus ?? "");
  const participationLabel = session.status === "completed" ? `${session.participantCount}/4 participants` : session.status === "cancelled" ? "Cancelled" : `${session.participantCount}/4 reserved`;
  const placeHeading = session.status === "cancelled"
    ? "This session was cancelled"
    : session.status === "completed" && session.viewerRole
      ? `You joined as ${session.viewerRole === "native" ? "Native" : "Practice"}`
      : reserved
        ? `You are joining as ${session.viewerRole === "native" ? "Native" : "Practice"}`
        : `Join as ${session.viewerEligibility.role === "native" ? "Native" : "Practice"}`;

  return <main className="shell page-shell stack">
    {created && <p className="success">Session published — your place is reserved.</p>}
    <Link className="text-button" href="/app/sessions">← Back to Explore</Link>
    <div className="detail-layout">
      <div className="stack">
        <section className="card detail-hero"><div className="session-card-head"><span className="language-pill">{session.languageName}</span><span className="status-pill">{participationLabel}</span></div><h1 className="editorial">{session.languageName} speaking session</h1>{session.note && <p className="hero-copy">{session.note}</p>}<p><strong><DeviceLocalTime value={session.startsAt} options={{ dateStyle: "full", timeStyle: "short" }} /></strong> · 30 minutes · shown in your device timezone</p></section>
        {session.status === "cancelled" ? <section className="card stack"><p className="eyebrow">Session status</p><h2>This session was cancelled.</h2><p>No attendance was recorded.</p></section> : <section className="card stack"><div className="section-label"><div><p className="eyebrow">Your group</p><h2>{session.practiceCount} Practice · {session.nativeCount} Native</h2></div><span className="status-pill">{session.participantCount}/4 people</span></div><ParticipantList session={session} /></section>}
        <section className="card soft"><p className="eyebrow">What to expect</p><div className="grid"><div><strong>Two to four people</strong><p className="small-copy">The room opens with two participants. Native and Practice labels are informative only.</p></div><div><strong>Private by design</strong><p className="small-copy">No recording and no public profile required.</p></div><div><strong>Real speaking time</strong><p className="small-copy">Thirty minutes to use the language naturally with people around the world.</p></div></div></section>
      </div>
      <aside className="card sticky-card stack">
        <div><p className="eyebrow">Your place</p><h2>{placeHeading}</h2></div>
        {reportable && session.viewerRole && <span className={`role-pill ${session.viewerRole}`}>{session.viewerRole === "native" ? "Native participant" : "Practice participant"}</span>}
        <div className="action-list">
          {reserved && <SessionLiveActions sessionId={sessionId} initialSnapshot={{ status: session.status, participantCount: session.participantCount, minimumParticipants: session.minimumParticipants, startsAt: session.startsAt, endsAt: session.endsAt, joinOpensAt: session.joinOpensAt }} initialServerNow={new Date().toISOString()} />}
          {!reserved && session.viewerEligibility.canReserve && <ReservationActions sessionId={sessionId} action="reserve" />}
          {!reserved && session.status === "scheduled" && !session.viewerEligibility.canReserve && <p className="notice">{reasons[session.viewerEligibility.reason ?? "closed"]}</p>}
          {reserved && upcoming && <a className="button secondary" href={`/api/app/sessions/${sessionId}/calendar`}>Add to calendar</a>}
          {reserved && !session.isHost && upcoming && <ReservationActions sessionId={sessionId} />}
          {session.isHost && upcoming && session.hostCanCancel && <><p className="small-copy">You can cancel while you are the only participant.</p><ReservationActions sessionId={sessionId} action="cancelSession" /></>}
          {session.isHost && upcoming && !session.hostCanCancel && <p className="notice">Other people have joined, so this session can no longer be cancelled by its host.</p>}
          {reportable && <Link className="text-button" href={`/app/sessions/${sessionId}/feedback`}>Report a safety concern</Link>}
        </div>
      </aside>
    </div>
  </main>;
}

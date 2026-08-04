import Link from "next/link";
import { DeviceLocalTime } from "@/components/device-local-time";
import type { SessionSummary } from "@/types/api";

export function SessionCard({ session }: { session: SessionSummary }) {
  const role = session.viewerRole ?? session.viewerEligibility.role;
  const openSpots = Math.max(0, session.capacity - session.participantCount);
  return <article className="card session-card stack">
    <div className="session-card-head"><span className="language-pill">{session.languageName}</span><span className={`role-pill ${role}`}>{session.viewerReservationStatus === "reserved" ? `You · ${role === "native" ? "Native" : "Practice"}` : `${role === "native" ? "Native" : "Practice"} type`}</span></div>
    <div><h2 className="session-title">{session.languageName} speaking session</h2><p className="session-meta"><span><DeviceLocalTime value={session.startsAt} options={{ weekday: "short", month: "short", day: "numeric" }} /></span><span><DeviceLocalTime value={session.startsAt} options={{ hour: "2-digit", minute: "2-digit" }} /></span><span>30 min</span></p>{session.note && <p className="session-note">{session.note}</p>}</div>
    <div className="participant-summary"><strong>{session.practiceCount} Practice</strong><span>·</span><strong>{session.nativeCount} Native</strong><span>·</span><strong>{openSpots} open</strong></div>
    <div className="slot-group">{session.participants.map((participant) => <span className={`avatar participant-${participant.role}`} aria-label={`${participant.displayName}, ${participant.role}`} title={`${participant.displayName} · ${participant.role}`} key={`${participant.role}-${participant.slot}`}>{participant.initials}</span>)}{Array.from({ length: openSpots }, (_, index) => <span className="avatar empty" aria-label="Open spot" title="Open spot" key={`open-${index}`}>+</span>)}</div>
    <Link className="button secondary" href={`/app/sessions/${session.id}`}>{session.viewerReservationStatus === "reserved" ? "View my session" : "View session"} <span aria-hidden="true">→</span></Link>
  </article>;
}

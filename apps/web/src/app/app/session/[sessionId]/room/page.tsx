import { notFound, redirect } from "next/navigation";
import { RoomClient } from "@/components/room/room-client";
import { requireOnboardedUser } from "@/lib/auth/app-user";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import type { SessionSummary } from "@/types/api";

export default async function RoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { session: authSession } = await requireOnboardedUser();
  const { sessionId } = await params;
  let session: SessionSummary;
  try { session = await callBusinessRoute<SessionSummary>(`/api/ntmy/sessions/${sessionId}`, { method: "GET" }, authSession); } catch { notFound(); }
  if (session.viewerReservationStatus !== "reserved" || !session.viewerRole || !["lobby", "open"].includes(session.joinState)) redirect(`/app/sessions/${sessionId}`);
  return <RoomClient sessionId={sessionId} languageName={session.languageName} note={session.note} startsAt={session.startsAt} endsAt={session.endsAt} role={session.viewerRole} participants={session.participants} initialServerNow={new Date().toISOString()} />;
}

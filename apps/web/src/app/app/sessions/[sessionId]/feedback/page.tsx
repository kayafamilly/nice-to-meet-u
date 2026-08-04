import { notFound } from "next/navigation";
import { FeedbackForm } from "@/components/feedback-form";
import { requireOnboardedUser } from "@/lib/auth/app-user";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import type { SessionSummary } from "@/types/api";

export default async function FeedbackPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { session: authSession } = await requireOnboardedUser();
  const { sessionId } = await params;
  let session: SessionSummary;
  try { session = await callBusinessRoute<SessionSummary>(`/api/ntmy/sessions/${sessionId}`, { method: "GET" }, authSession); } catch { notFound(); }
  if (session.viewerReservationStatus !== "reserved" && !["attended", "no_show"].includes(session.viewerReservationStatus ?? "")) notFound();
  return <main className="shell page-shell" style={{ maxWidth: "42rem" }}><FeedbackForm sessionId={sessionId} participants={session.participants} /></main>;
}

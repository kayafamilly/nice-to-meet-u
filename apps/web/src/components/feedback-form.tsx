"use client";

import { useState } from "react";
import Link from "next/link";
import { csrfToken } from "@/lib/client/csrf";
import type { SessionParticipantPreview } from "@/types/api";

export function FeedbackForm({ sessionId, participants }: { sessionId: string; participants: SessionParticipantPreview[] }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const reportedParticipantId = String(formData.get("reportedParticipantId") || "");
      const response = await fetch("/api/app/moderation/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ sessionId, reportedParticipantId: reportedParticipantId || undefined, reason: formData.get("reason"), details: formData.get("details") })
      });
      if (!response.ok) throw new Error("We could not send the report. Please try again.");
      setSent(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We could not send the report. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) return <div className="card stack"><p className="success">Thank you. Your report has been recorded for review.</p><Link className="button secondary" href={`/app/sessions/${sessionId}`}>Back to conversation</Link></div>;
  return <form className="card stack" action={submit}>
    <div><p className="eyebrow">Safety comes first</p><h1>Report a concern</h1><p>Tell us what happened. Reports are private and reviewed by the moderation team.</p></div>
    <label className="field">Who is this about? <select name="reportedParticipantId" defaultValue=""><option value="">The session in general</option>{participants.filter((participant) => participant.reportParticipantId).map((participant) => <option key={participant.reportParticipantId} value={participant.reportParticipantId!}>{participant.displayName}</option>)}</select></label>
    <label className="field">Reason<select name="reason" defaultValue="other"><option value="harassment">Harassment</option><option value="hate">Hate or discrimination</option><option value="sexual_content">Sexual content</option><option value="spam">Spam</option><option value="other">Other</option></select></label>
    <label className="field">What happened? (optional)<textarea name="details" maxLength={1000} rows={5} placeholder="Share only what is useful for the review." /></label>
    {error && <p className="error" role="alert">{error}</p>}<button className="button danger" disabled={pending}>{pending ? "Sending…" : "Send private report"}</button><Link className="text-button" href={`/app/sessions/${sessionId}`}>Cancel</Link>
  </form>;
}

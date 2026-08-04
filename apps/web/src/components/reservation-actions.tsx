"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/client/api-error";
import { csrfToken } from "@/lib/client/csrf";

type SessionAction = "reserve" | "cancel" | "cancelSession";

export function ReservationActions({ sessionId, action = "cancel" }: { sessionId: string; action?: SessionAction }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage(null);
    try {
      const path = action === "reserve" ? "reserve" : action === "cancel" ? "cancel-reservation" : "cancel";
      const response = await fetch(`/api/app/sessions/${sessionId}/${path}`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken() }
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, {
        SESSION_FULL: "All four places were just taken.",
        SCHEDULE_CONFLICT: "This overlaps one of your upcoming conversations.",
        RESERVATION_LIMIT: "You already hold three upcoming registrations at the same time.",
        SUSPENDED: "New reservations are temporarily paused after repeated no-shows.",
        HOST_CANCEL_LOCKED: "Other people have joined, so the host can no longer cancel this session."
      }, action === "reserve" ? "This reservation is no longer available." : action === "cancel" ? "You do not have an active reservation to cancel." : "Only the host can cancel an upcoming session."));
      setMessage(action === "reserve" ? "Your place is reserved. We will remind you before the session." : action === "cancel" ? "Your place has been released." : "Session cancelled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the reservation.");
    } finally {
      setPending(false);
    }
  }

  const label = action === "reserve" ? "Reserve my spot" : action === "cancel" ? "Cancel my reservation" : "Cancel conversation";
  return <div className="stack"><button className={action === "reserve" ? "button accent" : action === "cancelSession" ? "button danger" : "button secondary"} onClick={() => void submit()} disabled={pending}>{pending ? (action === "reserve" ? "Reserving…" : "Cancelling…") : label}</button>{message && <p className="notice" role="status">{message}</p>}</div>;
}

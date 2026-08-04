import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { apiError, unauthorized } from "@/lib/http";
import type { SessionSummary } from "@/types/api";

function icsDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_: Request, context: { params: Promise<{ sessionId: string }> }) {
  const authSession = await getServerSession();
  if (!authSession) return unauthorized();
  try {
    const { sessionId } = await context.params;
    const session = await callBusinessRoute<SessionSummary>(`/api/ntmy/sessions/${sessionId}`, { method: "GET" }, authSession);
    if (session.viewerReservationStatus !== "reserved") return NextResponse.json({ error: "RESERVATION_REQUIRED" }, { status: 403 });
    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NiceToMeetU//Language Exchange//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${session.id}@nicetomeetu`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(session.startsAt)}`,
      `DTEND:${icsDate(session.endsAt)}`,
      `SUMMARY:${icsText(`${session.languageName} speaking session`)}`,
      `DESCRIPTION:${icsText(session.note || "A small NiceToMeetU language speaking session.")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="nicetomeetu-${session.id}.ics"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";
import type { SessionSummary } from "@/types/api";

const createSchema = z.object({
  languageId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  note: z.string().trim().max(500).optional().default("")
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  try {
    const languageId = request.nextUrl.searchParams.get("languageId");
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const fromTime = from ? Date.parse(from) : Number.NEGATIVE_INFINITY;
    const toTime = to ? Date.parse(to) : Number.POSITIVE_INFINITY;
    if (Number.isNaN(fromTime) || Number.isNaN(toTime) || fromTime > toTime) return noStoreJson({ error: "INVALID_DATE_RANGE" }, 400);
    const businessQuery = new URLSearchParams();
    if (languageId) businessQuery.set("languageId", languageId);
    if (from) businessQuery.set("from", from);
    if (to) businessQuery.set("to", to);
    const sessions = await callBusinessRoute<SessionSummary[]>(`/api/ntmy/sessions${businessQuery.size ? `?${businessQuery}` : ""}`, { method: "GET" }, session);
    return noStoreJson(
      sessions
        .filter((item) => item.viewerReservationStatus === "reserved" || ((!languageId || item.languageId === languageId) && Date.parse(item.startsAt) >= fromTime && Date.parse(item.startsAt) <= toTime))
        .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "session-create", 10, 60 * 60 * 1000);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const input = createSchema.parse(await request.json());
    const result = await callBusinessRoute("/api/ntmy/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }, session);
    return noStoreJson(result, 201);
  } catch (error) {
    return apiError(error);
  }
}

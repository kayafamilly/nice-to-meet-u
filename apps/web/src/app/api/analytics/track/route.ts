import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyticsDevice, normalizeAnalyticsPath } from "@/lib/analytics";
import { ANALYTICS_VISITOR_COOKIE, analyticsVisitorHash } from "@/lib/analytics-identity";
import { getServerEnv } from "@/lib/env";
import { apiError } from "@/lib/http";
import { managementInternal } from "@/lib/management/data";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { assertTrustedOrigin } from "@/lib/security/request";

const input = z.object({ eventId: z.string().uuid(), path: z.string().max(200), referrer: z.string().url().max(2048).or(z.literal("")).optional(), utmSource: z.string().max(100).optional(), utmMedium: z.string().max(100).optional(), utmCampaign: z.string().max(100).optional() });
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request); assertRateLimit(request, "analytics", 120, 60_000);
    const agent = request.headers.get("user-agent") ?? "";
    if (/bot|crawler|spider|preview/i.test(agent)) return new NextResponse(null, { status: 204 });
    const parsed = input.parse(await request.json());
    const path = normalizeAnalyticsPath(parsed.path);
    if (!path) return new NextResponse(null, { status: 204 });
    const visitor = request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value ?? randomBytes(24).toString("base64url");
    const secret = getServerEnv().ANALYTICS_HASH_SECRET;
    if (!secret) throw new Error("Analytics is not configured");
    const visitorHash = analyticsVisitorHash(visitor, secret);
    let referrerHost = "";
    try { if (parsed.referrer) { const host = new URL(parsed.referrer).hostname; if (host !== new URL(getServerEnv().NEXT_PUBLIC_APP_URL).hostname) referrerHost = host.slice(0, 200); } } catch {}
    const event = { eventId: parsed.eventId, path: parsed.path, utmSource: parsed.utmSource, utmMedium: parsed.utmMedium, utmCampaign: parsed.utmCampaign };
    await managementInternal("/api/ntmy/internal/analytics/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...event, path, visitorHash, referrerHost, device: analyticsDevice(agent) }) });
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    if (!request.cookies.has(ANALYTICS_VISITOR_COOKIE)) response.cookies.set(ANALYTICS_VISITOR_COOKIE, visitor, { httpOnly: true, secure: new URL(getServerEnv().NEXT_PUBLIC_APP_URL).protocol === "https:", sameSite: "lax", maxAge: 90 * 86400, path: "/" });
    return response;
  } catch (error) { return apiError(error); }
}

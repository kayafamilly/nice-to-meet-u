import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "session-cancel", 10, 10 * 60 * 1000);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const { sessionId } = await params;
    return noStoreJson(await callBusinessRoute(`/api/ntmy/sessions/${sessionId}/cancel-reservation`, { method: "POST" }, session));
  } catch (error) {
    return apiError(error);
  }
}

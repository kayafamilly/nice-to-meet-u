import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";

export async function POST(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const { notificationId } = await params;
    return noStoreJson(await callBusinessRoute(`/api/ntmy/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST" }, session));
  } catch (error) {
    return apiError(error);
  }
}

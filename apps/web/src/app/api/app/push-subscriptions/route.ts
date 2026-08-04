import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) })
});

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const subscription = subscriptionSchema.parse(await request.json());
    return noStoreJson(await callBusinessRoute("/api/ntmy/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint, ...subscription.keys })
    }, session), 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const { endpoint } = z.object({ endpoint: z.string().url().max(2000) }).parse(await request.json());
    return noStoreJson(await callBusinessRoute("/api/ntmy/push-subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint })
    }, session));
  } catch (error) {
    return apiError(error);
  }
}

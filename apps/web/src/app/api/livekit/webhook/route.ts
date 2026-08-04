import { WebhookReceiver } from "livekit-server-sdk";
import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { noStoreJson } from "@/lib/http";

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const rawBody = await request.text();
  const authorization = request.headers.get("authorization") ?? "";
  let payload: { id: string; event: string; createdAt?: number; room: { name?: string; metadata?: string }; participant: { identity?: string; name?: string } };

  try {
    const event = await new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET).receive(rawBody, authorization);
    payload = {
      id: event.id,
      event: event.event,
      createdAt: Number(event.createdAt),
      room: event.room ? { name: event.room.name, metadata: event.room.metadata } : {},
      participant: event.participant ? { identity: event.participant.identity, name: event.participant.name } : {}
    };
  } catch {
    return noStoreJson({ error: "INVALID_WEBHOOK" }, 401);
  }

  try {
    const response = await fetch(`${env.POCKETBASE_INTERNAL_URL}/api/ntmy/livekit/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Webhook-Secret": env.POCKETBASE_INTERNAL_WEBHOOK_SECRET },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    // Only an explicit completed/duplicate 200 acknowledges the provider event.
    // Processing conflicts and every upstream failure remain retryable.
    if (response.status !== 200) return noStoreJson({ error: "PROCESSING_FAILED" }, 503);
    return noStoreJson({ received: true });
  } catch {
    return noStoreJson({ error: "PROCESSING_UNAVAILABLE" }, 503);
  }
}

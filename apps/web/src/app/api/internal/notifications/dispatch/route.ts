import { NextRequest } from "next/server";
import webpush from "web-push";
import { getServerEnv } from "@/lib/env";
import { noStoreJson, unauthorized } from "@/lib/http";
import { callInternalBusinessRoute } from "@/lib/pocketbase/server";

type ClaimedNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
  subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>;
};

function isWorkerRequest(request: NextRequest): boolean {
  const expected = `Bearer ${getServerEnv().NOTIFICATION_WORKER_SECRET}`;
  return request.headers.get("authorization") === expected;
}

export async function POST(request: NextRequest) {
  if (!isWorkerRequest(request)) return unauthorized();
  const env = getServerEnv();
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const claim = await callInternalBusinessRoute<{ notifications: ClaimedNotification[] }>("/api/ntmy/internal/notifications/claim", { method: "POST" });
  let delivered = 0;
  let retried = 0;

  for (const notification of claim.notifications) {
    try {
      // A user who declined push permission still gets the in-app event. Mark
      // the outbox item complete rather than retrying a delivery that has no target.
      if (notification.subscriptions.length) {
        const deliveries = await Promise.allSettled(notification.subscriptions.map((subscription) => webpush.sendNotification(subscription, JSON.stringify({ title: notification.title, body: notification.body, url: notification.url }))));
        if (deliveries.every((delivery) => delivery.status === "rejected")) throw new Error("Every browser push delivery failed");
      }
      await callInternalBusinessRoute(`/api/ntmy/internal/notifications/${encodeURIComponent(notification.id)}/ack`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "delivered" })
      });
      delivered += 1;
    } catch (error) {
      await callInternalBusinessRoute(`/api/ntmy/internal/notifications/${encodeURIComponent(notification.id)}/ack`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : "Push delivery failed" })
      });
      retried += 1;
    }
  }

  return noStoreJson({ claimed: claim.notifications.length, delivered, retried });
}

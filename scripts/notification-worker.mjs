const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
const secret = process.env.NOTIFICATION_WORKER_SECRET;

if (!baseUrl || !secret) {
  throw new Error("NEXT_PUBLIC_APP_URL and NOTIFICATION_WORKER_SECRET are required for the notification worker");
}

async function dispatch() {
  const response = await fetch(new URL("/api/internal/notifications/dispatch", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` }
  });
  if (!response.ok) throw new Error(`Notification dispatch returned ${response.status}`);
  const result = await response.json();
  if (result.claimed) process.stdout.write(`notification worker: ${result.delivered} delivered, ${result.retried} retrying\n`);
}

async function tick() {
  try { await dispatch(); } catch (error) { console.error("notification worker:", error instanceof Error ? error.message : error); }
}

await tick();
setInterval(tick, 30_000);

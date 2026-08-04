const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
const secret = process.env.LIVEKIT_LIFECYCLE_WORKER_SECRET;

if (!baseUrl || !secret) {
  throw new Error("NEXT_PUBLIC_APP_URL and LIVEKIT_LIFECYCLE_WORKER_SECRET are required for the LiveKit lifecycle worker");
}

async function closeExpiredRooms() {
  try {
    const response = await fetch(new URL("/api/internal/livekit/rooms/close-expired", baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(4_500)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`room cleanup returned ${response.status}`);
    if (result?.closed) process.stdout.write(`LiveKit lifecycle worker: ${result.closed} expired room(s) closed\n`);
    const nextEndsAt = Date.parse(result?.nextEndsAt ?? "");
    if (Number.isFinite(nextEndsAt)) {
      return Math.max(100, Math.min(5_000, nextEndsAt - Date.now() + 100));
    }
    return 5_000;
  } catch (error) {
    console.error("LiveKit lifecycle worker:", error instanceof Error ? error.message : error);
    return 500;
  }
}

async function tick() {
  const nextDelay = await closeExpiredRooms();
  setTimeout(tick, nextDelay);
}

await tick();

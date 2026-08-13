import { NextRequest } from "next/server";
import { RoomServiceClient, ServerError } from "livekit-server-sdk";
import { getServerEnv } from "@/lib/env";
import { noStoreJson, unauthorized } from "@/lib/http";
import { managementInternal } from "@/lib/management/data";

function isLifecycleWorkerRequest(request: NextRequest): boolean {
  const expected = `Bearer ${getServerEnv().LIVEKIT_LIFECYCLE_WORKER_SECRET}`;
  return request.headers.get("authorization") === expected;
}

function roomEndsAt(metadata: string): number | null {
  try {
    const parsed = JSON.parse(metadata || "{}") as { endsAt?: string };
    const endsAt = new Date(parsed.endsAt ?? "").getTime();
    return Number.isFinite(endsAt) ? endsAt : null;
  } catch {
    return null;
  }
}

async function deleteRoomIdempotently(roomService: RoomServiceClient, roomName: string): Promise<void> {
  try {
    await roomService.deleteRoom(roomName);
  } catch (error) {
    if (error instanceof ServerError && error.code === "not_found") return;
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (!isLifecycleWorkerRequest(request)) return unauthorized();
  const env = getServerEnv();
  const roomService = new RoomServiceClient(env.LIVEKIT_HTTP_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  const serverNow = Date.now();
  const rooms = await roomService.listRooms();
  const roomDeadlines = rooms.map((room) => ({ room, endsAt: roomEndsAt(room.metadata) }));
  const expiredRooms = roomDeadlines
    .filter(({ endsAt }) => endsAt !== null && endsAt <= serverNow)
    .map(({ room }) => room);
  const nextEndsAt = roomDeadlines
    .map(({ endsAt }) => endsAt)
    .filter((endsAt): endsAt is number => endsAt !== null && endsAt > serverNow)
    .sort((left, right) => left - right)[0] ?? null;
  const results = await Promise.allSettled(expiredRooms.map((room) => deleteRoomIdempotently(roomService, room.name)));
  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed) console.error("Unable to close every expired LiveKit room", { attempted: expiredRooms.length, failed });
  if (!failed) await managementInternal("/api/ntmy/internal/management/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: "livekit_worker" }) });
  return noStoreJson({
    checked: rooms.length,
    closed: expiredRooms.length - failed,
    failed,
    nextEndsAt: nextEndsAt === null ? null : new Date(nextEndsAt).toISOString(),
    serverNow: new Date(serverNow).toISOString()
  }, failed ? 503 : 200);
}

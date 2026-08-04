import { RoomServiceClient } from "livekit-server-sdk";
import { getServerEnv } from "@/lib/env";
import { noStoreJson } from "@/lib/http";

export async function GET() {
  const env = getServerEnv();
  try {
    await new RoomServiceClient(env.LIVEKIT_HTTP_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET).listRooms();
    return noStoreJson({ status: "ok", services: { livekit: "ok" } });
  } catch {
    return noStoreJson({ status: "degraded", services: { livekit: "unreachable" } }, 503);
  }
}

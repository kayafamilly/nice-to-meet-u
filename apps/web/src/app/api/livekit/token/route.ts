import { AccessToken, RoomServiceClient, ServerError, TrackSource, type VideoGrant } from "livekit-server-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({ sessionId: z.string().min(1) });
const pocketBaseDateSchema = z.string().min(1).refine((value) => Number.isFinite(new Date(value).getTime()), "Invalid date");
const authorizationSchema = z.object({
  allowed: z.literal(true),
  roomName: z.string().min(1),
  participantIdentity: z.string().min(1),
  participantName: z.string().min(1),
  role: z.enum(["practice", "native"]),
  sessionParticipantId: z.string().min(1),
  startsAt: pocketBaseDateSchema,
  endsAt: pocketBaseDateSchema
});

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "livekit-token", 30, 10 * 60 * 1000);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const { sessionId } = inputSchema.parse(await request.json());
    const allowed = authorizationSchema.parse(await callBusinessRoute(`/api/ntmy/sessions/${sessionId}/join-authorize`, { method: "POST" }, session));
    const startsAt = new Date(allowed.startsAt).toISOString();
    const endsAt = new Date(allowed.endsAt).toISOString();
    const env = getServerEnv();
    const roomService = new RoomServiceClient(env.LIVEKIT_HTTP_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    try {
      await roomService.createRoom({
        name: allowed.roomName,
        maxParticipants: 4,
        emptyTimeout: 120,
        metadata: JSON.stringify({ sessionId, endsAt })
      });
    } catch (roomError) {
      if (!(roomError instanceof ServerError) || roomError.code !== "already_exists") throw roomError;
    }

    const now = Date.now();
    const joinWindowSeconds = Math.max(1, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: allowed.participantIdentity,
      name: allowed.participantName,
      ttl: joinWindowSeconds,
      metadata: JSON.stringify({ sessionId, sessionParticipantId: allowed.sessionParticipantId, role: allowed.role })
    });
    const grant: VideoGrant = {
      roomJoin: true,
      room: allowed.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
      canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE]
    };
    token.addGrant(grant);
    return noStoreJson({
      serverUrl: env.NEXT_PUBLIC_LIVEKIT_WS_URL,
      participantToken: await token.toJwt(),
      serverNow: new Date(now).toISOString(),
      startsAt,
      endsAt
    });
  } catch (error) {
    return apiError(error);
  }
}

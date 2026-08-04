import type { JoinState } from "@/types/api";

export type SessionClock = {
  phase: "lobby" | "live" | "ended";
  remainingMs: number;
  progress: number;
  label: string;
};

export function sessionJoinStateAt({
  status,
  participantCount,
  minimumParticipants,
  startsAt,
  endsAt,
  now
}: {
  status: string;
  participantCount: number;
  minimumParticipants: number;
  startsAt: string;
  endsAt: string;
  now: number;
}): JoinState {
  const startsAtMs = new Date(startsAt).getTime();
  const endsAtMs = new Date(endsAt).getTime();
  if (status !== "scheduled" || ![startsAtMs, endsAtMs, now].every(Number.isFinite) || now >= endsAtMs) return "closed";
  if (participantCount < minimumParticipants) return "waiting_for_group";
  if (now < startsAtMs - 10 * 60 * 1000) return "opens_later";
  if (now < startsAtMs) return "lobby";
  return "open";
}

export function serverClockOffset(serverNow: string, requestStartedAt: number, responseReceivedAt: number): number {
  const serverTime = new Date(serverNow).getTime();
  if (!Number.isFinite(serverTime) || !Number.isFinite(requestStartedAt) || !Number.isFinite(responseReceivedAt)) return 0;
  return serverTime - (requestStartedAt + responseReceivedAt) / 2;
}

export function formatRoomDuration(milliseconds: number): string {
  const safe = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function sessionClock(startsAt: string, endsAt: string, now: number): SessionClock {
  const startsAtMs = new Date(startsAt).getTime();
  const endsAtMs = new Date(endsAt).getTime();
  if (![startsAtMs, endsAtMs, now].every(Number.isFinite) || endsAtMs <= startsAtMs || now >= endsAtMs) {
    return { phase: "ended", remainingMs: 0, progress: 100, label: "00:00" };
  }
  if (now < startsAtMs) {
    const remainingMs = startsAtMs - now;
    return { phase: "lobby", remainingMs, progress: 0, label: formatRoomDuration(remainingMs) };
  }
  const remainingMs = endsAtMs - now;
  const progress = Math.max(0, Math.min(100, ((now - startsAtMs) / (endsAtMs - startsAtMs)) * 100));
  return { phase: "live", remainingMs, progress, label: formatRoomDuration(remainingMs) };
}

export function mediaDeviceErrorMessage(error: unknown): string {
  const name = typeof error === "string" ? error : error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "PermissionDenied") {
    return "Camera and microphone access was blocked. Allow both permissions in your browser, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "NotFound") {
    return "A camera and microphone are required. Connect both devices, then try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "DeviceInUse") {
    return "Your camera or microphone is being used by another app. Close it there, then try again.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "The selected camera or microphone is unavailable. Choose another device.";
  }
  return "We could not start your camera and microphone. Check your browser permissions and devices, then try again.";
}

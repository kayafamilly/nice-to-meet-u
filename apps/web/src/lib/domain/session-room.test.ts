import { describe, expect, it } from "vitest";
import { formatRoomDuration, mediaDeviceErrorMessage, serverClockOffset, sessionClock, sessionJoinStateAt } from "./session-room";

describe("session room timing", () => {
  const startsAt = "2030-01-01T10:00:00.000Z";
  const endsAt = "2030-01-01T10:30:00.000Z";

  it("counts down to the start, then exactly thirty minutes to zero", () => {
    expect(sessionClock(startsAt, endsAt, Date.parse("2030-01-01T09:55:00.000Z"))).toMatchObject({ phase: "lobby", label: "05:00", progress: 0 });
    expect(sessionClock(startsAt, endsAt, Date.parse(startsAt))).toMatchObject({ phase: "live", label: "30:00", progress: 0 });
    expect(sessionClock(startsAt, endsAt, Date.parse("2030-01-01T10:15:00.000Z"))).toMatchObject({ phase: "live", label: "15:00", progress: 50 });
    expect(sessionClock(startsAt, endsAt, Date.parse(endsAt))).toEqual({ phase: "ended", label: "00:00", progress: 100, remainingMs: 0 });
  });

  it("rounds the visible countdown up without going negative", () => {
    expect(formatRoomDuration(1)).toBe("00:01");
    expect(formatRoomDuration(60_001)).toBe("01:01");
    expect(formatRoomDuration(-1)).toBe("00:00");
  });

  it("uses the request midpoint to compensate for device clock skew", () => {
    expect(serverClockOffset("2030-01-01T10:00:01.000Z", Date.parse("2030-01-01T10:00:00.000Z"), Date.parse("2030-01-01T10:00:00.200Z"))).toBe(900);
    expect(serverClockOffset("invalid", 0, 1)).toBe(0);
  });
});

describe("session detail live state", () => {
  const base = {
    status: "scheduled",
    participantCount: 2,
    minimumParticipants: 2,
    startsAt: "2030-01-01T10:00:00.000Z",
    endsAt: "2030-01-01T10:30:00.000Z"
  };

  it("switches automatically from waiting to lobby, live and closed", () => {
    expect(sessionJoinStateAt({ ...base, now: Date.parse("2030-01-01T09:49:59.000Z") })).toBe("opens_later");
    expect(sessionJoinStateAt({ ...base, now: Date.parse("2030-01-01T09:50:00.000Z") })).toBe("lobby");
    expect(sessionJoinStateAt({ ...base, now: Date.parse("2030-01-01T10:00:00.000Z") })).toBe("open");
    expect(sessionJoinStateAt({ ...base, now: Date.parse("2030-01-01T10:30:00.000Z") })).toBe("closed");
  });

  it("keeps an undersized group closed to media", () => {
    expect(sessionJoinStateAt({ ...base, participantCount: 1, now: Date.parse("2030-01-01T09:55:00.000Z") })).toBe("waiting_for_group");
  });
});

describe("media permission guidance", () => {
  it("provides actionable messages for common browser failures", () => {
    const denied = new Error();
    denied.name = "NotAllowedError";
    const busy = new Error();
    busy.name = "NotReadableError";
    expect(mediaDeviceErrorMessage(denied)).toContain("Allow both permissions");
    expect(mediaDeviceErrorMessage(busy)).toContain("another app");
    expect(mediaDeviceErrorMessage("PermissionDenied")).toContain("Allow both permissions");
    expect(mediaDeviceErrorMessage("NotFound")).toContain("Connect both devices");
    expect(mediaDeviceErrorMessage("DeviceInUse")).toContain("another app");
  });
});

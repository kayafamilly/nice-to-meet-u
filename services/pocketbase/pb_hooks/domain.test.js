import { describe, expect, it } from "vitest";
import domain from "./domain.js";

const { hasValidatedAttendance, hasValidatedAttendanceFromEvents, hasViableGroup, isProcessingLeaseExpired, isSessionClosureDue, rangesOverlap, roomNameFor, sessionJoinState } = domain;

const session = {
  startsAt: "2030-01-01T10:00:00.000Z",
  endsAt: "2030-01-01T10:30:00.000Z",
  minimumMinutes: 20
};

describe("PocketBase session domain rules", () => {
  it("derives the room name from a non-empty session id", () => {
    expect(roomNameFor("abc123def456ghi")).toBe("ntmy_abc123def456ghi");
  });

  it("only validates twenty minutes inside the scheduled window", () => {
    expect(hasValidatedAttendance({ ...session, joinedAt: "2030-01-01T09:55:00.000Z", leftAt: "2030-01-01T10:20:00.000Z" })).toBe(true);
    expect(hasValidatedAttendance({ ...session, joinedAt: "2030-01-01T10:11:00.000Z", leftAt: "2030-01-01T10:30:00.000Z" })).toBe(false);
  });

  it("rejects malformed and inverted attendance windows", () => {
    expect(hasValidatedAttendance({ ...session, joinedAt: "invalid", leftAt: "2030-01-01T10:30:00.000Z" })).toBe(false);
    expect(hasValidatedAttendance({ ...session, joinedAt: "2030-01-01T10:20:00.000Z", leftAt: "2030-01-01T10:10:00.000Z" })).toBe(false);
  });

  it("counts actual joined intervals instead of wall-clock time between reconnects", () => {
    expect(hasValidatedAttendanceFromEvents({
      ...session,
      events: [
        { eventType: "participant_joined", observedAt: "2030-01-01T10:00:00.000Z" },
        { eventType: "participant_left", observedAt: "2030-01-01T10:01:00.000Z" },
        { eventType: "participant_joined", observedAt: "2030-01-01T10:29:00.000Z" },
        { eventType: "participant_left", observedAt: "2030-01-01T10:30:00.000Z" }
      ]
    })).toBe(false);
    expect(hasValidatedAttendanceFromEvents({
      ...session,
      events: [
        { eventType: "participant_joined", observedAt: "2030-01-01T09:55:00.000Z" },
        { eventType: "participant_left", observedAt: "2030-01-01T10:10:00.000Z" },
        { eventType: "participant_joined", observedAt: "2030-01-01T10:15:00.000Z" }
      ]
    })).toBe(true);
  });

  it("reclaims only expired webhook processing leases", () => {
    const now = Date.parse("2030-01-01T10:05:00.000Z");
    expect(isProcessingLeaseExpired("2030-01-01T10:03:01.000Z", now, 120)).toBe(false);
    expect(isProcessingLeaseExpired("2030-01-01T10:03:00.000Z", now, 120)).toBe(true);
    expect(isProcessingLeaseExpired("invalid", now, 120)).toBe(true);
  });

  it("detects schedule conflicts but allows adjacent sessions", () => {
    expect(rangesOverlap("2030-01-01T10:00:00Z", "2030-01-01T10:30:00Z", "2030-01-01T10:15:00Z", "2030-01-01T10:45:00Z")).toBe(true);
    expect(rangesOverlap("2030-01-01T10:00:00Z", "2030-01-01T10:30:00Z", "2030-01-01T10:30:00Z", "2030-01-01T11:00:00Z")).toBe(false);
  });

  it("opens a room for any group of two to four people", () => {
    expect(hasViableGroup(1)).toBe(false);
    expect(hasViableGroup(2)).toBe(true);
    expect(hasViableGroup(3)).toBe(true);
    expect(hasViableGroup(4)).toBe(true);
    expect(hasViableGroup(5)).toBe(false);
  });

  it("separates preparation, live access and the hard media deadline", () => {
    const base = {
      status: "scheduled",
      participantCount: 2,
      startsAt: "2030-01-01T10:00:00.000Z",
      endsAt: "2030-01-01T10:30:00.000Z"
    };
    expect(sessionJoinState({ ...base, now: Date.parse("2030-01-01T09:49:59.999Z") })).toBe("opens_later");
    expect(sessionJoinState({ ...base, now: Date.parse("2030-01-01T09:50:00.000Z") })).toBe("lobby");
    expect(sessionJoinState({ ...base, now: Date.parse("2030-01-01T10:00:00.000Z") })).toBe("open");
    expect(sessionJoinState({ ...base, now: Date.parse("2030-01-01T10:30:00.000Z") })).toBe("closed");
    expect(sessionJoinState({ ...base, participantCount: 1, now: Date.parse("2030-01-01T09:55:00.000Z") })).toBe("waiting_for_group");
  });

  it("keeps five minutes only for backend attendance settlement", () => {
    const endsAt = "2030-01-01T10:30:00.000Z";
    expect(isSessionClosureDue(endsAt, Date.parse("2030-01-01T10:34:59.999Z"), 5)).toBe(false);
    expect(isSessionClosureDue(endsAt, Date.parse("2030-01-01T10:35:00.000Z"), 5)).toBe(false);
    expect(isSessionClosureDue(endsAt, Date.parse("2030-01-01T10:35:00.001Z"), 5)).toBe(true);
  });
});

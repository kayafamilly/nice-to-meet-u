import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "./time-zone";

describe("time-zone formatting", () => {
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };

  it("renders one session instant in each viewer's timezone", () => {
    const instant = "2026-08-03T12:00:00.000Z";
    expect(formatInTimeZone(instant, "Asia/Tokyo", options, "en-GB")).toBe("21:00");
    expect(formatInTimeZone(instant, "America/New_York", options, "en-GB")).toBe("08:00");
    expect(formatInTimeZone(instant, "America/Los_Angeles", options, "en-GB")).toBe("05:00");
  });

  it("rejects invalid dates and timezones", () => {
    expect(formatInTimeZone("invalid", "Asia/Tokyo", options)).toBeNull();
    expect(formatInTimeZone("2026-08-03T12:00:00.000Z", "invalid", options)).toBeNull();
  });
});

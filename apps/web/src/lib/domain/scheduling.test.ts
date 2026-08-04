import { describe, expect, it } from "vitest";
import { localDateValue, roundUpToQuarterHour } from "@/lib/domain/scheduling";

describe("session scheduling helpers", () => {
  it("rounds seconds past a quarter-hour boundary up to the next slot", () => {
    expect(roundUpToQuarterHour(new Date("2030-01-01T10:15:30.000Z")).toISOString()).toBe("2030-01-01T10:30:00.000Z");
  });

  it("keeps an exact quarter-hour boundary unchanged", () => {
    expect(roundUpToQuarterHour(new Date("2030-01-01T10:15:00.000Z")).toISOString()).toBe("2030-01-01T10:15:00.000Z");
  });

  it("formats the calendar date with local date parts", () => {
    const date = new Date(2030, 6, 9, 23, 30);
    expect(localDateValue(date)).toBe("2030-07-09");
  });
});

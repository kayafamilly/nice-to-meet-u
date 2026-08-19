import { describe, expect, it } from "vitest";
import { formatManagementChange, managementPeriod } from "@/lib/management/period";

describe("management periods", () => {
  it("accepts only the three rolling periods", () => {
    expect(managementPeriod("day")).toBe("day");
    expect(managementPeriod("week")).toBe("week");
    expect(managementPeriod("month")).toBe("month");
    expect(managementPeriod("90")).toBe("month");
  });

  it("formats comparisons for the dashboard", () => {
    expect(formatManagementChange(0.125)).toBe("+13 %");
    expect(formatManagementChange(-0.2)).toBe("−20 %");
    expect(formatManagementChange(0)).toBe("Stable");
    expect(formatManagementChange(null)).toBe("Nouveau");
  });
});

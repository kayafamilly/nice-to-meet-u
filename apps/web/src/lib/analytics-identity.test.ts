import { describe, expect, it } from "vitest";
import { analyticsVisitorHash } from "@/lib/analytics-identity";

describe("analytics visitor identity", () => {
  it("creates a stable, secret-dependent anonymous identifier", () => {
    const first = analyticsVisitorHash("visitor-cookie", "a".repeat(32));
    expect(first).toHaveLength(64);
    expect(analyticsVisitorHash("visitor-cookie", "a".repeat(32))).toBe(first);
    expect(analyticsVisitorHash("visitor-cookie", "b".repeat(32))).not.toBe(first);
  });
});

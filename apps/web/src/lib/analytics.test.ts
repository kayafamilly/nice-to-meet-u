import { describe, expect, it } from "vitest";
import { analyticsDevice, normalizeAnalyticsPath } from "@/lib/analytics";

describe("private analytics", () => {
  it("normalizes dynamic public and member routes without retaining identifiers", () => {
    expect(normalizeAnalyticsPath("/app/sessions/abc123?source=email")).toBe("/app/sessions/:id");
    expect(normalizeAnalyticsPath("/guides/practice-spanish")).toBe("/guides/:slug");
    expect(normalizeAnalyticsPath("/pen-pals/french")).toBe("/pen-pals/:slug");
  });

  it("excludes private management, APIs and LiveKit rooms", () => {
    expect(normalizeAnalyticsPath("/management/users")).toBeNull();
    expect(normalizeAnalyticsPath("/api/auth/login")).toBeNull();
    expect(normalizeAnalyticsPath("/app/session/abc/room")).toBeNull();
  });

  it("stores only a coarse device category", () => {
    expect(analyticsDevice("Mozilla/5.0 (iPhone) Mobile")).toBe("mobile");
    expect(analyticsDevice("Mozilla/5.0 (iPad) Tablet")).toBe("tablet");
    expect(analyticsDevice("Mozilla/5.0 (Windows NT 10.0)" )).toBe("desktop");
  });
});

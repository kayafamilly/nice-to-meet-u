import { describe, expect, it } from "vitest";
import { guideForSlug, speakingGuides } from "@/lib/content/speaking-guides";

describe("speaking guide registry", () => {
  it("publishes exactly the six approved international language guides", () => {
    expect(speakingGuides.map((guide) => guide.language)).toEqual([
      "Spanish",
      "English",
      "French",
      "German",
      "Japanese",
      "Korean"
    ]);
    expect(new Set(speakingGuides.map((guide) => guide.slug)).size).toBe(speakingGuides.length);
  });

  it("gives every guide usable editorial and planner content", () => {
    for (const guide of speakingGuides) {
      expect(guide.h1).not.toHaveLength(0);
      expect(guide.seoDescription).not.toHaveLength(0);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(guide.faqs.length).toBeGreaterThanOrEqual(3);
      expect(guide.plannerThemes.length).toBeGreaterThanOrEqual(3);
      expect(guide.plannerThemes.every((theme) => theme.prompts.length >= 3)).toBe(true);
    }
  });

  it("resolves only known, stable guide slugs", () => {
    expect(guideForSlug("spanish-speaking-practice")?.language).toBe("Spanish");
    expect(guideForSlug("not-a-guide")).toBeUndefined();
  });
});

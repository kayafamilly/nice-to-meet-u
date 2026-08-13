import { describe, expect, it } from "vitest";
import { penPalResourceForSlug, penPalResources } from "@/lib/content/pen-pal-resources";

describe("pen-pal resource registry", () => {
  it("publishes the approved generic pen-pal resources without brand comparisons", () => {
    expect(penPalResources.map((resource) => resource.slug)).toEqual([
      "find-language-pen-pals",
      "pen-pal-conversation-starters",
      "safe-online-language-exchange"
    ]);
    expect(new Set(penPalResources.map((resource) => resource.slug)).size).toBe(penPalResources.length);
    const serializedResources = JSON.stringify(penPalResources).toLowerCase();
    for (const brand of ["penpal world", "penpal gate", "global penfriends", "interpals", "penpal match"]) {
      expect(serializedResources).not.toContain(brand);
    }
  });

  it("gives every resource useful original editorial content", () => {
    for (const resource of penPalResources) {
      expect(resource.h1).not.toHaveLength(0);
      expect(resource.seoDescription).not.toHaveLength(0);
      expect(resource.sections.length).toBeGreaterThanOrEqual(3);
      expect(resource.faqs.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps prompt content static and limited to the conversation-starters page", () => {
    const promptResource = penPalResourceForSlug("pen-pal-conversation-starters");
    expect(promptResource?.promptGroups).toHaveLength(3);
    expect(promptResource?.promptGroups?.every((group) => group.prompts.length >= 3)).toBe(true);
    expect(penPalResourceForSlug("find-language-pen-pals")?.promptGroups).toBeUndefined();
    expect(penPalResourceForSlug("not-a-resource")).toBeUndefined();
  });
});

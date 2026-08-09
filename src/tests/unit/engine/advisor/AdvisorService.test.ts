import { describe, it, expect } from "vitest";
import { generateRecommendations, getPlayerDigest } from "@/engine/advisor/AdvisorService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { AIRecommendation } from "@/engine/ai/types";

describe("AdvisorService.generateRecommendations — return shape (Step 2 regression)", () => {
  it("returns an array of AIRecommendation objects with valid shape", () => {
    const heya = MockFactory.createHeya("heya-1", { runwayBand: "desperate" });
    const rikishi = MockFactory.createRikishi("r-1", { heyaId: "heya-1" });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([["r-1", rikishi]]),
      playerHeyaId: "heya-1",
    });

    const recs = generateRecommendations(world, "heya-1");

    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);

    for (const r of recs) {
      expect(typeof r.id).toBe("string");
      expect(["training", "recruitment", "finance", "bout", "governance", "rivalry"]).toContain(r.category);
      expect(["low", "medium", "high", "critical"]).toContain(r.priority);
      expect(typeof r.title).toBe("string");
      expect(typeof r.detail).toBe("string");
      expect(Array.isArray(r.reasoning)).toBe(true);
    }
  });

  it("sorts recommendations by priority (critical first)", () => {
    const heya = MockFactory.createHeya("heya-1", { runwayBand: "desperate" });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      playerHeyaId: "heya-1",
    });

    const recs = generateRecommendations(world, "heya-1");
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    for (let i = 1; i < recs.length; i++) {
      expect(priorityOrder[recs[i].priority]).toBeLessThanOrEqual(priorityOrder[recs[i - 1].priority]);
    }
  });

  it("returns empty array when no playerHeyaId is set", () => {
    const world = MockFactory.createWorld({ playerHeyaId: undefined } as any);
    const recs = generateRecommendations(world);
    expect(recs).toEqual([]);
  });

  it("satisfies the AIRecommendation interface at compile time", () => {
    const world = MockFactory.createWorld();
    const recs: AIRecommendation[] = generateRecommendations(world);
    expect(Array.isArray(recs)).toBe(true);
  });
});

describe("AdvisorService.getPlayerDigest — return shape", () => {
  it("returns a digest with expected fields", () => {
    const heya = MockFactory.createHeya("heya-1");
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      playerHeyaId: "heya-1",
    });

    const digest = getPlayerDigest(world, "heya-1");

    expect(digest).toBeDefined();
    expect(digest?.heyaId).toBe("heya-1");
    expect(typeof digest?.runwayBand).toBe("string");
    expect(typeof digest?.rosterStrengthBand).toBe("string");
    expect(typeof digest?.moraleBand).toBe("string");
    expect(typeof digest?.rivalryClusters).toBe("number");
    expect(typeof digest?.financiallyFragileHeyas).toBe("number");
    expect(Array.isArray(digest?.recommendations)).toBe(true);
  });

  it("returns undefined when no playerHeyaId is set", () => {
    const world = MockFactory.createWorld({ playerHeyaId: undefined } as any);
    const digest = getPlayerDigest(world);
    expect(digest).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { buildWeeklyDigest, getSponsorContracts } from "../uiDigest";
import { generateWorld } from "../worldgen";
import { advanceDays } from "../dailyTick";
import { toSatisfactionBand, toMotivationBand } from "../descriptorBands";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Sponsor, SponsorRelationship } from "../sponsors";

describe("UI Digest", () => {
  it("should build a weekly digest safely when passed null or world", () => {
    // Should handle null gracefully
    const nullDigest = buildWeeklyDigest(null);
    expect(nullDigest).toBeNull();

    // Create a new world
    const world = generateWorld("test-uidigest-seed");
    if (!world.calendar) world.calendar = { year: 2025, month: 1, currentWeek: 1, currentDay: 1 };

    // Simulate a week to populate perceptions and events
    advanceDays(world, 7);

    const digest = buildWeeklyDigest(world);
    expect(digest).toBeDefined();

    expect(digest?.time.label).toBeDefined();
    expect(digest?.headline).toBeDefined();
    expect(digest?.counts.trainingEvents).toBeGreaterThanOrEqual(0);
    expect(digest?.counts.injuries).toBeGreaterThanOrEqual(0);
    expect(digest?.sections.length).toBeGreaterThanOrEqual(0);
  });

  // Removed C5 tests relying on undefined functions
});

describe("descriptorBands - toSatisfactionBand", () => {
  it("translates raw satisfaction into appropriate bands", () => {
    expect(toSatisfactionBand(10)).toBe("unhappy");
    expect(toSatisfactionBand(30)).toBe("concerned");
    expect(toSatisfactionBand(50)).toBe("content");
    expect(toSatisfactionBand(70)).toBe("happy");
    expect(toSatisfactionBand(90)).toBe("thrilled");
  });

  it("applies hysteresis when previous band is provided", () => {
    expect(toSatisfactionBand(20, "unhappy")).toBe("unhappy");
    expect(toSatisfactionBand(19, "concerned")).toBe("concerned");
  });
});


describe("descriptorBands - toMotivationBand", () => {
  it("translates raw motivation into appropriate bands", () => {
    expect(toMotivationBand(90)).toBe("driven");
    expect(toMotivationBand(70)).toBe("eager");
    expect(toMotivationBand(50)).toBe("content");
    expect(toMotivationBand(30)).toBe("distracted");
    expect(toMotivationBand(10)).toBe("apathetic");
  });

  it("applies hysteresis when previous band is provided", () => {
    // Threshold for eager is 65, so 64 without prev is content. With prev=eager, hysteresis (3) makes 64 still eager
    expect(toMotivationBand(64)).toBe("content");
    expect(toMotivationBand(64, "eager")).toBe("eager");

    // Threshold for distracted is 20, 19 without prev is apathetic. With prev=distracted, hysteresis makes 19 still distracted
    expect(toMotivationBand(19)).toBe("apathetic");
    expect(toMotivationBand(19, "distracted")).toBe("distracted");
  });
});

describe("uiDigest - getSponsorContracts", () => {
  it("returns sanitized, flattened sponsor info without exposing raw engine objects", () => {
    const mockRelationship: SponsorRelationship = {
      relId: "rel1",
      targetId: "heya1",
      targetType: "beya",
      role: "title_sponsor",
      strength: 3,
      startedAtTick: 0,
      endsAtTick: 10,
    };

    const mockSponsor: Sponsor = {
      sponsorId: "s1",
      displayName: "Test Corp",
      category: "food_beverage",
      tier: "T2",
      active: true,
      prestigeAffinity: 50,
      visibilityPreference: 50,
      riskAppetite: 50,
      loyalty: 80,
      relationships: [mockRelationship],
      createdAtTick: 0,
    };

    const mockWorld = {
      week: 5,
      playerHeyaId: "heya1",
      heyas: new Map<string, Heya>([
        ["heya1", { heyaId: "heya1", reputation: 80, koenkaiBand: "powerful" } as unknown as Heya],
      ]),
      sponsorPool: {
        sponsors: new Map<string, Sponsor>([["s1", mockSponsor]]),
        koenkais: new Map(),
      },
    } as unknown as WorldState;

    const result = getSponsorContracts(mockWorld);

    expect(result.koenkaiStrength).toBe("powerful");
    expect(result.contracts).toHaveLength(1);

    const contract = result.contracts[0];
    expect(contract.monthlyIncome).toBe(750000);
    expect(contract.satisfactionBand).toBe("thrilled");
    expect(contract.isExpiringSoon).toBe(true);
    expect(contract.expiryWeek).toBe(10);

    // Crucially, verify it's flattened and does not expose the hidden objects directly.
    expect((contract as any).sponsor).toBeUndefined();
    expect((contract as any).relationship).toBeUndefined();
    expect(contract.sponsorId).toBe("s1");
    expect(contract.displayName).toBe("Test Corp");
  });
});

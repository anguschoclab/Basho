import { describe, it, expect } from "vitest";
import { buildWeeklyDigest, getSponsorContracts } from "../uiDigest";
import { generateWorld } from "../worldgen";
import { advanceDays } from "../dailyTick";
import { toSatisfactionBand } from "../descriptorBands";
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

  describe("C5 Descriptor Band compliance", () => {
    it("getHeyaFacilitiesSummary wraps facilities data in bands", () => {
      const heya = {
        facilities: { training: 88, recovery: 45, nutrition: 10 }
      } as Heya;

      const summary = getHeyaFacilitiesSummary(heya);
      expect(summary).toBeDefined();
      expect(summary?.trainingBand).toBe("outstanding");
      expect(summary?.recoveryBand).toBe("capable");
      expect(summary?.nutritionBand).toBe("struggling");
      expect(summary?.isLow).toBe(false);
      expect(summary?.isMaxed.training).toBe(false);
    });

    it("getInjuredRosterSummary filters out numbers for severity", () => {
      const world = generateWorld("test-injuries");
      const heyaId = "heya_1"; // Just grabbing a fake heya ID
      const heya = {
        id: heyaId,
        rikishiIds: ["r_1", "r_2"],
        facilities: { recovery: 60 }
      } as unknown as Heya;

      world.heyas.set(heyaId, heya);

      world.rikishi.set("r_1", {
        id: "r_1",
        injured: true,
        injuryStatus: { severity: "serious", location: "knee", weeksRemaining: 3, weeksToHeal: 4 }
      } as any);

      world.rikishi.set("r_2", {
        id: "r_2",
        injured: true,
        injuryStatus: { severity: 25, location: "ankle", weeksRemaining: 1, weeksToHeal: 2 }
      } as any);

      const summary = getInjuredRosterSummary(world, heyaId);
      expect(summary).toHaveLength(2);

      // Sorted by severity, so serious should be first
      expect(summary[0].severityBand).toBe("serious");
      expect(summary[0].location).toBe("knee");
      expect(summary[1].severityBand).toBe("minor"); // 25 is minor
      expect(summary[1].location).toBe("ankle");
    });

    it("getSponsorshipDetails properly extracts koenkai bands", () => {
      const world = generateWorld("test-sponsors");
      const heyaId = "heya_test";
      world.heyas.set(heyaId, {
        id: heyaId,
        koenkaiBand: "powerful",
      } as unknown as Heya);

      const details = getSponsorshipDetails(world, heyaId);
      expect(details).toBeDefined();
      expect(details?.koenkaiStrengthBand).toBe("powerful");
    });
  });
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

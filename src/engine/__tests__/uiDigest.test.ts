import { describe, it, expect } from "vitest";
import { buildWeeklyDigest, getHeyaFacilitiesSummary, getInjuredRosterSummary, getSponsorshipDetails } from "../uiDigest";
import { generateWorld } from "../worldgen";
import { advanceDays } from "../dailyTick";
import type { Heya } from "../types/heya";

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

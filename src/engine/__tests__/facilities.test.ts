import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "./utils";
import {
  computeFacilitiesBand,
  updateFacilitiesBand,
  investInFacility,
  tickMonthlyFacilities,
  getUpgradeCostEstimate,
  getMonthlyMaintenanceCost,
} from "../facilities";
import type { Heya } from "../types/heya";
import { RNGRegistry } from "../core/RNGRegistry";

describe("Facilities Engine", () => {
  describe("computeFacilitiesBand", () => {
    it("returns 'minimal' when average < 25", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 20, recovery: 20, nutrition: 20 } });
      expect(computeFacilitiesBand(heya)).toBe("minimal");
    });
    it("returns 'basic' when average >= 25 and < 45", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 25, recovery: 25, nutrition: 25, housing: 20 } });
      expect(computeFacilitiesBand(heya)).toBe("basic");
    });
    it("returns 'adequate' when average >= 45 and < 65", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 45, recovery: 45, nutrition: 45, housing: 20 } });
      expect(computeFacilitiesBand(heya)).toBe("adequate");
    });
    it("returns 'excellent' when average >= 65 and < 85", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 65, recovery: 65, nutrition: 65, housing: 20 } });
      expect(computeFacilitiesBand(heya)).toBe("excellent");
    });
    it("returns 'world_class' when average >= 85", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 85, recovery: 85, nutrition: 85, housing: 20 } });
      expect(computeFacilitiesBand(heya)).toBe("world_class");
    });
  });

  describe("updateFacilitiesBand", () => {
    it("mutates heya to apply correct band", () => {
      const heya = makeMockHeya("heya-1", { facilitiesBand: "minimal", facilities: { training: 85, recovery: 85, nutrition: 85, housing: 20 } });
      updateFacilitiesBand(heya);
      expect(heya.facilitiesBand).toBe("world_class");
    });
  });

  describe("investInFacility", () => {
    it("does nothing if heya not found", () => {
      const world = makeMockWorld();
      const impact = investInFacility(world, "missing-heya", "training", 5);
      expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);
      expect(impact.events?.length ?? 0).toBe(0);
    });

    it("does nothing if requested points <= 0 or already at MAX_FACILITY", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 100, recovery: 50, nutrition: 50, housing: 50 } });
      const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

      const impact = investInFacility(world, "heya-1", "training", 5);
      expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);

      const impact2 = investInFacility(world, "heya-1", "recovery", 0);
      expect(impact2.entities?.heyaUpdates?.size ?? 0).toBe(0);
    });

    it("does nothing if heya funds are insufficient", () => {
      const heya = makeMockHeya("heya-1", { funds: 1000, facilities: { training: 30, recovery: 30, nutrition: 30, housing: 30 } });
      const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

      const impact = investInFacility(world, "heya-1", "training", 5);
      expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);
    });

    it("upgrades facility and deducts correct funds", () => {
      // cost for level 30->35 is 5 * 200_000 = 1_000_000
      const heya = makeMockHeya("heya-1", { funds: 5_000_000, facilities: { training: 30, recovery: 30, nutrition: 30, housing: 30 } });
      const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

      const impact = investInFacility(world, "heya-1", "training", 5);

      expect(impact.entities?.heyaUpdates?.has("heya-1")).toBe(true);
      const update = impact.entities!.heyaUpdates!.get("heya-1")!;
      expect(update.funds).toBe(4_000_000);
      expect(update.facilities?.training).toBe(35);

      expect(impact.events?.length).toBe(1);
      expect(impact.events![0].type).toBe("FACILITY_UPGRADED");
    });
  });

  describe("getUpgradeCostEstimate", () => {
    it("calculates cost accurately across tier boundaries", () => {
      const heya = makeMockHeya("heya-1", { facilities: { training: 38, recovery: 50, nutrition: 50, housing: 50 } });
      // 38 -> 40: 2 * 200,000 = 400,000
      // 40 -> 43: 3 * 300,000 = 900,000
      // Total: 1,300,000
      const cost = getUpgradeCostEstimate(heya, "training", 5);
      expect(cost).toBe(1_300_000);
    });

    it("handles max facility bounds correctly", () => {
       const heya = makeMockHeya("heya-1", { facilities: { training: 98, recovery: 50, nutrition: 50, housing: 50 } });
       // Should only estimate for 2 points, not 5
       const cost = getUpgradeCostEstimate(heya, "training", 5);
       // 98 -> 100: 2 * (200000 * 4) = 1,600,000
       expect(cost).toBe(1_600_000);
    });
  });

  describe("getMonthlyMaintenanceCost", () => {
    it("returns correct sum for all axes", () => {
      // 50 * 3000 + 40 * 3000 + 30 * 3000 = 150000 + 120000 + 90000 = 360000
      const heya = makeMockHeya("heya-1", { facilities: { training: 50, recovery: 40, nutrition: 30, housing: 20 } });
      expect(getMonthlyMaintenanceCost(heya)).toBe(360000);
    });
  });

  describe("tickMonthlyFacilities", () => {
    it("pays maintenance if affordable (no decay)", () => {
      const heya = makeMockHeya("heya-1", { funds: 1_000_000, facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 } });
      // Maintenance is 50 * 3000 * 3 = 450,000
      const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

      const impact = tickMonthlyFacilities(world);

      expect(impact.entities?.heyaUpdates?.has("heya-1")).toBe(true);
      const update = impact.entities!.heyaUpdates!.get("heya-1")!;
      expect(update.funds).toBe(1_000_000 - 450_000);
      expect(update.facilities).toBeUndefined(); // no decay, so no facility update
    });

    it("decays facilities if maintenance cannot be paid", () => {
      const heya = makeMockHeya("heya-1", { funds: 100_000, facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 } });
      const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

      const impact = tickMonthlyFacilities(world);

      expect(impact.entities?.heyaUpdates?.has("heya-1")).toBe(true);
      const update = impact.entities!.heyaUpdates!.get("heya-1")!;
      expect(update.funds).toBeUndefined(); // funds not touched
      expect(update.facilities?.training).toBe(48); // decayed by 2
      expect(update.facilities?.recovery).toBe(48);
      expect(update.facilities?.nutrition).toBe(48);
    });

    it("respects MIN_FACILITY when decaying", () => {
       const heya = makeMockHeya("heya-1", { funds: 0, facilities: { training: 6, recovery: 5, nutrition: 4, housing: 50 } });
       const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });
       const impact = tickMonthlyFacilities(world);
       const update = impact.entities!.heyaUpdates!.get("heya-1")!;

       expect(update.facilities?.training).toBe(5);
       expect(update.facilities?.recovery).toBe(5);
       expect(update.facilities?.nutrition).toBe(5); // even if already < 5, clamps to min
    });

    it("allows NPC oyakata to auto-invest if extremely rich", () => {
      // NPC logic: Needs > 6 months runway
      // Runway: monthlyBurn = 0 (no rikishi) + 50 * 9000 = 450,000
      // 6 months = 2,700,000. So 5,000,000 is plenty.
      const oyakata = { id: "oyakata-1", heyaId: "heya-1", traits: { compassion: 50, ambition: 50 } } as any;
      const heya = makeMockHeya("heya-1", { oyakataId: "oyakata-1", funds: 5_000_000, facilities: { training: 30, recovery: 30, nutrition: 30, housing: 30 } });

      const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]), oyakata: new Map([["oyakata-1", oyakata]]) });
      // heya is NOT playerHeyaId, so it can auto-invest
      world.playerHeyaId = "heya-player";

      const impact = tickMonthlyFacilities(world);

      expect(impact.entities?.heyaUpdates?.has("heya-1")).toBe(true);
      const update = impact.entities!.heyaUpdates!.get("heya-1")!;
      // First, it paid maintenance: 30 * 3000 * 3 = 270,000
      // Then it auto-invests: min level is 30 (<40), so 5 points.
      // Priority axis is training (default).
      // Cost: 5 * 200,000 = 1,000,000
      // Total funds spent: 1,270,000
      expect(update.funds).toBe(5_000_000 - 1_000_000);
      expect(update.facilities?.training).toBe(35);
    });
  });
});

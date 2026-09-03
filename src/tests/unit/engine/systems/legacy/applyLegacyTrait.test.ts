/**
 * applyLegacyTrait.test.ts
 * ========================
 * Tests for LegacyService.applyLegacyTrait — the function that applies
 * bloodline trait bonuses to a candidate's stats.
 *
 * This test was written BEFORE the Mason type-tightening PRs (#886, #911)
 * to establish a behavior baseline. It must pass on both the pre- and
 * post-refactor code, proving the type tightening is behavior-preserving.
 */
import { describe, it, expect } from "vitest";
import { LegacyService } from "@/engine/systems/legacy/LegacyService";
import type { RikishiStats } from "@/engine/types/rikishi";
import type { BloodlineTrait } from "@/engine/types/dynasty";

function makeStats(overrides: Partial<RikishiStats> = {}): RikishiStats {
  return {
    power: 50,
    technique: 50,
    speed: 50,
    weight: 100,
    stamina: 50,
    mental: 50,
    adaptability: 50,
    balance: 50,
    aggression: 50,
    experience: 50,
    ...overrides,
  };
}

function makeTrait(overrides: Partial<BloodlineTrait> = {}): BloodlineTrait {
  return {
    traitId: "bl_test",
    label: "Test Trait",
    description: "Test trait for applyLegacyTrait",
    statFloorBonus: { power: 6 },
    ceilingBonus: 5,
    ancestorShikona: "TestAncestor",
    registeredYear: 2020,
    ...overrides,
  };
}

describe("LegacyService.applyLegacyTrait", () => {
  describe("floor bonus application", () => {
    it("applies floor bonus and ceiling bonus to a valid numeric stat", () => {
      const stats = makeStats({ power: 50 });
      const trait = makeTrait({ statFloorBonus: { power: 6 }, ceilingBonus: 5 });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      // Floor: 50 + 6 = 56. Ceiling: power is peak stat (only key), so 56 + 5 = 61
      expect(result.power).toBe(61);
    });

    it("applies floor bonuses to multiple valid stats with ceiling on peak", () => {
      const stats = makeStats({ power: 40, technique: 35 });
      const trait = makeTrait({ statFloorBonus: { power: 6, technique: 10 }, ceilingBonus: 5 });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      // Floor: power = 46, technique = 45
      // Ceiling: findPeakStat picks technique (10 > 6 in statFloorBonus), so technique = 45 + 5 = 50
      expect(result.power).toBe(46);
      expect(result.technique).toBe(50);
    });

    it("skips floor bonus for invalid stat keys but ceiling still applies to peak valid stat", () => {
      const stats = makeStats({ power: 50 });
      const trait = makeTrait({
        statFloorBonus: { invalidKey: 80, power: 6 } as unknown as BloodlineTrait["statFloorBonus"],
      });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      // Floor: invalidKey skipped, power = 50 + 6 = 56
      // Ceiling: findPeakStat only checks valid keys, power (6) is peak, so 56 + 5 = 61
      expect(result.power).toBe(61);
      expect((result as unknown as Record<string, unknown>).invalidKey).toBeUndefined();
    });

    it("clamps floor bonus results to 0-99 range", () => {
      const stats = makeStats({ power: 95 });
      const trait = makeTrait({ statFloorBonus: { power: 10 } });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      expect(result.power).toBe(99);
    });

    it("clamps floor bonus to 0 minimum", () => {
      const stats = makeStats({ power: 5 });
      const trait = makeTrait({ statFloorBonus: { power: -20 } });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      expect(result.power).toBe(0);
    });
  });

  describe("ceiling bonus application", () => {
    it("applies ceiling bonus to the peak stat from statFloorBonus", () => {
      const stats = makeStats({ power: 50, technique: 50 });
      const trait = makeTrait({
        statFloorBonus: { power: 6, technique: 10 },
        ceilingBonus: 5,
      });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      // peakStat is the highest in statFloorBonus: technique (10) > power (6)
      // So ceiling bonus goes to technique: 50 + 10 (floor) + 5 (ceiling) = 65
      expect(result.technique).toBe(65);
    });

    it("clamps ceiling bonus to 99", () => {
      const stats = makeStats({ technique: 90 });
      const trait = makeTrait({
        statFloorBonus: { technique: 6 },
        ceilingBonus: 10,
      });
      const result = LegacyService.applyLegacyTrait(stats, trait);
      expect(result.technique).toBe(99);
    });
  });

  describe("immutability", () => {
    it("does not mutate the input candidateStats", () => {
      const stats = makeStats({ power: 50, technique: 50 });
      const original = { ...stats };
      const trait = makeTrait({ statFloorBonus: { power: 6, technique: 10 } });
      LegacyService.applyLegacyTrait(stats, trait);
      expect(stats).toEqual(original);
    });

    it("returns a new object (not the same reference)", () => {
      const stats = makeStats();
      const trait = makeTrait();
      const result = LegacyService.applyLegacyTrait(stats, trait);
      expect(result).not.toBe(stats);
    });
  });

  describe("return type", () => {
    it("returns a RikishiStats object with all numeric fields", () => {
      const stats = makeStats();
      const trait = makeTrait();
      const result = LegacyService.applyLegacyTrait(stats, trait);
      expect(typeof result.power).toBe("number");
      expect(typeof result.technique).toBe("number");
      expect(typeof result.speed).toBe("number");
      expect(typeof result.weight).toBe("number");
      expect(typeof result.stamina).toBe("number");
      expect(typeof result.mental).toBe("number");
      expect(typeof result.adaptability).toBe("number");
      expect(typeof result.balance).toBe("number");
      expect(typeof result.aggression).toBe("number");
      expect(typeof result.experience).toBe("number");
    });
  });
});

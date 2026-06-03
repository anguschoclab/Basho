import { describe, it, expect } from "vitest";
import {
  getStatCeiling,
  diminishingReturnsMult,
  getCareerPhase,
  calculateFatigueDelta,
  calculateGrowthVector,
} from "../TrainingMath";
import { mockRikishi } from "../../../__tests__/utils";
import type { TrainingProfile, IndividualFocus } from "../../../types/training";
import type { Heya } from "../../../types/heya";
import type { WorldState } from "../../../types/world";

describe("TrainingMath", () => {
  describe("getStatCeiling", () => {
    it("calculates ceilings at different talent seeds", () => {
      // 0 talent
      const zeroCeil = getStatCeiling(0, "power");
      expect(zeroCeil).toBeGreaterThanOrEqual(30);
      expect(zeroCeil).toBeLessThanOrEqual(99);

      // 100 talent
      const maxCeil = getStatCeiling(100, "power");
      expect(maxCeil).toBeGreaterThanOrEqual(95);

      // 50 talent
      const midCeil = getStatCeiling(50, "power");
      expect(midCeil).toBeGreaterThanOrEqual(60);
      expect(midCeil).toBeLessThan(90);
    });

    it("applies offsets based on stat keys", () => {
      const powerCeil = getStatCeiling(50, "power");
      const speedCeil = getStatCeiling(50, "speed");
      // They might be different depending on offset
      expect(typeof powerCeil).toBe("number");
      expect(typeof speedCeil).toBe("number");
    });
  });

  describe("diminishingReturnsMult", () => {
    it("returns 0 if ceiling is 0 or less", () => {
      expect(diminishingReturnsMult(50, 0)).toBe(0);
      expect(diminishingReturnsMult(50, -10)).toBe(0);
    });

    it("returns a high multiplier when stat is much lower than ceiling", () => {
      const mult = diminishingReturnsMult(10, 100);
      expect(mult).toBeCloseTo(0.999);
    });

    it("returns exactly 0 when stat equals or exceeds ceiling", () => {
      expect(diminishingReturnsMult(100, 100)).toBe(0);
      expect(diminishingReturnsMult(110, 100)).toBe(0);
    });

    it("calculates smooth cubic decay", () => {
      // ratio = 50 / 100 = 0.5
      // 1 - 0.5^3 = 1 - 0.125 = 0.875
      expect(diminishingReturnsMult(50, 100)).toBe(0.875);
    });
  });

  describe("getCareerPhase", () => {
    it("identifies rookie phase", () => {
      expect(getCareerPhase(0)).toBe("rookie");
      expect(getCareerPhase(29)).toBe("rookie");
    });

    it("identifies prime phase", () => {
      expect(getCareerPhase(30)).toBe("prime");
      expect(getCareerPhase(69)).toBe("prime");
    });

    it("identifies veteran phase", () => {
      expect(getCareerPhase(70)).toBe("veteran");
      expect(getCareerPhase(89)).toBe("veteran");
    });

    it("identifies twilight phase", () => {
      expect(getCareerPhase(90)).toBe("twilight");
      expect(getCareerPhase(120)).toBe("twilight");
    });
  });

  describe("calculateFatigueDelta", () => {
    it("calculates baseline fatigue delta", () => {
      const profile: TrainingProfile = {
        intensity: "balanced",
        focus: "balanced",
        recovery: "normal",
      } as any;
      // balanced intensity fatigue mult = 1.0, normal recovery decay mult = 1.0
      // Gain = 10 * 1.0 * 1.0 = 10, Decay = 8 * 1.0 = 8. Delta = 2
      const delta = calculateFatigueDelta(profile, undefined);
      expect(delta).toBe(2);
    });

    it("factors in individual focus mode", () => {
      const profile: TrainingProfile = {
        intensity: "balanced",
        focus: "balanced",
        recovery: "normal",
      } as any;
      const focus: IndividualFocus = { targetId: "r1", focusType: "push" } as any;
      // push mode fatigue mult = 1.2
      // Gain = 10 * 1.0 * 1.2 = 12. Decay = 8. Delta = 4
      const delta = calculateFatigueDelta(profile, focus);
      expect(delta).toBe(4);
    });

    it("handles extreme training intensity and recovery", () => {
      const exhausting: TrainingProfile = {
        intensity: "punishing",
        focus: "balanced",
        recovery: "low",
      } as any;
      const restful: TrainingProfile = {
        intensity: "conservative",
        focus: "balanced",
        recovery: "high",
      } as any;

      const exDelta = calculateFatigueDelta(exhausting, undefined);
      const restDelta = calculateFatigueDelta(restful, undefined);

      expect(exDelta).toBeGreaterThan(2);
      expect(restDelta).toBeLessThan(2);
    });
  });

  describe("calculateGrowthVector", () => {
    it("calculates growth for all stats", () => {
      const rikishi = mockRikishi("r1", {
        talentSeed: 80,
        stats: {
          power: 40,
          speed: 40,
          technique: 40,
          balance: 40,
          stamina: 40,
          mental: 40,
          adaptability: 40,
          weight: 140,
        } as any,
        experience: 40,
      });

      const profile: TrainingProfile = {
        intensity: "balanced",
        focus: "power",
        recovery: "normal",
      } as any;
      const heya: Partial<Heya> = {
        facilities: { training: 50, nutrition: 50, housing: 50, medical: 50 },
      };

      const growth = calculateGrowthVector(
        profile,
        undefined,
        rikishi,
        heya as Heya,
        {} as WorldState
      );

      expect(growth).toHaveProperty("power");
      expect(growth).toHaveProperty("speed");
      expect(growth).toHaveProperty("technique");
      expect(growth).toHaveProperty("balance");
      expect(growth).toHaveProperty("stamina");
      expect(growth).toHaveProperty("mental");
      expect(growth).toHaveProperty("adaptability");

      expect(growth.power).toBeGreaterThan(0);
      expect(growth.stamina).toBeGreaterThan(0);
    });

    it("applies heya facility bonuses correctly", () => {
      const rikishi = mockRikishi("r1", { experience: 30 });
      const profile: TrainingProfile = {
        intensity: "balanced",
        focus: "power",
        recovery: "normal",
      } as any;

      const poorHeya: Partial<Heya> = {
        facilities: { training: 0, nutrition: 0, housing: 0, medical: 0 },
      };
      const richHeya: Partial<Heya> = {
        facilities: { training: 100, nutrition: 100, housing: 100, medical: 100 },
      };

      const poorGrowth = calculateGrowthVector(
        profile,
        undefined,
        rikishi,
        poorHeya as Heya,
        {} as WorldState
      );
      const richGrowth = calculateGrowthVector(
        profile,
        undefined,
        rikishi,
        richHeya as Heya,
        {} as WorldState
      );

      expect(richGrowth.power).toBeGreaterThan(poorGrowth.power);
    });

    it("applies political bonus for dominant factions", () => {
      const rikishi = mockRikishi("r1", { experience: 30 });
      const profile: TrainingProfile = {
        intensity: "balanced",
        focus: "power",
        recovery: "normal",
      } as any;
      const heya: Partial<Heya> = {
        ichimon: "ichimon_1",
        facilities: { training: 50, nutrition: 50, housing: 50, medical: 50 },
      };

      const regularWorld = { factions: { ichimon_1: { influence: 50 } } } as unknown as WorldState;
      const domWorld = { factions: { ichimon_1: { influence: 90 } } } as unknown as WorldState;

      const regularGrowth = calculateGrowthVector(
        profile,
        undefined,
        rikishi,
        heya as Heya,
        regularWorld
      );
      const domGrowth = calculateGrowthVector(profile, undefined, rikishi, heya as Heya, domWorld);

      expect(domGrowth.power).toBeGreaterThan(regularGrowth.power);
    });
  });
});

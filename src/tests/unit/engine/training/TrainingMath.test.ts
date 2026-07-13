import { describe, it, expect } from "vitest";
import {
  getStatCeiling,
  getEffectiveCeiling,
  diminishingReturnsMult,
  normalizeTrainingProfile,
  calculateFatigueDelta,
  getCareerPhase,
} from "@/engine/systems/training/TrainingMath";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { TrainingProfile } from "@/engine/types/training";
import {
  MAX_STAT_CEILING,
  MIN_STAT_CEILING,
  ROOKIE_EXPERIENCE_THRESHOLD,
  PRIME_EXPERIENCE_THRESHOLD,
  VETERAN_EXPERIENCE_THRESHOLD,
} from "@/constants/engine/training";

describe("TrainingMath", () => {
  describe("getStatCeiling", () => {
    it("should calculate base ceiling correctly", () => {
      // test middle range
      const ceiling = getStatCeiling(50, "power");
      expect(ceiling).toBeGreaterThanOrEqual(MIN_STAT_CEILING);
      expect(ceiling).toBeLessThanOrEqual(MAX_STAT_CEILING);
    });

    it("should cap at max", () => {
      const ceiling = getStatCeiling(200, "power");
      expect(ceiling).toBeLessThanOrEqual(MAX_STAT_CEILING);
    });

    it("should floor at min", () => {
      const ceiling = getStatCeiling(-100, "power");
      expect(ceiling).toBeGreaterThanOrEqual(MIN_STAT_CEILING);
    });
  });

  describe("getEffectiveCeiling", () => {
    it("should use PA from potential if available", () => {
      const r = MockFactory.createRikishi("r1", {
        potential: {
          stats: { power: 80 } as any,
          ceilingFraction: 0.8,
          developmentSpeed: 1,
          peakAgeOffset: 0,
        },
      });

      const world = MockFactory.createWorld({ year: 2025 });
      r.birthYear = 2005; // Age 20

      const ceiling = getEffectiveCeiling(r, "power", world);
      // It should be related to 80 * 0.8 = 64, modified by maturity factor
      expect(ceiling).toBeGreaterThan(0);
    });

    it("should fall back to getStatCeiling if potential not defined", () => {
      const r = MockFactory.createRikishi("r1", {
        talentSeed: 50,
      });
      // Clear potential
      delete r.potential;

      const world = MockFactory.createWorld({ year: 2025 });
      r.birthYear = 2000;

      const ceiling = getEffectiveCeiling(r, "power", world);
      expect(ceiling).toBeGreaterThan(0);
    });
  });

  describe("normalizeTrainingProfile", () => {
    it("should provide defaults for undefined fields", () => {
      const p = normalizeTrainingProfile({} as TrainingProfile);
      expect(p.intensity).toBe("balanced");
      expect(p.focus).toBe("neutral");
      expect(p.recovery).toBe("normal");
      expect(p.styleBias).toBe("neutral");
    });

    it("should preserve valid fields", () => {
      const p = normalizeTrainingProfile({
        intensity: "punishing",
        focus: "power",
        recovery: "low",
        styleBias: "oshi",
      });
      expect(p.intensity).toBe("punishing");
      expect(p.focus).toBe("power");
      expect(p.recovery).toBe("low");
      expect(p.styleBias).toBe("oshi");
    });

    it("should overwrite invalid fields with safe defaults", () => {
      const p = normalizeTrainingProfile({
        intensity: "fake",
        focus: "fake",
        recovery: "fake",
        styleBias: "fake",
      } as any);
      expect(p.intensity).toBe("balanced");
      expect(p.focus).toBe("neutral");
      expect(p.recovery).toBe("normal");
      expect(p.styleBias).toBe("neutral");
    });
  });

  describe("calculateFatigueDelta", () => {
    it("should calculate correctly for high intensity / low recovery", () => {
      const delta = calculateFatigueDelta(
        { intensity: "punishing", recovery: "low", focus: "neutral", styleBias: "neutral" },
        undefined
      );
      expect(delta).toBe(8);
    });

    it("should calculate correctly for low intensity / high recovery", () => {
      const delta = calculateFatigueDelta(
        { intensity: "conservative", recovery: "high", focus: "neutral", styleBias: "neutral" },
        undefined
      );
      expect(delta).toBe(-3);
    });

    it("should calculate correctly with a focus multiplier", () => {
      const delta = calculateFatigueDelta(
        { intensity: "balanced", recovery: "normal", focus: "neutral", styleBias: "neutral" },
        { rikishiId: "r1", focusType: "push" }
      );
      expect(delta).toBe(4);
    });
  });

  describe("getCareerPhase", () => {
    it("should return correct phase for given experience values", () => {
      expect(getCareerPhase(0)).toBe("rookie");
      expect(getCareerPhase(ROOKIE_EXPERIENCE_THRESHOLD - 1)).toBe("rookie");
      expect(getCareerPhase(ROOKIE_EXPERIENCE_THRESHOLD)).toBe("prime");
      expect(getCareerPhase(PRIME_EXPERIENCE_THRESHOLD - 1)).toBe("prime");
      expect(getCareerPhase(PRIME_EXPERIENCE_THRESHOLD)).toBe("veteran");
      expect(getCareerPhase(VETERAN_EXPERIENCE_THRESHOLD - 1)).toBe("veteran");
      expect(getCareerPhase(VETERAN_EXPERIENCE_THRESHOLD)).toBe("twilight");
      expect(getCareerPhase(200)).toBe("twilight");
    });
  });

  describe("diminishingReturnsMult", () => {
    it("should return 1 when currentStat is 0", () => {
      expect(diminishingReturnsMult(0, 100)).toBe(1);
    });

    it("should return 0 when currentStat >= ceiling", () => {
      expect(diminishingReturnsMult(100, 100)).toBe(0);
      expect(diminishingReturnsMult(120, 100)).toBe(0);
    });

    it("should return quadratic multiplier in between", () => {
      // ratio = 50 / 100 = 0.5
      // multiplier = 1 - (0.5 * 0.5) = 1 - 0.25 = 0.75
      expect(diminishingReturnsMult(50, 100)).toBe(0.75);
    });

    it("should return 0 when ceiling is <= 0", () => {
      expect(diminishingReturnsMult(50, 0)).toBe(0);
      expect(diminishingReturnsMult(50, -10)).toBe(0);
    });
  });
});

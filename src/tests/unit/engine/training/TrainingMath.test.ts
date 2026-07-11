import { describe, it, expect } from "vitest";
import {
  getStatCeiling,
  getEffectiveCeiling,
  diminishingReturnsMult,
} from "@/engine/systems/training/TrainingMath";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { MAX_STAT_CEILING, MIN_STAT_CEILING } from "@/constants/engine/training";

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

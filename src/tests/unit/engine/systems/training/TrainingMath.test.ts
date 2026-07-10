import { describe, it, expect } from "vitest";
import {
  getStatCeiling,
  getEffectiveCeiling,
  diminishingReturnsMult,
  normalizeTrainingProfile
} from "../../../../../engine/systems/training/TrainingMath";
import { MockFactory } from "../../../../helpers/utils/MockFactory";

describe("TrainingMath - Deterministic Formulas", () => {
  describe("getStatCeiling", () => {
    it("returns higher ceilings for higher talent seeds", () => {
      expect(getStatCeiling(95, "strength")).toBeGreaterThan(getStatCeiling(80, "strength"));
      expect(getStatCeiling(80, "strength")).toBeGreaterThan(getStatCeiling(50, "strength"));
    });

    it("clamps values between MIN_STAT_CEILING and MAX_STAT_CEILING", () => {
      expect(getStatCeiling(-100, "strength")).toBeGreaterThanOrEqual(10);
      expect(getStatCeiling(200, "strength")).toBeLessThanOrEqual(100);
    });
  });

  describe("getEffectiveCeiling", () => {
    it("returns a deterministic ceiling for a basic Rikishi", () => {
      const rikishi = MockFactory.createRikishi({ talentSeed: 50 });
      const c = getEffectiveCeiling(rikishi, "strength");
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThanOrEqual(100);
    });

    it("uses potential object if available", () => {
      const rikishi = MockFactory.createRikishi({
        potential: {
          stats: { strength: 80, stamina: 70, technique: 60, spirit: 50 },
          ceilingFraction: 1.0,
          developmentSpeed: 1.0,
          peakAgeOffset: 0
        }
      });
      const str = getEffectiveCeiling(rikishi, "strength");
      expect(str).toBeGreaterThan(0);
    });
  });

  describe("diminishingReturnsMult", () => {
    it("returns 1 for stat=0 and 0 for stat >= ceiling", () => {
      expect(diminishingReturnsMult(0, 100)).toBe(1);
      expect(diminishingReturnsMult(100, 100)).toBe(0);
    });

    it("returns correct quadratic curve (1 - (stat/ceiling)^2)", () => {
      expect(diminishingReturnsMult(50, 100)).toBeCloseTo(0.75); // 1 - (0.5^2)
      expect(diminishingReturnsMult(25, 100)).toBeCloseTo(0.9375); // 1 - (0.25^2)
    });
  });

  describe("normalizeTrainingProfile", () => {
    it("provides valid defaults for partial or empty profiles", () => {
      const p = normalizeTrainingProfile({} as any);
      expect(p.intensity).toBe("balanced");
      expect(p.focus).toBe("neutral");
    });

    it("preserves valid fields and falls back for invalid fields", () => {
      const p1 = normalizeTrainingProfile({ intensity: "intensive", focus: "technique" } as any);
      expect(p1.intensity).toBe("intensive");

      const p2 = normalizeTrainingProfile({ intensity: "invalid" } as any);
      expect(p2.intensity).toBe("balanced");
    });
  });
});

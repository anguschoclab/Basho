import { describe, it, expect } from "vitest";
import {
  getStatCeiling,
  getEffectiveCeiling,
  diminishingReturnsMult,
  normalizeTrainingProfile,
  calculateFatigueDelta,
  getCareerPhase,
  calculateGains,
  calculateGrowthVector,
  calculateGrowthWithModifiers,
  extractTrainingModifiers,
  computeDisplayTrainingMultiplier,
} from "@/engine/systems/training/TrainingMath";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { TrainingProfile, IndividualFocus } from "@/engine/types/training";
import type { ActiveModifiers } from "@/engine/types/world";
import {
  MAX_STAT_CEILING,
  MIN_STAT_CEILING,
  ROOKIE_EXPERIENCE_THRESHOLD,
  PRIME_EXPERIENCE_THRESHOLD,
  VETERAN_EXPERIENCE_THRESHOLD,
} from "@/constants/engine/training";
import { MORALE_BOOST_MULTIPLIER, FINANCIAL_PENALTY_MULTIPLIER } from "@/constants/engine/multipliers";

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

  describe("calculateGains — proportional scaling with raw components", () => {
    const baseProfile: TrainingProfile = {
      intensity: "balanced",
      focus: "neutral",
      styleBias: "neutral",
      recovery: "normal",
    };
    const currentYear = 2025;

    function makeAM(overrides: Partial<ActiveModifiers> = {}): ActiveModifiers {
      return {
        facilityGrowthMult: 1.0,
        nutritionMult: 1.0,
        degeikoMult: 1.0,
        styleDriftMults: {
          power: 1.0,
          speed: 1.0,
          technique: 1.0,
          balance: 1.0,
          stamina: 1.0,
          mental: 1.0,
        },
        recoveryMultiplier: 1.0,
        financialPenalty: false,
        moraleBoost: false,
        ...overrides,
      };
    }

    it("with neutral modifiers produces baseline gains", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const gains = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const totalGains = Object.values(gains).reduce((a, b) => a + b, 0);
      expect(totalGains).toBeGreaterThan(0);
    });

    it("with facilityGrowthMult 1.2 produces higher gains than 1.0", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const baseline = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const boosted = calculateGains(
        r,
        makeAM({ facilityGrowthMult: 1.2 }),
        baseProfile,
        undefined,
        currentYear
      );
      for (const key of Object.keys(baseline) as Array<keyof typeof baseline>) {
        if (baseline[key] !== 0) {
          expect(boosted[key]).toBeGreaterThan(baseline[key]);
        }
      }
    });

    it("with moraleBoost true produces 1.15x baseline gains", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const baseline = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const boosted = calculateGains(
        r,
        makeAM({ moraleBoost: true }),
        baseProfile,
        undefined,
        currentYear
      );
      for (const key of Object.keys(baseline) as Array<keyof typeof baseline>) {
        if (baseline[key] !== 0) {
          expect(boosted[key]).toBeCloseTo(baseline[key] * (1 + MORALE_BOOST_MULTIPLIER), 5);
        }
      }
    });

    it("with financialPenalty true produces 0.5x baseline gains", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const baseline = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const halved = calculateGains(
        r,
        makeAM({ financialPenalty: true }),
        baseProfile,
        undefined,
        currentYear
      );
      for (const key of Object.keys(baseline) as Array<keyof typeof baseline>) {
        if (baseline[key] !== 0) {
          expect(halved[key]).toBeCloseTo(baseline[key] * FINANCIAL_PENALTY_MULTIPLIER, 5);
        }
      }
    });

    it("with both moraleBoost and financialPenalty produces 0.575x baseline gains", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const baseline = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const both = calculateGains(
        r,
        makeAM({ moraleBoost: true, financialPenalty: true }),
        baseProfile,
        undefined,
        currentYear
      );
      const expectedMult = (1 + MORALE_BOOST_MULTIPLIER) * FINANCIAL_PENALTY_MULTIPLIER;
      for (const key of Object.keys(baseline) as Array<keyof typeof baseline>) {
        if (baseline[key] !== 0) {
          expect(both[key]).toBeCloseTo(baseline[key] * expectedMult, 5);
        }
      }
    });

    it("with degeikoMult 1.1 produces higher gains than 1.0", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const baseline = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const boosted = calculateGains(
        r,
        makeAM({ degeikoMult: 1.1 }),
        baseProfile,
        undefined,
        currentYear
      );
      for (const key of Object.keys(baseline) as Array<keyof typeof baseline>) {
        if (baseline[key] !== 0) {
          expect(boosted[key]).toBeGreaterThan(baseline[key]);
        }
      }
    });

    it("with styleDriftMults.power=1.1 produces higher power gains", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const baseline = calculateGains(r, makeAM(), baseProfile, undefined, currentYear);
      const drifted = calculateGains(
        r,
        makeAM({
          styleDriftMults: {
            power: 1.1,
            speed: 1.0,
            technique: 1.0,
            balance: 1.0,
            stamina: 1.0,
            mental: 1.0,
          },
        }),
        baseProfile,
        undefined,
        currentYear
      );
      expect(drifted.power).toBeGreaterThan(baseline.power);
    });
  });

  describe("computeDisplayTrainingMultiplier", () => {
    function makeAM(overrides: Partial<ActiveModifiers> = {}): ActiveModifiers {
      return {
        facilityGrowthMult: 1.0,
        nutritionMult: 1.0,
        degeikoMult: 1.0,
        styleDriftMults: {
          power: 1.0,
          speed: 1.0,
          technique: 1.0,
          balance: 1.0,
          stamina: 1.0,
          mental: 1.0,
        },
        recoveryMultiplier: 1.0,
        financialPenalty: false,
        moraleBoost: false,
        ...overrides,
      };
    }

    it("returns facilityGrowthMult when no morale/penalty", () => {
      expect(computeDisplayTrainingMultiplier(makeAM({ facilityGrowthMult: 1.025 }))).toBeCloseTo(
        1.025
      );
    });

    it("adds MORALE_BOOST_MULTIPLIER when moraleBoost is true", () => {
      const am = makeAM({ facilityGrowthMult: 1.025, moraleBoost: true });
      expect(computeDisplayTrainingMultiplier(am)).toBeCloseTo(1.025 + MORALE_BOOST_MULTIPLIER);
    });

    it("applies FINANCIAL_PENALTY_MULTIPLIER when financialPenalty is true", () => {
      const am = makeAM({ facilityGrowthMult: 1.025, financialPenalty: true });
      expect(computeDisplayTrainingMultiplier(am)).toBeCloseTo(1.025 * FINANCIAL_PENALTY_MULTIPLIER);
    });

    it("applies both morale and penalty", () => {
      const am = makeAM({
        facilityGrowthMult: 1.025,
        moraleBoost: true,
        financialPenalty: true,
      });
      expect(computeDisplayTrainingMultiplier(am)).toBeCloseTo(
        (1.025 + MORALE_BOOST_MULTIPLIER) * FINANCIAL_PENALTY_MULTIPLIER
      );
    });
  });

  describe("calculateGrowthVector — facility, rivalry, and phase effects", () => {
    const baseProfile: TrainingProfile = {
      intensity: "balanced",
      focus: "neutral",
      styleBias: "neutral",
      recovery: "normal",
    };

    it("with facilities.training 100 produces higher growth than facilities.training 0", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const heyaLow = MockFactory.createHeya("h1", {
        facilities: { training: 0, recovery: 50, nutrition: 50 } as any,
      });
      const heyaHigh = MockFactory.createHeya("h2", {
        facilities: { training: 100, recovery: 50, nutrition: 50 } as any,
      });

      const lowGrowth = calculateGrowthVector(baseProfile, undefined, r, heyaLow);
      const highGrowth = calculateGrowthVector(baseProfile, undefined, r, heyaHigh);

      const lowTotal = Object.values(lowGrowth).reduce((a, b) => a + b, 0);
      const highTotal = Object.values(highGrowth).reduce((a, b) => a + b, 0);
      expect(highTotal).toBeGreaterThan(lowTotal);
    });

    it("with rivalry heat >= 80 produces lower growth than no rivalry", () => {
      const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
      const heya = MockFactory.createHeya("h1", {
        facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      });

      const worldNoRivalry = MockFactory.createWorld();
      const worldWithRivalry = MockFactory.createWorld({
        rivalriesState: {
          pairs: {},
          heyaRivalryPairs: {
            h1_h2: { heyaAId: "h1", heyaBId: "h2", heat: 90 },
          },
        } as any,
      });

      const noRivalryGrowth = calculateGrowthVector(
        baseProfile,
        undefined,
        r,
        heya,
        worldNoRivalry
      );
      const rivalryGrowth = calculateGrowthVector(
        baseProfile,
        undefined,
        r,
        heya,
        worldWithRivalry
      );

      const noRivalryTotal = Object.values(noRivalryGrowth).reduce((a, b) => a + b, 0);
      const rivalryTotal = Object.values(rivalryGrowth).reduce((a, b) => a + b, 0);
      expect(rivalryTotal).toBeLessThan(noRivalryTotal);
    });

    it("with experience 0 (rookie) produces different growth than experience 200 (twilight)", () => {
      const rookie = MockFactory.createRikishi("r1", { stats: { experience: 0 } as any });
      const twilight = MockFactory.createRikishi("r2", { stats: { experience: 200 } as any });

      const rookieGrowth = calculateGrowthVector(baseProfile, undefined, rookie);
      const twilightGrowth = calculateGrowthVector(baseProfile, undefined, twilight);

      const rookieTotal = Object.values(rookieGrowth).reduce((a, b) => a + b, 0);
      const twilightTotal = Object.values(twilightGrowth).reduce((a, b) => a + b, 0);
      expect(rookieTotal).not.toEqual(twilightTotal);
    });
  });
});

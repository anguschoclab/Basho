import { describe, it, expect, beforeEach } from "bun:test";
import { MockFactory } from "../../../../helpers/utils/MockFactory";
import {
  getSeverityWeight,
  computeInjuryPressure,
  calculateWeeklyWelfareDelta,
} from "@/engine/systems/welfare/WelfareCalculations";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { WelfareState } from "@/engine/types/economy";
import {
  INJURY_PRESSURE_SERIOUS,
  INJURY_PRESSURE_MODERATE,
  INJURY_PRESSURE_MINOR,
  WELFARE_SERIOUS_INJURY_BONUS,
  WELFARE_AUSTERITY_DIET_BONUS,
  WELFARE_PREMIUM_DIET_REDUCTION,
  WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER,
  WELFARE_PUNISHING_INTENSITY_BONUS,
  WELFARE_INTENSIVE_INTENSITY_BONUS,
  WELFARE_LOW_RECOVERY_BONUS,
  WELFARE_HIGH_RECOVERY_REDUCTION,
  WELFARE_SCANDAL_SYNERGY_BONUS,
  WELFARE_HEALTHY_DRIFT_REDUCTION,
} from "@/constants/engine/welfare";

describe("WelfareCalculations", () => {
  let world: WorldState;
  let heya: Heya;
  let welfareState: WelfareState;

  beforeEach(() => {
    world = MockFactory.createWorld();
    heya = MockFactory.createHeya("heya_1");
    heya.facilities = { training: 50, recovery: 50, nutrition: 50 } as any;
    world.heyas.set(heya.id, heya);

    welfareState = {
      welfareRisk: 10,
      complianceState: "compliant",
      weeksInState: 0,
      lastReviewedWeek: 0,
      activeDiet: "maintenance",
    };
  });

  describe("getSeverityWeight", () => {
    it("returns correct weight for serious injuries", () => {
      expect(getSeverityWeight("serious")).toBe(INJURY_PRESSURE_SERIOUS);
      expect(getSeverityWeight("high")).toBe(INJURY_PRESSURE_SERIOUS);
      expect(getSeverityWeight(3)).toBe(INJURY_PRESSURE_SERIOUS);
    });

    it("returns correct weight for moderate injuries", () => {
      expect(getSeverityWeight("moderate")).toBe(INJURY_PRESSURE_MODERATE);
      expect(getSeverityWeight("medium")).toBe(INJURY_PRESSURE_MODERATE);
      expect(getSeverityWeight(2)).toBe(INJURY_PRESSURE_MODERATE);
    });

    it("returns correct weight for minor injuries", () => {
      expect(getSeverityWeight("minor")).toBe(INJURY_PRESSURE_MINOR);
      expect(getSeverityWeight("low")).toBe(INJURY_PRESSURE_MINOR);
      expect(getSeverityWeight(1)).toBe(INJURY_PRESSURE_MINOR);
      expect(getSeverityWeight(undefined)).toBe(INJURY_PRESSURE_MINOR);
    });
  });

  describe("computeInjuryPressure", () => {
    it("accumulates injury pressure for all injured rikishi", () => {
      const r1 = MockFactory.createRikishi("r1", {
        heyaId: "heya_1",
        injured: true,
        injuryStatus: { severity: "serious" } as any,
      });
      const r2 = MockFactory.createRikishi("r2", {
        heyaId: "heya_1",
        injured: true,
        injuryStatus: { severity: "moderate" } as any,
      });
      world.rikishi.set(r1.id, r1);
      world.rikishi.set(r2.id, r2);

      const result = computeInjuryPressure(world, heya);

      expect(result.seriousCount).toBe(1);
      expect(result.pressure).toBe(INJURY_PRESSURE_SERIOUS + INJURY_PRESSURE_MODERATE);
      expect(result.negligenceCount).toBe(0);
    });

    it("detects negligence for unprotected injured rikishi during harsh training", () => {
      const r1 = MockFactory.createRikishi("r1", {
        heyaId: "heya_1",
        injured: true,
        injuryStatus: { severity: "minor" } as any,
      });
      world.rikishi.set(r1.id, r1);

      world.trainingState = new Map();
      world.trainingState.set(heya.id, {
        heyaId: heya.id,
        activeProfile: { intensity: "punishing", recovery: "normal" },
        focusSlots: [],
        developmentQueue: [],
      } as any);

      const result = computeInjuryPressure(world, heya);
      expect(result.negligenceCount).toBe(1);
    });

    it("does not count negligence if rikishi is protected", () => {
      const r1 = MockFactory.createRikishi("r1", {
        heyaId: "heya_1",
        injured: true,
        injuryStatus: { severity: "minor" } as any,
      });
      world.rikishi.set(r1.id, r1);

      world.trainingState = new Map();
      world.trainingState.set(heya.id, {
        heyaId: heya.id,
        activeProfile: { intensity: "punishing", recovery: "normal" },
        focusSlots: [{ rikishiId: "r1", focusType: "protect", intensity: "light" }],
        developmentQueue: [],
      } as any);

      const result = computeInjuryPressure(world, heya);
      expect(result.negligenceCount).toBe(0);
    });
  });

  describe("calculateWeeklyWelfareDelta", () => {
    it("handles happy path healthy drift", () => {
      const result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.delta).toBe(-WELFARE_HEALTHY_DRIFT_REDUCTION);
      expect(result.reasons).toContain("healthy_drift-2");
    });

    it("applies serious injury bonus", () => {
      const r1 = MockFactory.createRikishi("r1", {
        heyaId: "heya_1",
        injured: true,
        injuryStatus: { severity: "serious" } as any,
      });
      world.rikishi.set(r1.id, r1);

      const result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain("serious_injuries+2");
      expect(result.reasons).toContain("misfortune"); // since pressure > 0
    });

    it("applies penalty for negligence", () => {
      const r1 = MockFactory.createRikishi("r1", {
        heyaId: "heya_1",
        injured: true,
        injuryStatus: { severity: "minor" } as any,
      });
      world.rikishi.set(r1.id, r1);

      world.trainingState = new Map();
      world.trainingState.set(heya.id, {
        heyaId: heya.id,
        activeProfile: { intensity: "punishing", recovery: "normal" },
        focusSlots: [],
        developmentQueue: [],
      } as any);

      const result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain(`negligence+${WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER}`);
      expect(result.reasons).toContain("punishing_intensity+3");
      expect(result.reasons).not.toContain("misfortune"); // Replaced by negligence
    });

    it("applies diet modifiers", () => {
      welfareState.activeDiet = "austerity";
      let result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain("austerity_diet+2");

      welfareState.activeDiet = "premium";
      result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain("premium_diet-1");
    });

    it("applies training intensity/recovery modifiers", () => {
      world.trainingState = new Map();
      world.trainingState.set(heya.id, {
        heyaId: heya.id,
        activeProfile: { intensity: "intensive", recovery: "low" },
        focusSlots: [],
        developmentQueue: [],
      } as any);

      let result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain("intensive_intensity+1");
      expect(result.reasons).toContain("low_recovery+2");

      world.trainingState.set(heya.id, {
        heyaId: heya.id,
        activeProfile: { intensity: "balanced", recovery: "high" },
        focusSlots: [],
        developmentQueue: [],
      } as any);

      result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain("high_recovery-2");
    });

    it("applies scandal synergy bonus", () => {
      heya.scandalScore = 60; // SCANDAL_WELFARE_THRESHOLD is 50
      const result = calculateWeeklyWelfareDelta(world, heya, welfareState);
      expect(result.reasons).toContain("scandal_synergy+2");
    });

    it("calculates facility delta when qualities are very low", () => {
      heya.facilities = { training: 10, recovery: 10, nutrition: 15 } as any;
      const result = calculateWeeklyWelfareDelta(world, heya, welfareState);

      // FACILITY_RECOVERY_QUALITY_BASE = 60, DIVISOR = 25. (60-10)/25 = 2.
      // FACILITY_NUTRITION_QUALITY_BASE = 55, DIVISOR = 40. (55-15)/40 = 1.
      // Total facDelta = 3
      expect(result.reasons).toContain("facilities+3");
    });
  });
});

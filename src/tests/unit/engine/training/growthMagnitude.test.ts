import { describe, it, expect } from "vitest";
import {
  diminishingReturnsMult,
  calculateGrowthVector,
} from "@/engine/systems/training/TrainingMath";
import { mockRikishi } from "@/tests/unit/engine/utils";
import type { TrainingProfile, IndividualFocus } from "@/engine/types/training";

const balancedPowerProfile: TrainingProfile = {
  intensity: "balanced",
  focus: "power",
  styleBias: "neutral",
  recovery: "normal",
};

const developFocus: IndividualFocus = {
  rikishiId: "prospect-1",
  focusType: "develop",
};

describe("growth magnitude", () => {
  it("diminishingReturnsMult(40, 80) > 0.4", () => {
    expect(diminishingReturnsMult(40, 80)).toBeGreaterThan(0.4);
  });

  it("diminishingReturnsMult(78, 80) is in (0, 0.2)", () => {
    const dr = diminishingReturnsMult(78, 80);
    expect(dr).toBeGreaterThan(0);
    expect(dr).toBeLessThan(0.2);
  });

  it("young far-from-ceiling prospect gains > 1.0/wk on focused stat (floor-safe)", () => {
    const prospect = mockRikishi("prospect-1", {
      talentSeed: 90,
      power: 40,
      birthYear: 2005,
      experience: 10,
      adaptability: 50,
    });
    const growth = calculateGrowthVector(balancedPowerProfile, developFocus, prospect);
    // Math.floor in applyWeeklyTraining erases sub-1.0 growth, so the raw
    // vector must exceed 1.0 for the focused stat to produce visible movement.
    expect(growth.power).toBeGreaterThan(1.0);
  });
});

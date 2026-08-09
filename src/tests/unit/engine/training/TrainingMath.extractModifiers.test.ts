import { describe, it, expect } from "vitest";
import {
  extractTrainingModifiers,
  calculateGrowthWithModifiers,
  calculateGrowthVector,
} from "@/engine/systems/training/TrainingMath";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { TrainingProfile } from "@/engine/types/training";
import { DEFAULT_FACILITY_LEVEL } from "@/constants/engine/rikishi";
import { TRAINING_MULTIPLIERS, NUTRITION_MULTIPLIERS } from "@/constants/engine/multipliers";

const baseProfile: TrainingProfile = {
  intensity: "balanced",
  focus: "neutral",
  styleBias: "neutral",
  recovery: "normal",
};

describe("extractTrainingModifiers", () => {
  it("with no heya returns default facility level multipliers", () => {
    const mods = extractTrainingModifiers(undefined, undefined);
    const expectedFacility =
      TRAINING_MULTIPLIERS.BASE + (DEFAULT_FACILITY_LEVEL / 100) * TRAINING_MULTIPLIERS.RANGE;
    const expectedNutrition =
      NUTRITION_MULTIPLIERS.BASE + (DEFAULT_FACILITY_LEVEL / 100) * NUTRITION_MULTIPLIERS.RANGE;
    expect(mods.facilityGrowthMult).toBeCloseTo(expectedFacility);
    expect(mods.nutritionMult).toBeCloseTo(expectedNutrition);
    expect(mods.degeikoMult).toBe(1.0);
    expect(mods.styleDriftMults).toEqual({
      power: 1.0,
      speed: 1.0,
      technique: 1.0,
      balance: 1.0,
      stamina: 1.0,
      mental: 1.0,
    });
  });

  it("with training facility 100 → facilityGrowthMult=1.2", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 100, recovery: 50, nutrition: 50 } as any,
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.facilityGrowthMult).toBeCloseTo(1.2);
  });

  it("with training facility 0 → facilityGrowthMult=0.85", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 0, recovery: 50, nutrition: 50 } as any,
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.facilityGrowthMult).toBeCloseTo(0.85);
  });

  it("with nutrition facility 100 → nutritionMult=1.08", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 100 } as any,
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.nutritionMult).toBeCloseTo(1.08);
  });

  it("with nutrition facility 0 → nutritionMult=0.92", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 0 } as any,
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.nutritionMult).toBeCloseTo(0.92);
  });

  it("with ichimon Dewanoumi → degeikoMult=1.05, styleDriftMults.power=1.05", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Dewanoumi",
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.degeikoMult).toBeCloseTo(1.05);
    expect(mods.styleDriftMults.power).toBeCloseTo(1.05);
  });

  it("with ichimon Isegahama → styleDriftMults.technique=1.05, balance=1.05", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Isegahama",
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.styleDriftMults.technique).toBeCloseTo(1.05);
    expect(mods.styleDriftMults.balance).toBeCloseTo(1.05);
  });

  it("with ichimon Tokitsukaze → styleDriftMults.stamina=1.1", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Tokitsukaze",
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.styleDriftMults.stamina).toBeCloseTo(1.1);
  });

  it("with ichimon Takasago → styleDriftMults.mental=1.1", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Takasago",
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.styleDriftMults.mental).toBeCloseTo(1.1);
  });

  it("with faction influence >= 80 → degeikoMult *= 1.1", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Dewanoumi",
    });
    const world = MockFactory.createWorld({
      factions: { Dewanoumi: { influence: 85 } } as any,
    });
    const mods = extractTrainingModifiers(heya, world);
    // 1.05 (ichimon) * 1.1 (faction) = 1.155
    expect(mods.degeikoMult).toBeCloseTo(1.05 * 1.1);
  });

  it("with rivalry heat >= 80 → degeikoMult *= DEGEIKO_PENALTY_MULTIPLIER", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Dewanoumi",
    });
    const world = MockFactory.createWorld({
      rivalriesState: {
        pairs: {},
        heyaRivalryPairs: {
          h1_h2: { heyaAId: "h1", heyaBId: "h2", heat: 90 },
        },
      } as any,
    });
    const mods = extractTrainingModifiers(heya, world);
    // 1.05 (ichimon) * 0.5 (penalty) = 0.525
    expect(mods.degeikoMult).toBeCloseTo(1.05 * 0.5);
  });

  it("with philosophy powerBias=0.1 → styleDriftMults.power=1.1", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      trainingPhilosophy: { powerBias: 0.1 } as any,
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.styleDriftMults.power).toBeCloseTo(1.1);
  });

  it("with philosophy speedBias=0.05 → styleDriftMults.speed=1.05", () => {
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      trainingPhilosophy: { speedBias: 0.05 } as any,
    });
    const mods = extractTrainingModifiers(heya, undefined);
    expect(mods.styleDriftMults.speed).toBeCloseTo(1.05);
  });
});

describe("calculateGrowthWithModifiers", () => {
  it("produces same result as calculateGrowthVector when given equivalent modifiers", () => {
    const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 75, recovery: 50, nutrition: 60 } as any,
      ichimon: "Dewanoumi",
    });
    const world = MockFactory.createWorld({ year: 2025 });

    const wrapperResult = calculateGrowthVector(baseProfile, undefined, r, heya, world);
    const mods = extractTrainingModifiers(heya, world);
    const coreResult = calculateGrowthWithModifiers(baseProfile, undefined, r, mods, 2025);

    for (const key of Object.keys(wrapperResult) as Array<keyof typeof wrapperResult>) {
      expect(coreResult[key]).toBeCloseTo(wrapperResult[key], 10);
    }
  });

  it("with high facility → higher growth than low facility", () => {
    const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });

    const lowMods = extractTrainingModifiers(
      MockFactory.createHeya("h1", {
        facilities: { training: 0, recovery: 50, nutrition: 50 } as any,
      }),
      undefined
    );
    const highMods = extractTrainingModifiers(
      MockFactory.createHeya("h1", {
        facilities: { training: 100, recovery: 50, nutrition: 50 } as any,
      }),
      undefined
    );

    const lowGrowth = calculateGrowthWithModifiers(baseProfile, undefined, r, lowMods, 2025);
    const highGrowth = calculateGrowthWithModifiers(baseProfile, undefined, r, highMods, 2025);

    const lowTotal = Object.values(lowGrowth).reduce((a, b) => a + b, 0);
    const highTotal = Object.values(highGrowth).reduce((a, b) => a + b, 0);
    expect(highTotal).toBeGreaterThan(lowTotal);
  });

  it("with rivalry penalty → lower growth than no rivalry", () => {
    const r = MockFactory.createRikishi("r1", { stats: { experience: 50 } as any });
    const heya = MockFactory.createHeya("h1", {
      facilities: { training: 50, recovery: 50, nutrition: 50 } as any,
      ichimon: "Dewanoumi",
    });

    const noRivalryMods = extractTrainingModifiers(heya, MockFactory.createWorld());
    const rivalryMods = extractTrainingModifiers(
      heya,
      MockFactory.createWorld({
        rivalriesState: {
          pairs: {},
          heyaRivalryPairs: {
            h1_h2: { heyaAId: "h1", heyaBId: "h2", heat: 90 },
          },
        } as any,
      })
    );

    const noRivalryGrowth = calculateGrowthWithModifiers(
      baseProfile,
      undefined,
      r,
      noRivalryMods,
      2025
    );
    const rivalryGrowth = calculateGrowthWithModifiers(
      baseProfile,
      undefined,
      r,
      rivalryMods,
      2025
    );

    const noRivalryTotal = Object.values(noRivalryGrowth).reduce((a, b) => a + b, 0);
    const rivalryTotal = Object.values(rivalryGrowth).reduce((a, b) => a + b, 0);
    expect(rivalryTotal).toBeLessThan(noRivalryTotal);
  });
});

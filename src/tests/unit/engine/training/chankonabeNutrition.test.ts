 
import { describe, it, expect } from "vitest";
import {
  applyWeightJourneyTick,
  WEIGHT_JOURNEY_WEEKLY_GAIN,
} from "@/engine/training/WeightJourney";
import { NUTRITION_MULTIPLIERS } from "@/constants/engine/multipliers";
import { mockRikishi, makeMockWorld } from "../utils";
import type { Heya } from "@/engine/types/heya";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

describe("Chankonabe — nutrition facility tie-in to weight journey", () => {
  it("weight gain scales with high nutrition facility level", () => {
    const rikishi = mockRikishi("wj-nut-high", {
      stats: { weight: 100, power: 50, speed: 50, technique: 50, balance: 50, stamina: 50, mental: 50, experience: 0, adaptability: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 30, progressKg: 0, stalled: false, phases: ["bulking"] },
    });

    const heya: Partial<Heya> = {
      id: "heya-1",
      funds: 100000,
      facilities: { nutrition: 100, training: 50, recovery: 50 } as any,
    };

    const world = makeMockWorld({
      rikishi: new Map([["wj-nut-high", rikishi]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = applyWeightJourneyTick(rikishi, heya as Heya, world);
    const updated = resolveImpacts(world, [impact]);

    const progress = updated.rikishi.get("wj-nut-high")?.weightJourney?.progressKg ?? 0;
    // With nutrition at 100, nutritionMult = BASE + 1.0 * RANGE = 0.92 + 0.16 = 1.08
    const expectedMult = NUTRITION_MULTIPLIERS.BASE + NUTRITION_MULTIPLIERS.RANGE;
    expect(progress).toBeCloseTo(WEIGHT_JOURNEY_WEEKLY_GAIN * expectedMult, 3);
  });

  it("weight gain scales down with low nutrition facility level", () => {
    const rikishi = mockRikishi("wj-nut-low", {
      stats: { weight: 100, power: 50, speed: 50, technique: 50, balance: 50, stamina: 50, mental: 50, experience: 0, adaptability: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 30, progressKg: 0, stalled: false, phases: ["bulking"] },
    });

    const heya: Partial<Heya> = {
      id: "heya-1",
      funds: 100000,
      facilities: { nutrition: 0, training: 50, recovery: 50 } as any,
    };

    const world = makeMockWorld({
      rikishi: new Map([["wj-nut-low", rikishi]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = applyWeightJourneyTick(rikishi, heya as Heya, world);
    const updated = resolveImpacts(world, [impact]);

    const progress = updated.rikishi.get("wj-nut-low")?.weightJourney?.progressKg ?? 0;
    // With nutrition at 0, nutritionMult = BASE = 0.92
    const expectedMult = NUTRITION_MULTIPLIERS.BASE;
    expect(progress).toBeCloseTo(WEIGHT_JOURNEY_WEEKLY_GAIN * expectedMult, 3);
  });

  it("weight gain uses default nutrition when heya facilities undefined", () => {
    const rikishi = mockRikishi("wj-nut-default", {
      stats: { weight: 100, power: 50, speed: 50, technique: 50, balance: 50, stamina: 50, mental: 50, experience: 0, adaptability: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 30, progressKg: 0, stalled: false, phases: ["bulking"] },
    });

    const heya: Partial<Heya> = {
      id: "heya-1",
      funds: 100000,
    };

    const world = makeMockWorld({
      rikishi: new Map([["wj-nut-default", rikishi]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = applyWeightJourneyTick(rikishi, heya as Heya, world);
    const updated = resolveImpacts(world, [impact]);

    const progress = updated.rikishi.get("wj-nut-default")?.weightJourney?.progressKg ?? 0;
    // Default facility level (50) → nutritionMult = 0.92 + 0.5 * 0.16 = 1.0
    expect(progress).toBeCloseTo(WEIGHT_JOURNEY_WEEKLY_GAIN * 1.0, 3);
  });

  it("recovery multiplier already incorporates nutrition (regression guard)", () => {
    // This is a documentation test — the recovery multiplier is calculated
    // in phase02_context.ts as recoveryFacilityMult * nutritionMult.
    // We verify the formula constants are correct.
    expect(NUTRITION_MULTIPLIERS.BASE).toBe(0.92);
    expect(NUTRITION_MULTIPLIERS.RANGE).toBe(0.16);
  });
});

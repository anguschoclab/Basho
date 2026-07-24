import { describe, it, expect, beforeEach } from "vitest";
import { phase02_context } from "@/engine/tick/phases/phase02_context";
import { applyImpact } from "@/engine/core/ImpactResolver";
import { computeDisplayTrainingMultiplier } from "@/engine/systems/training/TrainingMath";
import type { WorldState } from "@/engine/types/world";

describe("Phase 2: Context", () => {
  let world: WorldState;

  beforeEach(() => {
    world = {
      playerHeyaId: "heya-1",
      heyas: new Map<string, any>([
        [
          "heya-1",
          {
            id: "heya-1",
            name: "Test Heya",
            funds: 1000,
            rikishiIds: ["r1", "r2"],
            facilities: { training: 50, recovery: 50, nutrition: 50 },
          },
        ],
      ]),
      history: [],
      transientContext: {
        deltas: { revenue: 500, expenses: 200 },
      },
    } as unknown as WorldState;
  });

  it("calculates baseline raw component multipliers with default 50 level facilities", () => {
    world = applyImpact(world, phase02_context(world));

    const am = world.transientContext!.activeModifiers!;

    // Default 50 training => 0.85 + (50/100)*0.35 = 1.025
    expect(am.facilityGrowthMult).toBeCloseTo(1.025);
    // Default 50 nutrition => 0.92 + (50/100)*0.16 = 1.00
    expect(am.nutritionMult).toBeCloseTo(1.0);
    // No ichimon/faction/rivalry => degeikoMult = 1.0
    expect(am.degeikoMult).toBeCloseTo(1.0);
    // Style drift all 1.0 with no philosophy/ichimon
    expect(am.styleDriftMults.power).toBeCloseTo(1.0);
    expect(am.styleDriftMults.speed).toBeCloseTo(1.0);
    expect(am.styleDriftMults.technique).toBeCloseTo(1.0);
    // Default 50 recovery => 0.80 + (50/100)*0.40 = 1.00; * nutrition 1.0 = 1.0
    expect(am.recoveryMultiplier).toBeCloseTo(1.0);
    expect(am.financialPenalty).toBe(false);
    expect(am.moraleBoost).toBe(false);
  });

  it("sets financialPenalty flag if funds < 0 (does not bundle into facilityGrowthMult)", () => {
    world.heyas.get("heya-1")!.funds = -100;

    world = applyImpact(world, phase02_context(world));

    const am = world.transientContext!.activeModifiers!;
    expect(am.financialPenalty).toBe(true);
    // facilityGrowthMult is unaffected by financial penalty — it's applied downstream
    expect(am.facilityGrowthMult).toBeCloseTo(1.025);
    // Display multiplier should reflect the penalty
    expect(computeDisplayTrainingMultiplier(am)).toBeCloseTo(1.025 * 0.5);
  });

  it("sets moraleBoost flag if a player rikishi won the last basho (does not bundle into facilityGrowthMult)", () => {
    world.history = [{ yusho: "r1" }] as unknown as WorldState["history"];

    world = applyImpact(world, phase02_context(world));

    const am = world.transientContext!.activeModifiers!;
    expect(am.moraleBoost).toBe(true);
    // facilityGrowthMult is unaffected by morale boost — it's applied downstream
    expect(am.facilityGrowthMult).toBeCloseTo(1.025);
    // Display multiplier should reflect the boost
    expect(computeDisplayTrainingMultiplier(am)).toBeCloseTo(1.025 + 0.15);
  });

  it("calculates max and min facilities multipliers correctly", () => {
    const heya = world.heyas.get("heya-1");
    if (heya) {
      heya.facilities = { training: 100, recovery: 100, nutrition: 100 };
    }
    world = applyImpact(world, phase02_context(world));

    const am = world.transientContext!.activeModifiers!;
    // Max training = 0.85 + 0.35 = 1.2
    expect(am.facilityGrowthMult).toBeCloseTo(1.2);
    // Max nutrition = 0.92 + 0.16 = 1.08
    expect(am.nutritionMult).toBeCloseTo(1.08);
    // Max recovery = 1.2 * 1.08 = 1.296
    expect(am.recoveryMultiplier).toBeCloseTo(1.296);

    const heya2 = world.heyas.get("heya-1");
    if (heya2) {
      heya2.facilities = { training: 0, recovery: 0, nutrition: 0 };
    }
    world = applyImpact(world, phase02_context(world));

    const am2 = world.transientContext!.activeModifiers!;
    // Min training = 0.85
    expect(am2.facilityGrowthMult).toBeCloseTo(0.85);
    // Min nutrition = 0.92
    expect(am2.nutritionMult).toBeCloseTo(0.92);
    // Min recovery = 0.8 * 0.92 = 0.736
    expect(am2.recoveryMultiplier).toBeCloseTo(0.736);
  });

  it("activeModifiers contains raw components (no trainingMultiplier field)", () => {
    world = applyImpact(world, phase02_context(world));

    const am = world.transientContext!.activeModifiers! as unknown as Record<string, unknown>;
    expect(am).toBeDefined();
    expect(am).not.toHaveProperty("trainingMultiplier");
    expect(am).toHaveProperty("facilityGrowthMult");
    expect(am).toHaveProperty("nutritionMult");
    expect(am).toHaveProperty("degeikoMult");
    expect(am).toHaveProperty("styleDriftMults");
    expect(am).toHaveProperty("recoveryMultiplier");
    expect(am).toHaveProperty("financialPenalty");
    expect(am).toHaveProperty("moraleBoost");
  });

  it("preserves revenue and expenses from phase01, resets other deltas", () => {
    const deltas = world.transientContext!.deltas as unknown as Record<string, unknown>;
    deltas.statChanges = { r1: [{ stat: "power", amount: 5 }] };
    deltas.injuriesSustained = ["r1"];

    world = applyImpact(world, phase02_context(world));

    expect(world.transientContext!.deltas!.revenue).toBe(500);
    expect(world.transientContext!.deltas!.expenses).toBe(200);
    expect(world.transientContext!.deltas!.statChanges).toEqual({});
    expect(world.transientContext!.deltas!.injuriesSustained).toEqual([]);
  });
});

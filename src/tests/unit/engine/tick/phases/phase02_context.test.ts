import { describe, it, expect, beforeEach } from "vitest";
import { phase02_context } from "../phase02_context";
import { applyImpact } from "../../../core/ImpactResolver";
import type { WorldState } from "../../../types/world";
import type { MockWorldState, MockHeya } from "../../../../__tests__/types/mockTypes";

describe("Phase 2: Context", () => {
  let world: WorldState;

  beforeEach(() => {
    world = {
      playerHeyaId: "heya-1",
      heyas: new Map<string, MockHeya>([
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

  it("calculates baseline multipliers with default 50 level facilities", () => {
    world = applyImpact(world, phase02_context(world));

    // Default 50 training => 0.85 + (50/100)*0.35 = 1.025
    // Default 50 recovery => 0.80 + (50/100)*0.40 = 1.00
    // Default 50 nutrition => 0.92 + (50/100)*0.16 = 1.00

    expect(world.transientContext!.activeModifiers!.trainingMultiplier).toBeCloseTo(1.025);
    expect(world.transientContext!.activeModifiers!.recoveryMultiplier).toBeCloseTo(1.0);
    expect(world.transientContext!.activeModifiers!.financialPenalty).toBe(false);
    expect(world.transientContext!.activeModifiers!.moraleBoost).toBe(false);
  });

  it("applies financial penalty if funds < 0", () => {
    world.heyas.get("heya-1")!.funds = -100;

    world = applyImpact(world, phase02_context(world));

    expect(world.transientContext!.activeModifiers!.financialPenalty).toBe(true);
    // Training multiplier halved
    expect(world.transientContext!.activeModifiers!.trainingMultiplier).toBeCloseTo(1.025 * 0.5);
  });

  it("applies morale boost if a player rikishi won the last basho", () => {
    world.history = [{ yusho: "r1" }] as unknown as WorldState["history"];

    world = applyImpact(world, phase02_context(world));

    expect(world.transientContext!.activeModifiers!.moraleBoost).toBe(true);
    // +0.15 added before halving
    expect(world.transientContext!.activeModifiers!.trainingMultiplier).toBeCloseTo(1.025 + 0.15);
  });

  it("calculates max and min facilities multipliers correctly", () => {
    const heya = world.heyas.get("heya-1");
    if (heya) {
      heya.facilities = { training: 100, recovery: 100, nutrition: 100 };
    }
    world = applyImpact(world, phase02_context(world));

    // Max training = 0.85 + 0.35 = 1.2
    // Max recovery = 1.2 * 1.08 = 1.296
    expect(world.transientContext!.activeModifiers!.trainingMultiplier).toBeCloseTo(1.2);
    expect(world.transientContext!.activeModifiers!.recoveryMultiplier).toBeCloseTo(1.296);

    const heya2 = world.heyas.get("heya-1");
    if (heya2) {
      heya2.facilities = { training: 0, recovery: 0, nutrition: 0 };
    }
    world = applyImpact(world, phase02_context(world));

    // Min training = 0.85
    // Min recovery = 0.8 * 0.92 = 0.736
    expect(world.transientContext!.activeModifiers!.trainingMultiplier).toBeCloseTo(0.85);
    expect(world.transientContext!.activeModifiers!.recoveryMultiplier).toBeCloseTo(0.736);
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

import { describe, it, expect } from "vitest";
import { applyWeeklyTraining } from "../TrainingService";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../../../../tests/unit/engine/utils";
import { resolveImpacts } from "../../../core/ImpactResolver";

describe("TrainingService flag consumption", () => {
  it("consumes trainingGrowthBuff and applies growth multiplier", () => {
    const heya = makeMockHeya("h1", ["r1"]);
    const rikishi = mockRikishi("r1", { power: 50, speed: 50, technique: 50 });
    const world = makeMockWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      transientContext: { trainingGrowthBuff: 1.05 } as never,
    });

    const impact = applyWeeklyTraining(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    // Flag should be consumed (cleared)
    const tc = updatedWorld.transientContext as Record<string, unknown> | undefined;
    expect(tc?.trainingGrowthBuff).toBeUndefined();
  });

  it("consumes trainingRegime power_focus and applies power bonus", () => {
    const heya = makeMockHeya("h1", ["r1"]);
    const rikishi = mockRikishi("r1", { power: 50, speed: 50, technique: 50 });
    const world = makeMockWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      transientContext: { trainingRegime: "power_focus" } as never,
    });

    const impact = applyWeeklyTraining(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    // Flag should be consumed
    const tc = updatedWorld.transientContext as Record<string, unknown> | undefined;
    expect(tc?.trainingRegime).toBeUndefined();
  });

  it("consumes trainingRegime technique_focus and applies technique bonus", () => {
    const heya = makeMockHeya("h1", ["r1"]);
    const rikishi = mockRikishi("r1", { power: 50, speed: 50, technique: 50 });
    const world = makeMockWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      transientContext: { trainingRegime: "technique_focus" } as never,
    });

    const impact = applyWeeklyTraining(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    // Flag should be consumed
    const tc = updatedWorld.transientContext as Record<string, unknown> | undefined;
    expect(tc?.trainingRegime).toBeUndefined();
  });

  it("consumes trainingRegime balanced and applies balanced bonus", () => {
    const heya = makeMockHeya("h1", ["r1"]);
    const rikishi = mockRikishi("r1", { power: 50, speed: 50, technique: 50 });
    const world = makeMockWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      rikishi: new Map([["r1", rikishi]]),
      transientContext: { trainingRegime: "balanced" } as never,
    });

    const impact = applyWeeklyTraining(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    // Flag should be consumed
    const tc = updatedWorld.transientContext as Record<string, unknown> | undefined;
    expect(tc?.trainingRegime).toBeUndefined();
  });
});

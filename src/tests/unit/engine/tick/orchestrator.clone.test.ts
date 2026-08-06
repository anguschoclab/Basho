 
import { describe, it, expect } from "vitest";
import { tickOrchestrator, advanceDaysFastOrchestrator } from "@/engine/tick/tickOrchestrator";
import { makeMockWorld } from "../utils";

/**
 * P2.1: Orchestrators must not clone the input world — the pipeline is already immutable.
 * The redundant structuredClone adds ~50ms per tick for large worlds.
 */

describe("P2.1: tickOrchestrator does not clone input", () => {
  it("returns a new world reference (not the same object as input)", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      _daysSinceLastWeeklyTick: 0,
    });
    const result = tickOrchestrator(world);
    expect(result).not.toBe(world);
  });

  it("does not mutate the input world", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      _daysSinceLastWeeklyTick: 0,
    });
    const originalDayIndex = world.dayIndexGlobal;
    tickOrchestrator(world);
    // Input world should be unchanged
    expect(world.dayIndexGlobal).toBe(originalDayIndex);
  });

  it("advances the day by exactly 1", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      _daysSinceLastWeeklyTick: 0,
    });
    const result = tickOrchestrator(world);
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
  });
});

describe("P2.1: advanceDaysFastOrchestrator does not clone input", () => {
  it("returns a new world reference (not the same object as input)", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      _daysSinceLastWeeklyTick: 0,
    });
    const result = advanceDaysFastOrchestrator(world, 3);
    expect(result).not.toBe(world);
  });

  it("does not mutate the input world", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      _daysSinceLastWeeklyTick: 0,
    });
    const originalDayIndex = world.dayIndexGlobal;
    advanceDaysFastOrchestrator(world, 3);
    expect(world.dayIndexGlobal).toBe(originalDayIndex);
  });

  it("advances the day by exactly N", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      _daysSinceLastWeeklyTick: 0,
    });
    const result = advanceDaysFastOrchestrator(world, 5);
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 5);
  });
});

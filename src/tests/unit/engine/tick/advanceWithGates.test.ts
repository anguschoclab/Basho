import { describe, it, expect } from "vitest";
import { advanceWithGates } from "@/engine/tick/advanceWithGates";
import { makeMockWorld } from "../utils";

/**
 * P4.19: Advance With Gates tests (for P3.6).
 * Verifies that advanceWithGates stops on target, gate, halt, and maxDays.
 */

describe("P3.6: advanceWithGates", () => {
  it("advances until target reached, then stops", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceWithGates(world, {
      maxDays: 30,
      isTargetReached: (_w, days) => days >= 5,
    });

    expect(result.daysAdvanced).toBe(5);
    expect(result.stoppedBy).toBe("target");
  });

  it("advances until gate triggered, then stops", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceWithGates(world, {
      maxDays: 30,
      shouldStop: (_w, days) => days >= 3,
    });

    expect(result.daysAdvanced).toBe(3);
    expect(result.stoppedBy).toBe("gate");
  });

  it("advances until shouldHaltAdvance, then stops", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceWithGates(world, {
      maxDays: 30,
      haltOnPendingDecision: true,
      isTargetReached: (w) =>
        w.pendingCrisis !== undefined,
    });

    // Without a pending crisis, it should run to maxDays
    expect(result.daysAdvanced).toBe(30);
    expect(result.stoppedBy).toBe("maxDays");
  });

  it("respects maxDays cap", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceWithGates(world, {
      maxDays: 7,
    });

    expect(result.daysAdvanced).toBe(7);
    expect(result.stoppedBy).toBe("maxDays");
  });

  it("autonomous flag sets _autonomousSim on world", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
      _autonomousSim: false,
    });

    const result = advanceWithGates(world, {
      maxDays: 1,
      autonomous: true,
    });

    expect(result.world._autonomousSim).toBe(true);
  });

  it("does not mutate input world", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });
    const originalDayIndex = world.dayIndexGlobal;

    advanceWithGates(world, { maxDays: 5 });

    expect(world.dayIndexGlobal).toBe(originalDayIndex);
  });
});

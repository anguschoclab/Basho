import { describe, it, expect } from "vitest";
import {
  advanceOneDay,
  advanceDaysFast,
  advanceDays,
  type AdvanceOptions,
} from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";

/**
 * P4.15: Advance consolidation tests.
 * Verifies that advanceDays with skipDailyMicroPhases equals advanceDaysFast,
 * and that advanceOneDay with autonomous flag sets autonomous behavior.
 */

describe("P3.2: Advance consolidation", () => {
  it("advanceDaysFast(world, 7) produces same dayIndexGlobal as 7 × advanceOneDay with skipDailyMicroPhases", () => {
    const world1 = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });
    const world2 = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    // advanceDaysFast uses advanceOneDay with skipDailyMicroPhases: true
    const fastResult = advanceDaysFast(world1, 7);

    // Manually advance 7 days with skipDailyMicroPhases
    let manualResult = world2;
    for (let i = 0; i < 7; i++) {
      manualResult = advanceOneDay(manualResult, { skipDailyMicroPhases: true });
    }

    expect(fastResult.dayIndexGlobal).toBe(manualResult.dayIndexGlobal);
  });

  it("advanceOneDay with skipDailyMicroPhases skips daily micro-phases", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceOneDay(world, { skipDailyMicroPhases: true });
    expect(result.dayIndexGlobal).toBe(1);
    // transientContext.lastReport should NOT be set when skipping
    expect(result.transientContext?.lastReport).toBeUndefined();
  });

  it("advanceOneDay without skipDailyMicroPhases sets lastReport", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceOneDay(world);
    expect(result.dayIndexGlobal).toBe(1);
    // transientContext.lastReport should be set when running full pipeline
    expect(result.transientContext?.lastReport).toBeDefined();
  });

  it("advanceOneDay with autonomous flag sets _autonomousSim", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
      _autonomousSim: false,
    });

    const result = advanceOneDay(world, { autonomous: true });
    expect(result._autonomousSim).toBe(true);
  });

  it("advanceDays with autonomous flag sets _autonomousSim", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
      _autonomousSim: false,
    });

    const result = advanceDays(world, 3, { autonomous: true });
    expect(result._autonomousSim).toBe(true);
  });

  it("advanceDaysFast with autonomous flag sets _autonomousSim", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
      _autonomousSim: false,
    });

    const result = advanceDaysFast(world, 3, { autonomous: true });
    expect(result._autonomousSim).toBe(true);
  });

  it("advanceDays calls onProgress after each day", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const progressCalls: number[] = [];
    advanceDays(world, 3, {
      onProgress: (days) => progressCalls.push(days),
    });

    expect(progressCalls).toEqual([1, 2, 3]);
  });

  it("advanceDaysFast calls onProgress after each day", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const progressCalls: number[] = [];
    advanceDaysFast(world, 3, {
      onProgress: (days) => progressCalls.push(days),
    });

    expect(progressCalls).toEqual([1, 2, 3]);
  });

  it("AdvanceOptions interface is exported and usable", () => {
    const opts: AdvanceOptions = {
      skipDailyMicroPhases: true,
      autonomous: true,
      haltOnPendingDecision: true,
      chunkSize: 7,
      onProgress: () => {},
    };
    expect(opts.skipDailyMicroPhases).toBe(true);
    expect(opts.autonomous).toBe(true);
  });
});

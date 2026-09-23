import { describe, it, expect } from "vitest";
import { advanceDaysFast } from "@/engine/tick/tickDaily";
import { makeMockWorld, makeMockBasho } from "../utils";

/**
 * P4.10: advanceDaysFast tests.
 * Verifies that fast advance produces the same dayIndexGlobal as
 * N × advanceOneDay, and that weekly pipelines run correctly.
 */

describe("P2.3: advanceDaysFast", () => {
  it("7-day fast advance increments dayIndexGlobal by 7", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceDaysFast(world, 7);
    expect(result.dayIndexGlobal).toBe(7);
  });

  it("42-day fast advance increments dayIndexGlobal by 42", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      // Enough interim runway to stay out of the next basho — otherwise the
      // advance legitimately halts at senshuraku for the interactive
      // "End Basho" gate (V7-B14).
      _interimDaysRemaining: 60,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceDaysFast(world, 42);
    expect(result.dayIndexGlobal).toBe(42);
  });

  it("determinism: same seed produces same final dayIndexGlobal", () => {
    const world1 = makeMockWorld({
      seed: "determinism-test",
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });
    const world2 = makeMockWorld({
      seed: "determinism-test",
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result1 = advanceDaysFast(world1, 7);
    const result2 = advanceDaysFast(world2, 7);
    expect(result1.dayIndexGlobal).toBe(result2.dayIndexGlobal);
  });

  it("advanceDaysFast does not mutate input world", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { month: 1, currentDay: 1, currentWeek: 1 } as any,
    });
    const originalDayIndex = world.dayIndexGlobal;

    advanceDaysFast(world, 7);

    expect(world.dayIndexGlobal).toBe(originalDayIndex);
  });

  it("fast advance across a year boundary updates world.year", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      _daysSinceLastWeeklyTick: 6, // tomorrow is a weekly tick so phase06 runs
      calendar: { month: 12, currentDay: 31, currentWeek: 52 } as any,
    });

    const result = advanceDaysFast(world, 1);

    expect(result.year).toBe(2027);
    expect(result.calendar?.month).toBe(1);
    expect(result.calendar?.currentDay).toBe(1);
  });

  // V7-B14: basho termination is interactive ("End Basho"). A fast advance
  // must stop at senshuraku instead of running the day counter into
  // post-tournament limbo (observed live: day 33/15).
  it("does not advance an active basho past senshuraku", () => {
    const world = makeMockWorld({
      cyclePhase: "active_basho",
      currentBasho: makeMockBasho({ day: 15 }),
      calendar: { month: 1, currentDay: 10, currentWeek: 3 } as any,
    });

    const result = advanceDaysFast(world, 10);

    expect(result.currentBasho?.day ?? 0).toBeLessThanOrEqual(16);
    expect(result.cyclePhase).toBe("active_basho");
  });

  it("resolves every basho day through the pipeline (no batch skipping)", () => {
    const world = makeMockWorld({
      cyclePhase: "active_basho",
      currentBasho: makeMockBasho({ day: 10 }),
      calendar: { month: 1, currentDay: 10, currentWeek: 3 } as any,
    });

    const result = advanceDaysFast(world, 3);

    // Each of the 3 advanced days must run advanceOneDay, advancing the
    // basho day counter exactly once per calendar day.
    expect(result.currentBasho?.day).toBe(13);
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 3);
  });
});

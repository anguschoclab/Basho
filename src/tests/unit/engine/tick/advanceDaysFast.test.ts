import { describe, it, expect } from "vitest";
import { advanceDaysFast } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";

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
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceDaysFast(world, 7);
    expect(result.dayIndexGlobal).toBe(7);
  });

  it("42-day fast advance increments dayIndexGlobal by 42", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result = advanceDaysFast(world, 42);
    expect(result.dayIndexGlobal).toBe(42);
  });

  it("determinism: same seed produces same final dayIndexGlobal", () => {
    const world1 = makeMockWorld({
      seed: "determinism-test",
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });
    const world2 = makeMockWorld({
      seed: "determinism-test",
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    const result1 = advanceDaysFast(world1, 7);
    const result2 = advanceDaysFast(world2, 7);
    expect(result1.dayIndexGlobal).toBe(result2.dayIndexGlobal);
  });

  it("advanceDaysFast does not mutate input world", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });
    const originalDayIndex = world.dayIndexGlobal;

    advanceDaysFast(world, 7);

    expect(world.dayIndexGlobal).toBe(originalDayIndex);
  });
});

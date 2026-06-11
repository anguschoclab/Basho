import { describe, it, expect } from "vitest";
import { advanceOneDay, advanceDaysFast } from "../../tick/tickDaily";
import { makeMockWorld } from "../../__tests__/utils";
import type { WorldState } from "../../types/world";

/**
 * Simulates a worker round-trip for TICK_MULTIPLE_DAYS by running the
 * same logic the worker handler would execute (sans structuredClone).
 */
function simulateWorkerTickMultipleDays(world: WorldState, days: number): WorldState {
  const useFast = days >= 7;
  const chunk = useFast ? 7 : 1;
  let currentWorld = world;

  for (let i = 0; i < days; i += chunk) {
    const remaining = days - i;
    const step = Math.min(chunk, remaining);

    if (useFast) {
      currentWorld = advanceDaysFast(currentWorld, step);
    } else {
      for (let j = 0; j < step; j++) {
        currentWorld = advanceOneDay(currentWorld);
      }
    }
  }

  return currentWorld;
}

describe("worker TICK_MULTIPLE_DAYS round-trip", () => {
  it("advances 7 days via fast path", () => {
    const world = makeMockWorld({
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    });

    const result = simulateWorkerTickMultipleDays(world, 7);

    expect(result.dayIndexGlobal).toBe(7);
    expect(result._daysSinceLastWeeklyTick).toBe(0);
  });

  it("advances 3 days via slow path (chunk = 1)", () => {
    const world = makeMockWorld({
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    });

    const result = simulateWorkerTickMultipleDays(world, 3);

    expect(result.dayIndexGlobal).toBe(3);
  });

  it("produces identical state to advanceDaysFast for multiples of 7", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 0,
      calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    });

    const workerResult = simulateWorkerTickMultipleDays(world, 14);

    // advanceDaysFast on the same starting world
    const directResult = advanceDaysFast(world, 14);

    expect(workerResult.dayIndexGlobal).toBe(directResult.dayIndexGlobal);
    expect(workerResult.calendar).toEqual(directResult.calendar);
  });
});

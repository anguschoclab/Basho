import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import type { WorldState } from "@/engine/types/world";

// Minimal stub for counter testing only. Weekly phases will throw/skip on this empty
// world — that is expected. These tests verify counter state only, not phase execution.
function makeMinimalWorld(): WorldState {
  return {
    id: "test",
    seed: "test-seed",
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "interim",
    _interimDaysRemaining: 42,
    _postBashoDays: undefined,
    _daysSinceLastWeeklyTick: undefined,
    calendar: { currentDay: 1, month: 1, year: 2025, currentWeek: 1 },
    rikishi: new Map(),
    heyas: new Map(),
    events: [],
    history: [],
    transientContext: undefined,
  } as unknown as WorldState;
}

describe("weekly tick counter", () => {
  it("increments daysSinceLastWeeklyTick each non-weekly day", () => {
    let world = makeMinimalWorld();
    const counters: number[] = [];
    for (let i = 0; i < 6; i++) {
      world = advanceOneDay(world);
      counters.push(world._daysSinceLastWeeklyTick ?? -1);
    }
    expect(counters).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("fires weekly tick on day 7 and resets counter to 0", () => {
    let world = makeMinimalWorld();
    for (let i = 0; i < 6; i++) world = advanceOneDay(world);
    world = advanceOneDay(world); // day 7
    expect(world._daysSinceLastWeeklyTick).toBe(0);
  });

  it("fires weekly tick again exactly on day 14", () => {
    let world = makeMinimalWorld();
    for (let i = 0; i < 14; i++) world = advanceOneDay(world);
    expect(world._daysSinceLastWeeklyTick).toBe(0);
  });

  it("counter increments again after a weekly tick reset", () => {
    let world = makeMinimalWorld();
    for (let i = 0; i < 8; i++) world = advanceOneDay(world);
    expect(world._daysSinceLastWeeklyTick).toBe(1);
  });

  it("fires exactly 7 weekly ticks across 49 off-season days", () => {
    let world = makeMinimalWorld();
    let weeklyFires = 0;
    for (let i = 0; i < 49; i++) {
      world = advanceOneDay(world);
      if (world._daysSinceLastWeeklyTick === 0) weeklyFires++;
    }
    expect(weeklyFires).toBe(7);
  });

  it("recovers and fires within 1 day if counter somehow starts above 7", () => {
    // If a saved game has a corrupted counter value > 7, the tick should fire immediately
    let world = { ...makeMinimalWorld(), _daysSinceLastWeeklyTick: 10 };
    world = advanceOneDay(world);
    // (10 ?? 0) + 1 = 11, 11 >= 7 → fires, resets to 0
    expect(world._daysSinceLastWeeklyTick).toBe(0);
  });
});

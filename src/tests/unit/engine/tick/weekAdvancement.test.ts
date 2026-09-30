import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";

/**
 * Regression coverage for the frozen-week defect: advanceCalendarDay must
 * increment calendar.currentWeek (and therefore world.week) when the
 * _daysSinceLastWeeklyTick counter reaches WEEKLY_TICK_THRESHOLD (7).
 * Week-keyed systems — NPC AI rotation, weekly injury RNG seeds, loop-decision
 * deadlines, recruitment window closes, rivalry decay — all depend on it.
 */
describe("calendar week advancement", () => {
  it("keeps week constant on non-weekly days", () => {
    let world = makeMockWorld({ _daysSinceLastWeeklyTick: 0 });
    for (let i = 0; i < 6; i++) {
      world = advanceOneDay(world);
      expect(world.week).toBe(1);
      expect(world.calendar?.currentWeek).toBe(1);
    }
  });

  it("increments week + currentWeek when the weekly gate fires (day 7)", () => {
    let world = makeMockWorld({ _daysSinceLastWeeklyTick: 0 });
    for (let i = 0; i < 7; i++) world = advanceOneDay(world);
    expect(world.week).toBe(2);
    expect(world.calendar?.currentWeek).toBe(2);
  });

  it("keeps incrementing on subsequent weekly gates", () => {
    let world = makeMockWorld({ _daysSinceLastWeeklyTick: 0 });
    for (let i = 0; i < 14; i++) world = advanceOneDay(world);
    expect(world.week).toBe(3);
    expect(world.calendar?.currentWeek).toBe(3);
  });

  it("does not increment week when the weekly counter is mid-cycle", () => {
    let world = makeMockWorld({ _daysSinceLastWeeklyTick: 2 });
    world = advanceOneDay(world);
    expect(world.week).toBe(1);
    world = advanceOneDay(world);
    expect(world.week).toBe(1);
  });
});

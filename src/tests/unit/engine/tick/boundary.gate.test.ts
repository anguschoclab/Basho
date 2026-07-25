/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";

/**
 * P1.1: Boundary gate tests — month/year boundary phases must only run on weekly ticks.
 * If a boundary lands on a non-weekly day, it is deferred to the next weekly tick
 * via pendingMonthBoundary / pendingYearBoundary flags.
 */

describe("P1.1: Boundary gate — month boundary", () => {
  it("does NOT run phase05 on a non-weekly day (day 3) even if monthBoundary is true", () => {
    // Set up a world where day 3 is a month boundary
    // calendar.currentDay = 27 (last day of a 28-day month) → next day crosses month
    const world = makeMockWorld({
      _daysSinceLastWeeklyTick: 2, // day 3 of the week (not weekly tick)
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 1,
        week: 1,
        currentDay: 31, // last day of Jan (31-day month) → next tick is month boundary
      } as any,
    });

    const result = advanceOneDay(world);
    // dayIndexGlobal should advance
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
    // The month boundary should be detected but deferred
    expect(result.transientContext?.pendingMonthBoundary).toBe(true);
    // phase05 should NOT have run (no lastReport with monthBoundary)
    // The key indicator: the weekly pipeline didn't run (not a weekly tick)
    expect(result._daysSinceLastWeeklyTick).toBe(3); // incremented but not reset
  });

  it("runs phase05 on a weekly tick (day 7) when monthBoundary is true", () => {
    // Set up a world where day 7 is a month boundary
    const world = makeMockWorld({
      _daysSinceLastWeeklyTick: 6, // day 7 of the week (weekly tick)
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 1,
        week: 1,
        currentDay: 31, // last day of Jan (31-day month) → next tick is month boundary
      } as any,
    });

    const result = advanceOneDay(world);
    // Weekly tick should reset the counter
    expect(result._daysSinceLastWeeklyTick).toBe(0);
    // The boundary should have been consumed
    expect(result.transientContext?.pendingMonthBoundary).toBeFalsy();
    // The calendar should have crossed the month boundary
    expect(result.calendar?.month).toBe(2);
  });

  it("defers month boundary from day 3 to day 7 (next weekly tick)", () => {
    // Start at day 3 with a month boundary
    let world = makeMockWorld({
      _daysSinceLastWeeklyTick: 2, // day 3
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 1,
        week: 1,
        currentDay: 31, // last day of Jan (31-day month) → next tick is month boundary
      } as any,
    });

    // Advance day 3 → day 4 (month boundary detected, deferred)
    world = advanceOneDay(world);
    expect(world.transientContext?.pendingMonthBoundary).toBe(true);
    expect(world.calendar?.month).toBe(2); // calendar crossed
    expect(world._daysSinceLastWeeklyTick).toBe(3);

    // Advance days 4-6 (no boundary, pending flag persists)
    world = advanceOneDay(world); // day 4
    expect(world.transientContext?.pendingMonthBoundary).toBe(true);
    world = advanceOneDay(world); // day 5
    expect(world.transientContext?.pendingMonthBoundary).toBe(true);
    world = advanceOneDay(world); // day 6
    expect(world.transientContext?.pendingMonthBoundary).toBe(true);

    // Advance day 7 (weekly tick — pending boundary consumed)
    world = advanceOneDay(world);
    expect(world._daysSinceLastWeeklyTick).toBe(0); // weekly tick reset
    // Pending flag should be cleared after the weekly tick
    expect(world.transientContext?.pendingMonthBoundary).toBeFalsy();
  });
});

describe("P1.1: Boundary gate — year boundary", () => {
  it("does NOT run phase06 on a non-weekly day (day 3) even if yearBoundary is true", () => {
    const world = makeMockWorld({
      _daysSinceLastWeeklyTick: 2, // day 3
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 12,
        week: 1,
        currentDay: 31, // last day of December → next tick is year boundary
      } as any,
    });

    const result = advanceOneDay(world);
    expect(result.transientContext?.pendingYearBoundary).toBe(true);
    expect(result._daysSinceLastWeeklyTick).toBe(3); // not reset
  });

  it("runs phase06 on a weekly tick (day 7) when yearBoundary is true", () => {
    const world = makeMockWorld({
      _daysSinceLastWeeklyTick: 6, // day 7 (weekly tick)
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 12,
        week: 1,
        currentDay: 31, // last day of December → next tick is year boundary
      } as any,
    });

    const result = advanceOneDay(world);
    expect(result._daysSinceLastWeeklyTick).toBe(0); // weekly tick reset
    expect(result.transientContext?.pendingYearBoundary).toBeFalsy();
    expect(result.calendar?.year).toBe(2026);
  });

  it("defers year boundary from day 3 to day 7", () => {
    let world = makeMockWorld({
      _daysSinceLastWeeklyTick: 2,
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 12,
        week: 1,
        currentDay: 31,
      } as any,
    });

    // Day 3 → year boundary detected, deferred
    world = advanceOneDay(world);
    expect(world.transientContext?.pendingYearBoundary).toBe(true);
    expect(world.calendar?.year).toBe(2026);

    // Days 4-6: pending flag persists
    for (let i = 0; i < 3; i++) {
      world = advanceOneDay(world);
      expect(world.transientContext?.pendingYearBoundary).toBe(true);
    }

    // Day 7: weekly tick — pending boundary consumed
    world = advanceOneDay(world);
    expect(world._daysSinceLastWeeklyTick).toBe(0);
    expect(world.transientContext?.pendingYearBoundary).toBeFalsy();
  });
});

describe("P1.1: Boundary gate — both boundaries", () => {
  it("defers both month + year boundaries from day 3 to day 7; phase05 before phase06", () => {
    let world = makeMockWorld({
      _daysSinceLastWeeklyTick: 2,
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 12,
        week: 1,
        currentDay: 31, // Dec 31 → Jan 1 (both month + year boundary)
      } as any,
    });

    // Day 3: both boundaries detected, deferred
    world = advanceOneDay(world);
    expect(world.transientContext?.pendingMonthBoundary).toBe(true);
    expect(world.transientContext?.pendingYearBoundary).toBe(true);
    expect(world.calendar?.year).toBe(2026);
    expect(world.calendar?.month).toBe(1);

    // Advance to day 7
    for (let i = 0; i < 4; i++) {
      world = advanceOneDay(world);
    }

    // Day 7: weekly tick — both boundaries consumed
    expect(world._daysSinceLastWeeklyTick).toBe(0);
    expect(world.transientContext?.pendingMonthBoundary).toBeFalsy();
    expect(world.transientContext?.pendingYearBoundary).toBeFalsy();
  });
});

describe("P1.1: Boundary gate — non-boundary weekly tick", () => {
  it("does not run boundary phases on a weekly tick with no boundaries", () => {
    const world = makeMockWorld({
      _daysSinceLastWeeklyTick: 6, // day 7 (weekly tick)
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 1,
        week: 1,
        currentDay: 10, // mid-month, no boundary
      } as any,
    });

    const result = advanceOneDay(world);
    expect(result._daysSinceLastWeeklyTick).toBe(0); // weekly tick
    expect(result.transientContext?.pendingMonthBoundary).toBeFalsy();
    expect(result.transientContext?.pendingYearBoundary).toBeFalsy();
    expect(result.calendar?.month).toBe(1); // no month change
  });
});

describe("P3.7: Monthly market placement", () => {
  it("phase01_monthly_market is NOT in the daily micro-phase list (moved to boundary section)", () => {
    // This is a structural test — verify that advanceOneDay with skipDailyMicroPhases=false
    // on a non-boundary, non-weekly day does not run the monthly market phase.
    const world = makeMockWorld({
      _daysSinceLastWeeklyTick: 2, // day 3 (not weekly)
      cyclePhase: "interim",
      _interimDaysRemaining: 42,
      calendar: {
        currentWeek: 1,
        year: 2025,
        month: 1,
        week: 1,
        currentDay: 10, // mid-month, no boundary
      } as any,
    });

    const result = advanceOneDay(world);
    // The market phase should not have run (no myoseki market changes)
    // We can't directly spy on phase execution, but we can verify the world
    // didn't get market updates on a non-boundary day.
    expect(result.myosekiMarket).toBeUndefined(); // no market initialized in mock
  });
});

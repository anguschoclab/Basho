/**
 * v18EventTime.test.ts
 * ====================
 * V18 failing-first regression pin: events logged during an active basho
 * carry calendar-month coordinates instead of basho coordinates.
 *
 * logEngineEvent (src/engine/events/events.ts:94-97) derives `day` from
 * `world.calendar.currentDay` (the 1–31 calendar month day) and never sets
 * `bashoNumber` at all — even though EngineEvent declares
 * `day` ("day of the basho 1–15", types/events.ts:210) and
 * `bashoNumber?: 1..6` (:239). The UI formatter formatEventTime
 * (utils/formatters.ts:37-42) already knows the intended encoding —
 * `B{bashoNumber} D{day}` — but can never reach it because producers leave
 * bashoNumber undefined and stamp the wrong day.
 *
 * Observable bug: an event logged on Day 5 of basho #3 renders "W20"
 * (calendar week) instead of "B3 D5", and e.day === 20 violates the
 * documented 1–15 basho-day range that any day-scoped consumer relies on.
 */
import { describe, it, expect } from "vitest";
import { logEngineEvent } from "@/engine/events/events";
import { formatEventTime } from "@/engine/utils/formatters";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

describe("V18-E1 — events during active_basho carry basho day and bashoNumber", () => {
  it("stamps basho-day (1-15) and bashoNumber, not calendar month-day", () => {
    const basho = MockFactory.createBasho({ day: 5, bashoNumber: 3 });
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      currentBasho: basho,
      calendar: { currentWeek: 20, month: 5, currentDay: 20 },
    });

    const ev = logEngineEvent(world, {
      type: "BOUT_RESOLVED",
      category: "basho",
      phase: "basho_day",
      title: "Day 5 bout resolved",
      summary: "s",
      data: {},
    });

    expect(ev).toBeDefined();
    // FAILS today: bashoNumber is never populated by the producer.
    expect(ev!.bashoNumber).toBe(3);
    // FAILS today: day is the calendar month-day (20), not the basho day (5).
    expect(ev!.day).toBe(5);
    expect(ev!.day).toBeLessThanOrEqual(15);
    // FAILS today: renders "W20" instead of "B3 D5".
    expect(formatEventTime(ev!)).toBe("B3 D5");
  });

  it("non-basho events keep week-based coordinates (control)", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "interim",
      currentBasho: undefined,
      calendar: { currentWeek: 40, month: 8 },
    });

    const ev = logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      phase: "weekly",
      title: "Offseason event",
      summary: "s",
      data: {},
    });

    expect(ev).toBeDefined();
    // No active basho → no basho coordinates. Passing today and after fix.
    expect(ev!.bashoNumber).toBeUndefined();
    expect(formatEventTime(ev!)).toBe("W40");
  });
});

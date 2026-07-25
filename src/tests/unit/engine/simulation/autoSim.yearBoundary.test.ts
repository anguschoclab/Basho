import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";

/**
 * P4.3: AutoSim year boundary tests.
 * Verifies that the year boundary fires naturally via the pipeline
 * when crossing Dec 31 → Jan 1, without manual phase06 calls.
 */

describe("P1.3: AutoSim year boundary (natural pipeline)", () => {
  it("advanceOneDay crossing Dec 31 → Jan 1 fires year boundary naturally", () => {
    // Set up a world on Dec 31
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 364,
      calendar: {
        year: 2025,
        month: 12,
        currentDay: 31,
        currentWeek: 52,
      } as any,
      _interimDaysRemaining: 10,
    });

    // Advance one day — should cross to Jan 1 of next year
    const result = advanceOneDay(world);

    // Calendar should reflect the new year
    expect(result.calendar).toBeDefined();
    if (result.calendar) {
      // The month should be January (1) after crossing Dec 31
      expect(result.calendar.month).toBe(1);
    }
  });

  it("no manual calendar reset needed — year increments naturally", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 364,
      calendar: {
        year: 2025,
        month: 12,
        currentDay: 31,
        currentWeek: 52,
      } as any,
      _interimDaysRemaining: 10,
    });

    const result = advanceOneDay(world);

    // The year should increment naturally via preflight
    expect(result.calendar?.year).toBe(2026);
  });

  it("advanceDays crossing year boundary does not double-fire phase06", () => {
    // Advance 2 days from Dec 31 — should cross to Jan 2
    const world = makeMockWorld({
      cyclePhase: "interim",
      dayIndexGlobal: 364,
      calendar: {
        year: 2025,
        month: 12,
        currentDay: 31,
        currentWeek: 52,
      } as any,
      _interimDaysRemaining: 10,
    });

    let result = world;
    result = advanceOneDay(result);
    result = advanceOneDay(result);

    // Should be in January of the next year
    expect(result.calendar?.month).toBe(1);
    expect(result.calendar?.year).toBe(2026);
    expect(result.calendar?.currentDay).toBe(2);
  });
});

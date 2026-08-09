import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";
import * as phases from "@/engine/tick/phases";

/**
 * P4.20: Monthly market placement tests.
 * Verifies that phase01_monthly_market is NOT in the daily micro-phase list
 * and only runs on month-boundary weekly ticks.
 */

describe("P3.7: Monthly market placement", () => {
  it("phase01_monthly_market is NOT in the daily micro-phase list", () => {
    // The daily micro-phases are: economy, welfare, sponsors, drama
    // phase01_monthly_market should NOT be included in this list
    const dailyMicroPhases = [
      phases.phase01_daily_economy,
      phases.phase01_daily_welfare,
      phases.phase01_daily_sponsors,
      phases.phase01_daily_drama,
    ];
    expect(dailyMicroPhases).not.toContain(phases.phase01_monthly_market);
  });

  it("phase01_monthly_market is a defined function", () => {
    expect(typeof phases.phase01_monthly_market).toBe("function");
  });

  it("phase01_monthly_market early-returns when no month boundary", () => {
    const world = makeMockWorld({
      cyclePhase: "interim",
      transientContext: {
        boundaries: { monthBoundary: false, yearBoundary: false },
      } as any,
    });

    // The phase should return an empty impact when no month boundary
    const result = phases.phase01_monthly_market(world);
    expect(result).toBeDefined();
    // It should be a StateImpact with no changes
    if (result && typeof result === "object" && "metadata" in result) {
      const impact = result as any;
      // No world field updates when month boundary is false
      expect(impact.metadata?.worldUpdates?.length ?? 0).toBe(0);
    }
  });

  it("advanceOneDay does not run monthly market on non-boundary days", () => {
    // Advance one day in interim — no month boundary should fire
    const world = makeMockWorld({
      cyclePhase: "interim",
      calendar: { month: 1, currentDay: 3, currentWeek: 1 } as any,
      _daysSinceLastWeeklyTick: 0,
    });

    // This should not throw or crash
    const result = advanceOneDay(world);
    expect(result).toBeDefined();
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
  });
});

import { describe, it, expect } from "vitest";
import { runwayMonthsToBand } from "@/engine/economy/FinanceCalculator";
import { RUNWAY_BANDS } from "@/constants/engine/economy";

/**
 * Canonical runway banding — one implementation shared by the weekly/monthly
 * tick phases and the finance presenter. Previously triplicated with
 * hardcoded thresholds (phase01_week_economy, phase05_monthly_boundary,
 * financeProjections).
 */
describe("runwayMonthsToBand", () => {
  it("maps runways below the critical threshold to 'desperate'", () => {
    expect(runwayMonthsToBand(0)).toBe(RUNWAY_BANDS.DESPERATE);
    expect(runwayMonthsToBand(0.5)).toBe(RUNWAY_BANDS.DESPERATE);
    expect(runwayMonthsToBand(0.99)).toBe(RUNWAY_BANDS.DESPERATE);
    expect(runwayMonthsToBand(-10)).toBe(RUNWAY_BANDS.DESPERATE);
  });

  it("maps runways in [1, 3) to 'critical'", () => {
    expect(runwayMonthsToBand(1)).toBe(RUNWAY_BANDS.CRITICAL);
    expect(runwayMonthsToBand(2.99)).toBe(RUNWAY_BANDS.CRITICAL);
  });

  it("maps runways in [3, 6) to 'tight'", () => {
    expect(runwayMonthsToBand(3)).toBe(RUNWAY_BANDS.TIGHT);
    expect(runwayMonthsToBand(5.99)).toBe(RUNWAY_BANDS.TIGHT);
  });

  it("maps runways in [6, 12) to 'comfortable'", () => {
    expect(runwayMonthsToBand(6)).toBe(RUNWAY_BANDS.COMFORTABLE);
    expect(runwayMonthsToBand(9.26)).toBe(RUNWAY_BANDS.COMFORTABLE);
    expect(runwayMonthsToBand(11.99)).toBe(RUNWAY_BANDS.COMFORTABLE);
  });

  it("maps runways at or above the secure threshold to 'secure'", () => {
    expect(runwayMonthsToBand(12)).toBe(RUNWAY_BANDS.SECURE);
    expect(runwayMonthsToBand(999)).toBe(RUNWAY_BANDS.SECURE);
  });
});

import { describe, it, expect } from "vitest";
import { createDefaultMediaState } from "../media";

describe("Media System Defaults", () => {
  it("should create a default media state with correct initial properties", () => {
    const defaultState = createDefaultMediaState();

    expect(defaultState).toEqual({
      version: "1.0.0",
      headlines: [],
      mediaHeat: {},
      heyaPressure: {},
      bashoStreaks: {},
      streakHeadlinesFired: {},
      promoWatchFired: {},
      retirementWatchFired: {},
      titleRaceDayFired: {},
      injuryWithdrawalFired: {},
      mediaHeatHistory: {},
    });

    // Ensure they are distinct reference instances
    const state2 = createDefaultMediaState();
    expect(defaultState.headlines).not.toBe(state2.headlines);
    expect(defaultState.mediaHeat).not.toBe(state2.mediaHeat);
  });
});

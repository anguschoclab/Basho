import { describe, it, expect } from "vitest";
import { advanceOffSeason } from "@/engine/simulation/AutoSimService";
import { makeMockWorld } from "@tests/unit/engine/utils";

/**
 * AutoSim kyushu tail (audit v14): after kyushu the world must tick until
 * the deferred yearly-boundary phase rolls `world.year`. The calendar has
 * drifted ahead of the batch-sim basho cycle, so that boundary lands inside
 * the upcoming basho's active window — ticking through it as `active_basho`
 * resolves real pipeline bout days (injuries, fatigue, kimarite, awards)
 * that `simulateEntireBasho` then replays. The tail must hold the world out
 * of active_basho while still rolling the year.
 */
describe("advanceOffSeason — kyushu year-roll tail", () => {
  it("rolls world.year without entering active_basho or running bout days", () => {
    // Kyushu just concluded. Calendar is mid-November, so the Dec→Jan
    // boundary lands ~52 days into the off-season — inside the tail
    // (post_basho 7 + interim 42 = 49) and past the pre_basho→active_basho
    // transition on tail day 1.
    const world = makeMockWorld({
      year: 2026,
      cyclePhase: "post_basho",
      currentBashoName: "hatsu",
      calendar: { month: 11, currentDay: 10, currentWeek: 46 } as never,
      _autonomousSim: true,
    });

    const result = advanceOffSeason(world, "kyushu");

    // The year roll still happened — the deferred yearly boundary fires on
    // its weekly tick regardless of cyclePhase.
    expect(result.year).toBe(2027);
    // But the tail must not have flipped into the next basho: no
    // initializeBasho ran and no bout days were resolved ahead of
    // simulateEntireBasho.
    expect(result.cyclePhase).not.toBe("active_basho");
    expect(result.currentBasho).toBeUndefined();
  });
});

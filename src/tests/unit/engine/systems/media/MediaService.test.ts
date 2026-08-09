import { describe, it, expect } from "vitest";
import {
  createDefaultMediaState,
  resetBashoMediaTracking,
  snapshotMediaHeatForBasho,
} from "@/engine/systems/media/MediaService";
import type { MediaState } from "@/engine/types/media";

describe("MediaService.createDefaultMediaState", () => {
  it("creates a state with empty defaults", () => {
    const state = createDefaultMediaState();
    expect(state.version).toBe("1.0.0");
    expect(state.headlines).toEqual([]);
    expect(state.mediaHeat).toEqual({});
    expect(state.mediaHeatHistory).toEqual({});
    expect(state.heyaPressure).toEqual({});
    expect(state.bashoStreaks).toEqual({});
    expect(state.absenceAnnouncements).toEqual([]);
  });
});

describe("MediaService.resetBashoMediaTracking", () => {
  it("resets basho-scoped tracking fields", () => {
    const state: MediaState = {
      ...createDefaultMediaState(),
      bashoStreaks: { "r1": 3 },
      streakHeadlinesFired: { "r1-hatsu": [1] },
      promoWatchFired: { "r1": true },
      retirementWatchFired: { "r2": true },
      titleRaceDayFired: { 15: true },
      injuryWithdrawalFired: { "r3": true },
    };
    const reset = resetBashoMediaTracking(state);
    expect(reset.bashoStreaks).toEqual({});
    expect(reset.streakHeadlinesFired).toEqual({});
    expect(reset.promoWatchFired).toEqual({});
    expect(reset.retirementWatchFired).toEqual({});
    expect(reset.titleRaceDayFired).toEqual({});
    expect(reset.injuryWithdrawalFired).toEqual({});
  });

  it("preserves non-basho-scoped fields", () => {
    const state: MediaState = {
      ...createDefaultMediaState(),
      headlines: [{ id: "h1", week: 1, title: "Test", subtitle: "", tier: "minor", beat: "daily_bout", tone: "neutral", rikishiIds: [], heyaIds: [], impact: 5, tags: [] } as any],
      mediaHeat: { "r1": 50 },
    };
    const reset = resetBashoMediaTracking(state);
    expect(reset.headlines).toEqual(state.headlines);
    expect(reset.mediaHeat).toEqual(state.mediaHeat);
  });
});

describe("MediaService.snapshotMediaHeatForBasho", () => {
  it("snapshots current heat values to history", () => {
    const state: MediaState = {
      ...createDefaultMediaState(),
      mediaHeat: { "r1": 60, "r2": 30 },
    };
    const snapshotted = snapshotMediaHeatForBasho(state, "hatsu");
    expect(snapshotted.mediaHeatHistory["r1"]).toHaveLength(1);
    expect(snapshotted.mediaHeatHistory["r1"][0].basho).toBe("hatsu");
    expect(snapshotted.mediaHeatHistory["r1"][0].heat).toBe(60);
    expect(snapshotted.mediaHeatHistory["r2"]).toHaveLength(1);
    expect(snapshotted.mediaHeatHistory["r2"][0].heat).toBe(30);
  });

  it("updates existing snapshot for same basho instead of duplicating", () => {
    const state: MediaState = {
      ...createDefaultMediaState(),
      mediaHeat: { "r1": 60 },
      mediaHeatHistory: { "r1": [{ basho: "hatsu", heat: 40 }] },
    };
    const snapshotted = snapshotMediaHeatForBasho(state, "hatsu");
    expect(snapshotted.mediaHeatHistory["r1"]).toHaveLength(1);
    expect(snapshotted.mediaHeatHistory["r1"][0].heat).toBe(60);
  });

  it("appends new snapshot for different basho", () => {
    const state: MediaState = {
      ...createDefaultMediaState(),
      mediaHeat: { "r1": 70 },
      mediaHeatHistory: { "r1": [{ basho: "hatsu", heat: 40 }] },
    };
    const snapshotted = snapshotMediaHeatForBasho(state, "haru");
    expect(snapshotted.mediaHeatHistory["r1"]).toHaveLength(2);
    expect(snapshotted.mediaHeatHistory["r1"][1].basho).toBe("haru");
    expect(snapshotted.mediaHeatHistory["r1"][1].heat).toBe(70);
  });

  it("caps history at 10 entries", () => {
    const state: MediaState = {
      ...createDefaultMediaState(),
      mediaHeat: { "r1": 50 },
      mediaHeatHistory: {
        "r1": Array.from({ length: 12 }, (_, i) => ({ basho: `b${i}`, heat: i * 5 })),
      },
    };
    const snapshotted = snapshotMediaHeatForBasho(state, "new");
    expect(snapshotted.mediaHeatHistory["r1"].length).toBeLessThanOrEqual(10);
  });

  it("handles empty mediaHeat gracefully", () => {
    const state = createDefaultMediaState();
    const snapshotted = snapshotMediaHeatForBasho(state, "hatsu");
    expect(snapshotted.mediaHeatHistory).toEqual({});
  });
});

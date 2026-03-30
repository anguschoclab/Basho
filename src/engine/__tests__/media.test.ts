import { describe, it, expect } from "vitest";
import { buildMediaDigest, MediaState, MediaHeadline } from "../media";
import { WorldState } from "../types/world";
import { Rikishi } from "../types/rikishi";
import { Heya } from "../types/heya";

function createMockWorld(): WorldState {
  const world = {
    week: 10,
    rikishi: new Map<string, Rikishi>(),
    heyas: new Map<string, Heya>(),
  } as unknown as WorldState;
  return world;
}

function createMockMediaState(): MediaState {
  return {
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
  };
}

describe("media: buildMediaDigest", () => {
  it("returns an empty digest when state is empty", () => {
    const world = createMockWorld();
    const state = createMockMediaState();

    const digest = buildMediaDigest({ state, world });

    expect(digest.week).toBe(10);
    expect(digest.topHeadlines).toEqual([]);
    expect(digest.notableRikishi).toEqual([]);
    expect(digest.heyaPressure).toEqual([]);
  });

  it("filters headlines by the specified week and applies limits/sorting", () => {
    const world = createMockWorld();
    const state = createMockMediaState();

    // Add multiple headlines across different weeks
    state.headlines = [
      { id: "h1", week: 9, impact: 100 } as MediaHeadline,
      { id: "h2", week: 10, impact: 50 } as MediaHeadline,
      { id: "h3", week: 10, impact: 80 } as MediaHeadline,
      { id: "h4", week: 10, impact: 20 } as MediaHeadline,
      { id: "h5", week: 11, impact: 90 } as MediaHeadline,
    ];

    const digest = buildMediaDigest({ state, world, week: 10, limit: 2 });

    expect(digest.week).toBe(10);
    // Should only have week 10, sorted by impact desc, limited to 2
    expect(digest.topHeadlines).toHaveLength(2);
    expect(digest.topHeadlines[0].id).toBe("h3"); // impact 80
    expect(digest.topHeadlines[1].id).toBe("h2"); // impact 50
  });

  it("handles sorting fallback via stableTieBreak when impact is identical", () => {
    const world = createMockWorld();
    const state = createMockMediaState();

    state.headlines = [
      { id: "headlineB", week: 5, impact: 60 } as MediaHeadline,
      { id: "headlineA", week: 5, impact: 60 } as MediaHeadline,
      { id: "headlineC", week: 5, impact: 60 } as MediaHeadline,
    ];

    const digest = buildMediaDigest({ state, world, week: 5 });

    expect(digest.topHeadlines).toHaveLength(3);
    // Should fall back to stableTieBreak on ID
    expect(digest.topHeadlines[0].id).toBe("headlineA");
    expect(digest.topHeadlines[1].id).toBe("headlineB");
    expect(digest.topHeadlines[2].id).toBe("headlineC");
  });

  it("sorts and maps notableRikishi correctly, assigning appropriate tones based on heat", () => {
    const world = createMockWorld();
    world.rikishi.set("r1", { shikona: "Hot Rikishi" } as Rikishi);
    world.rikishi.set("r2", { shikona: "Warm Rikishi" } as Rikishi);
    world.rikishi.set("r3", { shikona: "Cool Rikishi" } as Rikishi);
    world.rikishi.set("r4", { shikona: "Cold Rikishi" } as Rikishi);
    world.rikishi.set("r5", { shikona: "Another Rikishi" } as Rikishi);
    world.rikishi.set("r6", { shikona: "Ignored Rikishi" } as Rikishi);

    const state = createMockMediaState();
    state.mediaHeat = {
      "r1": 80, // >= 70 = hype
      "r2": 50, // >= 40 = praise
      "r3": 30, // < 40 = neutral
      "r4": 10,
      "r5": 45,
      "r6": 5, // 6th, should be excluded by top-5 limit
    };

    const digest = buildMediaDigest({ state, world });

    expect(digest.notableRikishi).toHaveLength(5);

    // Check sorting
    expect(digest.notableRikishi[0].rikishiId).toBe("r1");
    expect(digest.notableRikishi[1].rikishiId).toBe("r2");
    expect(digest.notableRikishi[2].rikishiId).toBe("r5");
    expect(digest.notableRikishi[3].rikishiId).toBe("r3");
    expect(digest.notableRikishi[4].rikishiId).toBe("r4");

    // Check mapping & tones
    expect(digest.notableRikishi[0]).toEqual({ rikishiId: "r1", shikona: "Hot Rikishi", heat: 80, tone: "hype" });
    expect(digest.notableRikishi[1]).toEqual({ rikishiId: "r2", shikona: "Warm Rikishi", heat: 50, tone: "praise" });
    expect(digest.notableRikishi[3]).toEqual({ rikishiId: "r3", shikona: "Cool Rikishi", heat: 30, tone: "neutral" });
  });

  it("handles sorting fallback via stableTieBreak for notableRikishi", () => {
    const world = createMockWorld();
    world.rikishi.set("b_rikishi", { shikona: "B Rikishi" } as Rikishi);
    world.rikishi.set("a_rikishi", { shikona: "A Rikishi" } as Rikishi);

    const state = createMockMediaState();
    state.mediaHeat = {
      "b_rikishi": 50,
      "a_rikishi": 50,
    };

    const digest = buildMediaDigest({ state, world });

    expect(digest.notableRikishi[0].rikishiId).toBe("a_rikishi");
    expect(digest.notableRikishi[1].rikishiId).toBe("b_rikishi");
  });

  it("sorts and maps heyaPressure correctly, applying top-5 limit", () => {
    const world = createMockWorld();
    world.heyas.set("h1", { name: "High Pressure Heya" } as Heya);
    world.heyas.set("h2", { name: "Med Pressure Heya" } as Heya);
    world.heyas.set("h3", { name: "Low Pressure Heya" } as Heya);
    world.heyas.set("h4", { name: "Safe Heya" } as Heya);
    world.heyas.set("h5", { name: "Another Heya" } as Heya);
    world.heyas.set("h6", { name: "Ignored Heya" } as Heya);

    const state = createMockMediaState();
    state.heyaPressure = {
      "h1": 90,
      "h2": 60,
      "h3": 40,
      "h4": 20,
      "h5": 50,
      "h6": 10,
    };

    const digest = buildMediaDigest({ state, world });

    expect(digest.heyaPressure).toHaveLength(5);

    // Check sorting
    expect(digest.heyaPressure[0].heyaId).toBe("h1");
    expect(digest.heyaPressure[1].heyaId).toBe("h2");
    expect(digest.heyaPressure[2].heyaId).toBe("h5");
    expect(digest.heyaPressure[3].heyaId).toBe("h3");
    expect(digest.heyaPressure[4].heyaId).toBe("h4");

    // Check mapping
    expect(digest.heyaPressure[0]).toEqual({ heyaId: "h1", name: "High Pressure Heya", pressure: 90 });
  });

  it("handles sorting fallback via stableTieBreak for heyaPressure", () => {
    const world = createMockWorld();
    world.heyas.set("b_heya", { name: "B Heya" } as Heya);
    world.heyas.set("a_heya", { name: "A Heya" } as Heya);

    const state = createMockMediaState();
    state.heyaPressure = {
      "b_heya": 70,
      "a_heya": 70,
    };

    const digest = buildMediaDigest({ state, world });

    expect(digest.heyaPressure[0].heyaId).toBe("a_heya");
    expect(digest.heyaPressure[1].heyaId).toBe("b_heya");
  });
});

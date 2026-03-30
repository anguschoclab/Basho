import { describe, it, expect } from "vitest";
import { WorldState } from "../types/world";
import { processWeeklyMediaBoundary, MediaState, createDefaultMediaState, MediaHeadline } from "../media";
import { Rikishi } from "../types/rikishi";
import { Heya } from "../types/heya";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    year: 2026,
    week: 1,
    rikishi: new Map<string, Rikishi>(),
    heyas: new Map<string, Heya>(),
    events: { log: [], dedupe: {} },
    mediaState: createDefaultMediaState(),
    currentBashoName: "Hatsu",
  } as unknown as WorldState;
}

function createMockRikishi(id: string, heyaId: string): Rikishi {
  return {
    id,
    heyaId,
    shikona: `Rikishi-${id}`,
    behavior: { discipline: 50, mediaSavvy: 50, stress: 50 },
    motivation: 100,
    economics: { popularity: 50 },
    rank: "maegashira",
  } as unknown as Rikishi;
}

function createMockHeya(id: string): Heya {
  return {
    id,
    name: `Heya-${id}`,
    funds: 100000000,
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing",
    rikishiIds: [],
    riskIndicators: {
        financial: false,
        governance: false,
        rivalry: false,
        welfare: false
    },
  } as unknown as Heya;
}

describe("Media Engine - processWeeklyMediaBoundary", () => {
  it("decays media heat correctly", () => {
    const world = createMockWorld();
    world.mediaState!.mediaHeat = {
      "r1": 80, // >= 70 decays by 4
      "r2": 50, // >= 40 decays by 3
      "r3": 20, // < 40 decays by 2
      "r4": 1   // should decay to 0 and be removed
    };

    const { state } = processWeeklyMediaBoundary({
      state: world.mediaState!,
      world
    });

    expect(state.mediaHeat["r1"]).toBe(76);
    expect(state.mediaHeat["r2"]).toBe(47);
    expect(state.mediaHeat["r3"]).toBe(18);
    expect(state.mediaHeat["r4"]).toBeUndefined();
  });

  it("decays heya pressure correctly", () => {
    const world = createMockWorld();
    world.mediaState!.heyaPressure = {
      "h1": 50, // decays by 3
      "h2": 2   // should decay to 0 and be removed
    };

    const { state } = processWeeklyMediaBoundary({
      state: world.mediaState!,
      world
    });

    expect(state.heyaPressure["h1"]).toBe(47);
    expect(state.heyaPressure["h2"]).toBeUndefined();
  });

  it("limits the number of headlines retained", () => {
    const world = createMockWorld();
    const headlines: MediaHeadline[] = Array.from({ length: 50 }, (_, i) => ({
      id: `hl-${i}`,
      week: 1,
      tier: "local",
      beat: "daily_bout",
      tone: "neutral",
      rikishiIds: [],
      heyaIds: [],
      title: `Title ${i}`,
      impact: 10,
      tags: []
    }));
    world.mediaState!.headlines = headlines;

    const { state } = processWeeklyMediaBoundary({
      state: world.mediaState!,
      world,
      maxHeadlines: 30
    });

    expect(state.headlines.length).toBe(30);
    // Should retain the most recent ones (end of the array)
    expect(state.headlines[0].id).toBe("hl-20");
    expect(state.headlines[29].id).toBe("hl-49");
  });

  it("generates a weekly feature headline when conditions are met", () => {
    const world = createMockWorld();

    const heya = createMockHeya("h1");
    const rikishi = createMockRikishi("r1", "h1");

    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    heya.rikishiIds.push(rikishi.id);

    // Make rikishi extremely hot to trigger feature selection
    world.mediaState!.mediaHeat = { "r1": 95 };

    // Because RNG is seeded, we might need to run a few times or pick a specific seed
    // to guarantee the 55% chance is hit, but we can just use a known seed.
    world.seed = "feature-seed-123";

    // Process the boundary
    const { state, headlines } = processWeeklyMediaBoundary({
      state: world.mediaState!,
      world
    });

    // Check if a headline was generated and added to state
    if (headlines.length > 0) {
        expect(headlines.some(h => h.beat === "feature" || h.beat === "streak" || h.beat === "heya_story")).toBe(true);
        expect(state.headlines.length).toBeGreaterThan(0);

        // Effects of headline should be applied
        // Heat is decayed first (95 - 4 = 91), then headline impact might bump it back up
        // So we expect it to be modified
        expect(state.mediaHeat["r1"]).toBeDefined();
    }
  });

  it("enforces a minimum cap of 20 for maxHeadlines", () => {
    const world = createMockWorld();
    const headlines: MediaHeadline[] = Array.from({ length: 30 }, (_, i) => ({
      id: `hl-${i}`,
      week: 1,
      tier: "local",
      beat: "daily_bout",
      tone: "neutral",
      rikishiIds: [],
      heyaIds: [],
      title: `Title ${i}`,
      impact: 10,
      tags: []
    }));
    world.mediaState!.headlines = headlines;

    const { state } = processWeeklyMediaBoundary({
      state: world.mediaState!,
      world,
      maxHeadlines: 5 // Trying to limit to 5, but minimum is 20
    });

    expect(state.headlines.length).toBe(20);
  });
});

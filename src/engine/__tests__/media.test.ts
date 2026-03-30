import { describe, it, expect } from "vitest";
import { updateMediaFromBout, createDefaultMediaState } from "../media";
import { WorldState, BashoState } from "../types/world";
import { BoutResult } from "../types/combat";
import { Rikishi } from "../types/rikishi";

describe("Media Engine - updateMediaFromBout", () => {
  it("should generate headlines from a basic bout", () => {
    const world = {
      week: 1,
      rikishi: new Map<string, Rikishi>([
        ["r1", { id: "r1", shikona: "Rikishi A", rank: "maegashira", heyaId: "h1" } as Rikishi],
        ["r2", { id: "r2", shikona: "Rikishi B", rank: "maegashira", heyaId: "h2" } as Rikishi],
      ]),
      seed: "test-seed"
    } as unknown as WorldState;

    const state = createDefaultMediaState();

    const result: BoutResult = {
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      upset: false,
      log: []
    };

    const out = updateMediaFromBout({ state, world, result, day: 1 });

    expect(out.headlines.length).toBeGreaterThan(0);
    const mainHeadline = out.headlines[0];
    expect(mainHeadline.beat).toBe("daily_bout");
    expect(mainHeadline.rikishiIds).toContain("r1");
    expect(mainHeadline.rikishiIds).toContain("r2");

    // Check heat application
    expect(out.state.mediaHeat["r1"]).toBeGreaterThan(0);
    expect(out.state.mediaHeat["r2"]).toBeGreaterThan(0);
  });

  it("should generate a higher impact upset headline", () => {
    const world = {
      week: 1,
      rikishi: new Map<string, Rikishi>([
        ["r1", { id: "r1", shikona: "Rikishi A", rank: "maegashira", heyaId: "h1" } as Rikishi],
        ["r2", { id: "r2", shikona: "Rikishi B", rank: "yokozuna", heyaId: "h2" } as Rikishi],
      ]),
      seed: "test-seed"
    } as unknown as WorldState;

    const state = createDefaultMediaState();

    const result: BoutResult = {
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      upset: true,
      log: []
    };

    const out = updateMediaFromBout({ state, world, result, day: 1 });

    expect(out.headlines.length).toBeGreaterThan(0);
    const mainHeadline = out.headlines[0];
    expect(mainHeadline.beat).toBe("upset");
    expect(mainHeadline.impact).toBeGreaterThan(20);
  });

  it("should trigger title race headlines on day 12+", () => {
      const world = {
        week: 1,
        currentBashoName: "Hatsu",
        currentBasho: {
            standings: new Map([
                ["r1", { wins: 11, losses: 1 }],
                ["r2", { wins: 11, losses: 1 }],
                ["r3", { wins: 10, losses: 2 }]
            ])
        } as unknown as BashoState,
        rikishi: new Map<string, Rikishi>([
          ["r1", { id: "r1", shikona: "Rikishi A", rank: "maegashira", heyaId: "h1" } as Rikishi],
          ["r2", { id: "r2", shikona: "Rikishi B", rank: "yokozuna", heyaId: "h2" } as Rikishi],
          ["r3", { id: "r3", shikona: "Rikishi C", rank: "ozeki", heyaId: "h2" } as Rikishi],
        ]),
        seed: "test-seed-title-race"
      } as unknown as WorldState;

      const state = createDefaultMediaState();

      const result: BoutResult = {
        winnerRikishiId: "r1",
        loserRikishiId: "r3", // r1 beats r3
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        upset: false,
        log: []
      };

      const out = updateMediaFromBout({ state, world, result, day: 12 });

      const titleHeadline = out.headlines.find(h => h.beat === "title_race");
      expect(titleHeadline).toBeDefined();
      expect(titleHeadline?.rikishiIds).toContain("r1");
      expect(titleHeadline?.rikishiIds).toContain("r2");
      expect(out.state.titleRaceDayFired[12]).toBe(true);
  });

  it("should trigger kachi-koshi promotion watch headlines for maegashira", () => {
    const world = {
      week: 1,
      basho: {
          standings: new Map([
              ["r1", { wins: 8, losses: 5 }], // 8 wins!
              ["r2", { wins: 5, losses: 8 }],
          ])
      } as unknown as BashoState,
      rikishi: new Map<string, Rikishi>([
        ["r1", { id: "r1", shikona: "Rikishi A", rank: "maegashira", heyaId: "h1" } as Rikishi],
        ["r2", { id: "r2", shikona: "Rikishi B", rank: "maegashira", heyaId: "h2" } as Rikishi],
      ]),
      seed: "test-seed-promo-kk"
    } as unknown as WorldState;

    const state = createDefaultMediaState();

    const result: BoutResult = {
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      upset: false,
      log: []
    };

    const out = updateMediaFromBout({ state, world, result, day: 13 });

    const promoHeadline = out.headlines.find(h => h.beat === "promotion_watch");
    expect(promoHeadline).toBeDefined();
    expect(promoHeadline?.rikishiIds).toContain("r1");
    expect(out.state.promoWatchFired["r1"]).toBe(true);
  });

  it("should trigger retirement watch for aging struggling rikishi", () => {
    const world = {
      week: 1,
      year: 2026,
      currentBashoName: "Hatsu",
      currentBasho: {
          standings: new Map([
              ["r1", { wins: 10, losses: 0 }],
              ["r2", { wins: 0, losses: 8 }], // 8 losses
          ])
      } as unknown as BashoState,
      rikishi: new Map<string, Rikishi>([
        ["r1", { id: "r1", shikona: "Rikishi A", rank: "maegashira", heyaId: "h1", birthYear: 2000 } as Rikishi],
        ["r2", { id: "r2", shikona: "Rikishi B", rank: "ozeki", heyaId: "h2", birthYear: 1985 } as Rikishi], // 41 years old
      ]),
      seed: "test-seed-retire"
    } as unknown as WorldState;

    const state = createDefaultMediaState();

    const result: BoutResult = {
      winnerRikishiId: "r1",
      loserRikishiId: "r2", // gets 8th loss
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      upset: true,
      log: []
    };

    const out = updateMediaFromBout({ state, world, result, day: 8 });

    const retireHeadline = out.headlines.find(h => h.beat === "retirement_watch");
    expect(retireHeadline).toBeDefined();
    expect(retireHeadline?.rikishiIds).toContain("r2");
    expect(out.state.retirementWatchFired["r2"]).toBe(true);
  });

  it("should trigger streak headlines", () => {
    const world = {
      week: 1,
      rikishi: new Map<string, Rikishi>([
        ["r1", { id: "r1", shikona: "Rikishi A", rank: "maegashira", heyaId: "h1" } as Rikishi],
        ["r2", { id: "r2", shikona: "Rikishi B", rank: "maegashira", heyaId: "h2" } as Rikishi],
      ]),
      seed: "test-seed"
    } as unknown as WorldState;

    let state = createDefaultMediaState();
    // Pre-populate streak to 4 so this win makes it 5 (a milestone)
    state.bashoStreaks["r1"] = 4;
    state.streakHeadlinesFired["r1"] = [];

    const result: BoutResult = {
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      upset: false,
      log: []
    };

    const out = updateMediaFromBout({ state, world, result, day: 5 });

    const streakHeadline = out.headlines.find(h => h.beat === "streak");
    expect(streakHeadline).toBeDefined();
    expect(streakHeadline?.title).toContain("5");
    expect(out.state.bashoStreaks["r1"]).toBe(5);
    expect(out.state.streakHeadlinesFired["r1"]).toContain(5);
    // Loser streak should be reset to 0
    expect(out.state.bashoStreaks["r2"]).toBe(0);
  });
});

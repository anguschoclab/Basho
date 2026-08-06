 
import { describe, it, expect } from "vitest";
import { projectRivalriesPage } from "@/presenters/projections/rivalriesProjections";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { RivalriesState, RivalryPairState } from "@/constants/engine/rivalry";

function makePair(
  aId: string,
  bId: string,
  heat: number,
  overrides: Partial<RivalryPairState> = {}
): RivalryPairState {
  return {
    key: `${aId}|${bId}`,
    aId,
    bId,
    heat,
    meetings: 1,
    lastMetWeek: 1,
    aWins: 0,
    bWins: 0,
    closeness: 50,
    spite: 50,
    tone: "neutral" as any,
    triggers: {},
    sameHeya: false,
    ...overrides,
  };
}

describe("projectRivalriesPage", () => {
  it("returns empty state when no rivalriesState", () => {
    const world = MockFactory.createWorld();
    world.rivalriesState = undefined;
    const result = projectRivalriesPage(world);
    expect(result.playerRivalries).toEqual([]);
    expect(result.hotRivalries).toEqual([]);
    expect(result.coolRivalries).toEqual([]);
    expect(result.stableRivalries).toEqual([]);
    expect(result.stats).toEqual({ total: 0, inferno: 0, hot: 0 });
    expect(result.heatmapData).toEqual([]);
    expect(result.playerRikishiNames).toEqual([]);
  });

  it("returns empty state when pairs is undefined", () => {
    const world = MockFactory.createWorld();
    world.rivalriesState = { version: "1.0.0", pairs: undefined as any };
    const result = projectRivalriesPage(world);
    expect(result.stats.total).toBe(0);
  });

  it("categorizes pairs into player, hot, and cool correctly", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1", "r2"];
    const world = MockFactory.createWorld();
    world.playerHeyaId = "heya1";
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {
        "r1|r3": makePair("r1", "r3", 30),
        "r4|r5": makePair("r4", "r5", 60),
        "r6|r7": makePair("r6", "r7", 20),
      },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.playerRivalries).toHaveLength(1);
    expect(result.hotRivalries).toHaveLength(1);
    expect(result.coolRivalries).toHaveLength(1);
  });

  it("counts inferno (heat >= 80) and hot (heat >= 55) correctly", () => {
    const world = MockFactory.createWorld();
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {
        "r1|r2": makePair("r1", "r2", 85),
        "r3|r4": makePair("r3", "r4", 60),
        "r5|r6": makePair("r5", "r6", 30),
      },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.stats.inferno).toBe(1);
    expect(result.stats.hot).toBe(1);
    expect(result.stats.total).toBe(3);
  });

  it("sorts by heat descending in each category", () => {
    const world = MockFactory.createWorld();
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {
        "r1|r2": makePair("r1", "r2", 30),
        "r3|r4": makePair("r3", "r4", 50),
        "r5|r6": makePair("r5", "r6", 40),
      },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.coolRivalries[0].heat).toBe(50);
    expect(result.coolRivalries[1].heat).toBe(40);
    expect(result.coolRivalries[2].heat).toBe(30);
  });

  it("builds stableRivalries from heyaRivalryPairs", () => {
    const world = MockFactory.createWorld();
    world.heyas.set("heyaA", MockFactory.createHeya("heyaA"));
    world.heyas.set("heyaB", MockFactory.createHeya("heyaB"));
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {},
      heyaRivalryPairs: {
        "heyaA|heyaB": {
          id: "heyaA|heyaB",
          heyaAId: "heyaA",
          heyaBId: "heyaB",
          heat: 70,
          aWins: 3,
          bWins: 2,
        },
      },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.stableRivalries).toHaveLength(1);
    expect(result.stableRivalries[0].aId).toBe("heyaA");
    expect(result.stableRivalries[0].bId).toBe("heyaB");
    expect(result.stableRivalries[0].heat).toBe(70);
    expect(result.stableRivalries[0].tone).toBe("rivalry");
  });

  it("maps playerRikishiNames from player heya", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1", "r2"];
    const world = MockFactory.createWorld();
    world.playerHeyaId = "heya1";
    world.heyas.set("heya1", heya);
    world.rikishi.set("r1", MockFactory.createRikishi("r1", { shikona: "Alpha" }));
    world.rikishi.set("r2", MockFactory.createRikishi("r2", { shikona: "Beta" }));
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "r1|r3": makePair("r1", "r3", 30) },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.playerRikishiNames).toContain("Alpha");
    expect(result.playerRikishiNames).toContain("Beta");
  });

  it("handles missing heyaRivalryPairs gracefully", () => {
    const world = MockFactory.createWorld();
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "r1|r2": makePair("r1", "r2", 30) },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.stableRivalries).toEqual([]);
  });

  it("totalPairs count matches number of pairs", () => {
    const world = MockFactory.createWorld();
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {
        "r1|r2": makePair("r1", "r2", 30),
        "r3|r4": makePair("r3", "r4", 60),
        "r5|r6": makePair("r5", "r6", 85),
      },
    } as RivalriesState;

    const result = projectRivalriesPage(world);
    expect(result.stats.total).toBe(3);
  });
});

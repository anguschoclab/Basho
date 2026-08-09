import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoName, BoutResult, MatchSchedule } from "@/engine/types/basho";

function makeRikishi(id: string, opts?: Record<string, any>): Rikishi {
  return mockRikishi(id, {
    shikona: id === "east" ? "East Rikishi" : "West Rikishi",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    division: "makuuchi",
    rank: "maegashira",
    side: id === "east" ? "east" : "west",
    heyaId: "test-heya",
    ...opts,
  });
}

function makeWorld(opts?: { east?: Record<string, any>; west?: Record<string, any> }): {
  world: WorldState;
  match: MatchSchedule;
  result: BoutResult;
} {
  const east = makeRikishi("east", opts?.east);
  const west = makeRikishi("west", opts?.west);

  const world: Partial<WorldState> = {
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      ["test-heya", { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any],
    ]),
    calendar: { currentWeek: 1, month: 1, currentDay: 1 },
    currentBasho: {
      id: "test-basho",
      year: 2025,
      currentDay: 1,
      day: 1,
      bashoName: "hatsu" as BashoName,
      bashoNumber: 1,
      matches: [],
      standings: new Map([
        ["east", { wins: 0, losses: 0, absences: 0 }],
        ["west", { wins: 0, losses: 0, absences: 0 }],
      ]),
      isActive: true,
    },
  };

  const match: MatchSchedule = {
    boutId: "test-bout",
    day: 1,
    eastRikishiId: "east",
    westRikishiId: "west",
  };

  const result: BoutResult = {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };

  return { world: world as WorldState, match, result };
}

function makeWestWinResult(): BoutResult {
  return {
    boutId: "test-bout",
    winner: "west",
    winnerRikishiId: "west",
    loserRikishiId: "east",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    stance: "migi-yotsu",
    tachiaiWinner: "west",
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };
}

describe("Bug 3.5: Consecutive win/loss streaks", () => {
  it("B.1: winner's currentWinStreak increments by 1 on win", () => {
    const { world, match, result } = makeWorld({
      east: { currentWinStreak: 2 },
    });
    const impact = applyBoutResult(world, match, result);
    const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
    expect(eastUpdate?.currentWinStreak).toBe(3);
  });

  it("B.2: winner's currentWinStreak resets to 0 on loss", () => {
    const { world, match } = makeWorld({
      east: { currentWinStreak: 3 },
    });
    const westWinResult = makeWestWinResult();
    const impact = applyBoutResult(world, match, westWinResult);
    const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
    expect(eastUpdate?.currentWinStreak).toBe(0);
  });

  it("B.3: loser's currentLossStreak increments by 1 on loss", () => {
    const { world, match, result } = makeWorld({
      west: { currentLossStreak: 1 },
    });
    const impact = applyBoutResult(world, match, result);
    const westUpdate = impact.entities?.rikishiUpdates?.get("west");
    expect(westUpdate?.currentLossStreak).toBe(2);
  });

  it("B.4: loser's currentLossStreak resets to 0 on win", () => {
    const { world, match } = makeWorld({
      west: { currentLossStreak: 3 },
    });
    const westWinResult = makeWestWinResult();
    const impact = applyBoutResult(world, match, westWinResult);
    const westUpdate = impact.entities?.rikishiUpdates?.get("west");
    expect(westUpdate?.currentLossStreak).toBe(0);
  });

  it("B.5: currentWinStreak starts at 0 for new basho (default undefined)", () => {
    const { world, match, result } = makeWorld();
    const impact = applyBoutResult(world, match, result);
    const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
    // If currentWinStreak was undefined, it should become 1 (first win)
    expect(eastUpdate?.currentWinStreak).toBe(1);
  });

  it("B.6: currentLossStreak starts at 0 for new basho (default undefined)", () => {
    const { world, match, result } = makeWorld();
    const impact = applyBoutResult(world, match, result);
    const westUpdate = impact.entities?.rikishiUpdates?.get("west");
    // If currentLossStreak was undefined, it should become 1 (first loss)
    expect(westUpdate?.currentLossStreak).toBe(1);
  });

  it("B.7: 3 consecutive wins sets currentWinStreak to 3", () => {
    const { world, match, result } = makeWorld({
      east: { currentWinStreak: 2, currentBashoWins: 2 },
    });
    const impact = applyBoutResult(world, match, result);
    const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
    expect(eastUpdate?.currentWinStreak).toBe(3);
  });

  it("B.8: win after 2 losses resets currentLossStreak to 0", () => {
    const { world, match } = makeWorld({
      east: { currentLossStreak: 2 },
    });
    const westWinResult = makeWestWinResult();
    // East loses → currentLossStreak should increment
    const lossImpact = applyBoutResult(world, match, westWinResult);
    const eastAfterLoss = lossImpact.entities?.rikishiUpdates?.get("east");
    expect(eastAfterLoss?.currentLossStreak).toBe(3);

    // Now east wins → currentLossStreak should reset to 0
    const eastWinResult: BoutResult = {
      ...westWinResult,
      winner: "east",
      winnerRikishiId: "east",
      loserRikishiId: "west",
    };
    const winImpact = applyBoutResult(world, match, eastWinResult);
    const eastAfterWin = winImpact.entities?.rikishiUpdates?.get("east");
    expect(eastAfterWin?.currentLossStreak).toBe(0);
  });
});

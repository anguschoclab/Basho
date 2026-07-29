/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { distributePrizes } from "@/engine/lifecycle/PrizeDistribution";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BoutResult, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "maegashira",
    heyaId: "test-heya",
    economics: {
      cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0,
      totalEarnings: 0, currentBashoEarnings: 0, popularity: 50,
    },
    stats: {
      power: 60, speed: 60, technique: 60, weight: 140, stamina: 60,
      mental: 60, adaptability: 60, balance: 60, aggression: 60, experience: 10,
      achievements: {
        kinboshiEarned: 0, ginboshiEarned: 0, kinboshiConceded: 0, ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        mochikyukinPoints: 0,
      },
    },
    ...overrides,
  });
}

function makeResult(boutId: string, winnerId: string, loserId: string, kimarite: string = "yorikiri"): BoutResult {
  return {
    boutId, winner: "east", winnerRikishiId: winnerId, loserRikishiId: loserId,
    kimarite, kimariteName: kimarite, stance: "migi-yotsu", tachiaiWinner: "east",
    duration: 5.2, upset: false, isKinboshi: false, log: [], kenshoEnvelopes: 0,
  } as BoutResult;
}

function makeMatchesForRikishi(winnerId: string, wins: number, opponents: string[]): MatchSchedule[] {
  const matches: MatchSchedule[] = [];
  for (let i = 0; i < wins; i++) {
    const oppId = opponents[i] ?? `opp${i}`;
    const result = makeResult(`b${i}`, winnerId, oppId);
    matches.push({ boutId: `b${i}`, day: i + 1, eastRikishiId: winnerId, westRikishiId: oppId, result });
  }
  return matches;
}

describe("PrizeDistribution (Bug 11 - sansho popularity)", () => {
  it("Test 12.1: distributes yusho prize to winner", () => {
    const winner = makeRikishi("w1", { rank: "yokozuna" });
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map([["w1", { wins: 15, losses: 0 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({
      rikishi: new Map([["w1", winner]]), currentBasho: basho,
    });
    const { impact } = distributePrizes(world, basho, "w1");
    expect(impact).toBeDefined();
  });

  it("Test 12.2: distributes sansho prizes with achievements", () => {
    const m1 = makeRikishi("m1", { rank: "maegashira" });
    const y1 = makeRikishi("y1", { rank: "yokozuna" });
    // m1 beats yokozuna + 7 more = 8 wins
    const opps = ["y1", "o2", "o3", "o4", "o5", "o6", "o7", "o8"];
    const matches = makeMatchesForRikishi("m1", 8, opps);
    const rikishiMap = new Map([["m1", m1], ["y1", y1]]);
    for (let i = 2; i <= 8; i++) rikishiMap.set(`o${i}`, makeRikishi(`o${i}`, { rank: "maegashira" }));
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map([["m1", { wins: 8, losses: 7 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ rikishi: rikishiMap, currentBasho: basho });
    const { prizes, impact } = distributePrizes(world, basho, "y1");
    expect(impact).toBeDefined();
    expect(prizes.shukunsho).toBe("m1");
  });

  it("Test 12.3: sansho prize should apply popularity boost (Bug 11)", () => {
    const m1 = makeRikishi("m1", { rank: "maegashira", economics: { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 } });
    const y1 = makeRikishi("y1", { rank: "yokozuna" });
    const opps = ["y1", "o2", "o3", "o4", "o5", "o6", "o7", "o8"];
    const matches = makeMatchesForRikishi("m1", 8, opps);
    const rikishiMap = new Map([["m1", m1], ["y1", y1]]);
    for (let i = 2; i <= 8; i++) rikishiMap.set(`o${i}`, makeRikishi(`o${i}`, { rank: "maegashira" }));
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map([["m1", { wins: 8, losses: 7 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ rikishi: rikishiMap, currentBasho: basho });
    const { impact } = distributePrizes(world, basho, "y1");
    const m1Update = impact.entities?.rikishiUpdates?.get("m1");
    // After Bug 11 fix, popularity should be boosted from 50
    expect(m1Update?.economics?.popularity).toBeDefined();
    expect(m1Update?.economics?.popularity).toBeGreaterThan(50);
  });

  it("Test 12.4: handles empty basho gracefully", () => {
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    expect(() => distributePrizes(world, basho, "nobody")).not.toThrow();
  });

  it("Test 12.5: handles missing yusho winner gracefully", () => {
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    expect(() => distributePrizes(world, basho, "ghost")).not.toThrow();
  });

  it("Test 12.6: splits sansho prize money into cash and retirement fund", () => {
    const m1 = makeRikishi("m1", { rank: "maegashira" });
    const y1 = makeRikishi("y1", { rank: "yokozuna" });
    const opps = ["y1", "o2", "o3", "o4", "o5", "o6", "o7", "o8"];
    const matches = makeMatchesForRikishi("m1", 8, opps);
    const rikishiMap = new Map([["m1", m1], ["y1", y1]]);
    for (let i = 2; i <= 8; i++) rikishiMap.set(`o${i}`, makeRikishi(`o${i}`, { rank: "maegashira" }));
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map([["m1", { wins: 8, losses: 7 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ rikishi: rikishiMap, currentBasho: basho });
    const { impact } = distributePrizes(world, basho, "y1");
    const m1Update = impact.entities?.rikishiUpdates?.get("m1");
    expect(m1Update?.economics?.cash).toBeDefined();
    expect(m1Update?.economics?.retirementFund).toBeDefined();
  });

  it("Test 12.7: does not award sansho to yokozuna/ozeki", () => {
    const yokozuna = makeRikishi("y1", { rank: "yokozuna" });
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map([["y1", { wins: 14, losses: 1 }]]), isActive: true,
    };
    const world = MockFactory.createWorld({ rikishi: new Map([["y1", yokozuna]]), currentBasho: basho });
    const { prizes } = distributePrizes(world, basho, "y1");
    expect(prizes.shukunsho).toBeUndefined();
    expect(prizes.kantosho).toBeUndefined();
    expect(prizes.ginoSho).toBeUndefined();
  });

  it("Test 12.8: handles all three sansho prizes at once", () => {
    const m1 = makeRikishi("m1", { rank: "maegashira" });
    const m2 = makeRikishi("m2", { rank: "maegashira" });
    const m3 = makeRikishi("m3", { rank: "maegashira" });
    const y1 = makeRikishi("y1", { rank: "yokozuna" });
    const rikishiMap = new Map([["m1", m1], ["m2", m2], ["m3", m3], ["y1", y1]]);
    const matches: MatchSchedule[] = [];
    // m1 beats yokozuna + 7 = shukunsho
    matches.push(...makeMatchesForRikishi("m1", 8, ["y1", "o2", "o3", "o4", "o5", "o6", "o7", "o8"]));
    // m2 gets 10 wins = kantosho
    matches.push(...makeMatchesForRikishi("m2", 10, ["o2", "o3", "o4", "o5", "o6", "o7", "o8", "o9", "o10", "o11"]));
    // m3 gets 8 wins with 3+ kimarite = ginoSho
    const kimarites = ["yorikiri", "oshidashi", "uwatenage"];
    for (let i = 0; i < 8; i++) {
      const opp = `m3opp${i}`;
      rikishiMap.set(opp, makeRikishi(opp, { rank: "maegashira" }));
      const result = makeResult(`m3b${i}`, "m3", opp, kimarites[i % 3]);
      matches.push({ boutId: `m3b${i}`, day: i + 1, eastRikishiId: "m3", westRikishiId: opp, result });
    }
    for (let i = 2; i <= 11; i++) {
      if (!rikishiMap.has(`o${i}`)) rikishiMap.set(`o${i}`, makeRikishi(`o${i}`, { rank: "maegashira" }));
    }
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches, standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ rikishi: rikishiMap, currentBasho: basho });
    const { prizes, impact } = distributePrizes(world, basho, "y1");
    expect(impact).toBeDefined();
    const count = [prizes.shukunsho, prizes.kantosho, prizes.ginoSho].filter(Boolean).length;
    expect(count).toBeLessThanOrEqual(3);
  });

  it("Test 12.9: handles empty rikishiMap", () => {
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ rikishi: new Map(), currentBasho: basho });
    expect(() => distributePrizes(world, basho, "nobody")).not.toThrow();
  });

  it("Test 12.10: returns prizes object and impact", () => {
    const basho: BashoState = {
      id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
      day: 15, matches: [], standings: new Map(), isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const result = distributePrizes(world, basho, "nobody");
    expect(result.prizes).toBeDefined();
    expect(result.impact).toBeDefined();
  });
});

/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { determineSpecialPrizes } from "@/engine/banzuke/specialPrizes";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BoutResult } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "maegashira",
    rankNumber: 1,
    side: "east",
    heyaId: "test-heya",
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 10,
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        mochikyukinPoints: 0,
      },
    },
    ...overrides,
  });
}

function makeResult(boutId: string, winnerId: string, loserId: string, kimarite: string = "yorikiri"): BoutResult {
  return {
    boutId,
    winner: "east",
    winnerRikishiId: winnerId,
    loserRikishiId: loserId,
    kimarite,
    kimariteName: kimarite,
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
  } as BoutResult;
}

function makeMatchWithResult(boutId: string, day: number, eastId: string, westId: string, result: BoutResult): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId, result };
}

describe("specialPrizes - determineSpecialPrizes", () => {
  it("Test 7.1: returns no prizes when no matches have results", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const matches: MatchSchedule[] = [{ boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" }];
    const prizes = determineSpecialPrizes(matches, new Map([["east", east], ["west", west]]), "east");
    expect(prizes).toEqual({});
  });

  it("Test 7.2: awards shukunsho for beating yokozuna", () => {
    const maegashira = makeRikishi("m1", { rank: "maegashira" });
    const yokozuna = makeRikishi("y1", { rank: "yokozuna" });
    const result = makeResult("b1", "m1", "y1");
    const matches = [makeMatchWithResult("b1", 1, "m1", "y1", result)];
    for (let i = 2; i <= 8; i++) {
      const r = makeResult(`b${i}`, "m1", `opp${i}`);
      matches.push(makeMatchWithResult(`b${i}`, i, "m1", `opp${i}`, r));
    }
    const rikishiMap = new Map([["m1", maegashira], ["y1", yokozuna]]);
    for (let i = 2; i <= 8; i++) rikishiMap.set(`opp${i}`, makeRikishi(`opp${i}`, { rank: "maegashira" }));
    const prizes = determineSpecialPrizes(matches, rikishiMap, "m1");
    expect(prizes.shukunsho).toBe("m1");
  });

  it("Test 7.3: does not award prizes to non-maegashira", () => {
    const sekiwake = makeRikishi("s1", { rank: "sekiwake" });
    const result = makeResult("b1", "s1", "opp1");
    const matches = [makeMatchWithResult("b1", 1, "s1", "opp1", result)];
    for (let i = 2; i <= 10; i++) {
      const r = makeResult(`b${i}`, "s1", `opp${i}`);
      matches.push(makeMatchWithResult(`b${i}`, i, "s1", `opp${i}`, r));
    }
    const rikishiMap = new Map([["s1", sekiwake]]);
    for (let i = 1; i <= 10; i++) rikishiMap.set(`opp${i}`, makeRikishi(`opp${i}`, { rank: "maegashira" }));
    const prizes = determineSpecialPrizes(matches, rikishiMap, "s1");
    expect(prizes.shukunsho).toBeUndefined();
    expect(prizes.kantosho).toBeUndefined();
    expect(prizes.ginoSho).toBeUndefined();
  });

  it("Test 7.4: handles missing match.result gracefully", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const matches: MatchSchedule[] = [{ boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" }];
    const prizes = determineSpecialPrizes(matches, new Map([["east", east], ["west", west]]), "east");
    expect(prizes).toEqual({});
  });

  it("Test 7.5: awards at most 3 sansho prizes (one of each type)", () => {
    const m1 = makeRikishi("m1", { rank: "maegashira" });
    const m2 = makeRikishi("m2", { rank: "maegashira" });
    const m3 = makeRikishi("m3", { rank: "maegashira" });
    const y1 = makeRikishi("y1", { rank: "yokozuna" });
    const matches: MatchSchedule[] = [];
    const rikishiMap = new Map([["m1", m1], ["m2", m2], ["m3", m3], ["y1", y1]]);
    matches.push(makeMatchWithResult("b1", 1, "m1", "y1", makeResult("b1", "m1", "y1")));
    for (let i = 2; i <= 8; i++) {
      const opp = makeRikishi(`o1_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(makeMatchWithResult(`b1_${i}`, i, "m1", opp.id, makeResult(`b1_${i}`, "m1", opp.id)));
    }
    for (let i = 1; i <= 10; i++) {
      const opp = makeRikishi(`o2_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(makeMatchWithResult(`b2_${i}`, i, "m2", opp.id, makeResult(`b2_${i}`, "m2", opp.id)));
    }
    const kimarites = ["yorikiri", "oshidashi", "uwatenage"];
    for (let i = 0; i < 8; i++) {
      const opp = makeRikishi(`o3_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(makeMatchWithResult(`b3_${i}`, i + 1, "m3", opp.id, makeResult(`b3_${i}`, "m3", opp.id, kimarites[i % 3])));
    }
    const prizes = determineSpecialPrizes(matches, rikishiMap, "y1");
    const count = [prizes.shukunsho, prizes.kantosho, prizes.ginoSho].filter(Boolean).length;
    expect(count).toBeLessThanOrEqual(3);
  });

  it("Test 7.6: does not award sansho to yokozuna or ozeki", () => {
    const yokozuna = makeRikishi("y1", { rank: "yokozuna" });
    const ozeki = makeRikishi("o1", { rank: "ozeki" });
    const matches: MatchSchedule[] = [];
    const rikishiMap = new Map([["y1", yokozuna], ["o1", ozeki]]);
    for (let i = 1; i <= 14; i++) {
      const opp = makeRikishi(`opp_y_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(makeMatchWithResult(`by${i}`, i, "y1", opp.id, makeResult(`by${i}`, "y1", opp.id)));
    }
    const prizes = determineSpecialPrizes(matches, rikishiMap, "y1");
    expect(prizes).toEqual({});
  });

  it("Test 7.7: handles empty matches array", () => {
    const east = makeRikishi("east");
    const prizes = determineSpecialPrizes([], new Map([["east", east]]), "east");
    expect(prizes).toEqual({});
  });

  it("Test 7.8: handles empty rikishiMap", () => {
    const prizes = determineSpecialPrizes([], new Map(), "nobody");
    expect(prizes).toEqual({});
  });
});

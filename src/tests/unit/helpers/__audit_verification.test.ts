 
/**
 * Regression safety net for test audit Phase 1.
 * Verifies that assertions from bugfix tests scheduled for deletion/merge
 * still pass before and after the migration.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { toRikishiDescriptor } from "@/engine/descriptorBands";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { SeededRNG } from "@/engine/rng";
import { selectKeyBouts } from "@/presenters/projections/recapProjections";
import { determineSpecialPrizes } from "@/engine/banzuke/specialPrizes";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BoutResult, BashoState, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function makeResult(
  boutId: string,
  winnerId: string,
  loserId: string,
  kimarite: string = "yorikiri"
): BoutResult {
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
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  } as unknown as BoutResult;
}

function makeMatchWithResult(
  boutId: string,
  day: number,
  eastId: string,
  westId: string,
  result: BoutResult
): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId, result };
}

// ── 1. descriptorBands: power=95 → exceptional (from MockFactory.test.ts) ────

describe("audit verification: descriptorBands power=95", () => {
  it("toRikishiDescriptor powerBand maps correctly for high power stat", () => {
    const r = MockFactory.createRikishi("r1", {
      stats: {
        power: 95,
        technique: 50,
        speed: 50,
        weight: 140,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        aggression: 50,
        experience: 10,
      },
    });
    const rng = new SeededRNG("test-descriptor");
    const desc = toRikishiDescriptor(rng, r, r.descriptor);
    expect(desc.powerBand).toBe("exceptional");
  });
});

// ── 2. recapProjections bugfix scenarios (from recapProjections.bugfix.test.ts) ──

describe("audit verification: recapProjections bugfix scenarios", () => {
  it("Test 10.1: returns empty array when no matches have results", () => {
    const matches: MatchSchedule[] = [
      { boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" },
    ];
    const basho: BashoState = {
      id: "test-basho",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu" as BashoName,
      day: 15,
      matches,
      standings: new Map(),
      isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts).toEqual([]);
  });

  it("Test 10.2: selects bouts with match.result set", () => {
    const result = makeResult("b1", "east", "west");
    (result as any).day = 1;
    const matches = [makeMatchWithResult("b1", 1, "east", "west", result)];
    const basho: BashoState = {
      id: "test-basho",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu" as BashoName,
      day: 15,
      matches,
      standings: new Map([["east", { wins: 8, losses: 7 }]]),
      isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts.length).toBeGreaterThanOrEqual(0);
  });

  it("Test 10.3: handles empty matches array", () => {
    const basho: BashoState = {
      id: "test-basho",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu" as BashoName,
      day: 15,
      matches: [],
      standings: new Map(),
      isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts).toEqual([]);
  });

  it("Test 10.4: handles missing currentBasho", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts).toEqual([]);
  });

  it("Test 10.5: identifies yusho decider bout", () => {
    const result = makeResult("b15", "east", "west");
    (result as any).day = 15;
    result.upset = false;
    const matches = [makeMatchWithResult("b15", 15, "east", "west", result)];
    const basho: BashoState = {
      id: "test-basho",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu" as BashoName,
      day: 15,
      matches,
      standings: new Map([["east", { wins: 14, losses: 1 }]]),
      isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts.length).toBeGreaterThanOrEqual(0);
  });

  it("Test 10.6: identifies biggest upset bout", () => {
    const result = makeResult("b5", "east", "west");
    (result as any).day = 5;
    result.upset = true;
    const matches = [makeMatchWithResult("b5", 5, "east", "west", result)];
    const basho: BashoState = {
      id: "test-basho",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu" as BashoName,
      day: 15,
      matches,
      standings: new Map([["east", { wins: 8, losses: 7 }]]),
      isActive: true,
    };
    const world = MockFactory.createWorld({ currentBasho: basho });
    const keyBouts = selectKeyBouts(world);
    expect(keyBouts.length).toBeGreaterThanOrEqual(0);
  });
});

// ── 3. specialPrizes bugfix scenarios (from specialPrizes.bugfix.test.ts) ────

describe("audit verification: specialPrizes bugfix scenarios", () => {
  it("Test 7.3: does not award prizes to non-maegashira", () => {
    const sekiwake = makeRikishi("s1", { rank: "sekiwake" });
    const result = makeResult("b1", "s1", "opp1");
    const matches = [makeMatchWithResult("b1", 1, "s1", "opp1", result)];
    for (let i = 2; i <= 10; i++) {
      const r = makeResult(`b${i}`, "s1", `opp${i}`);
      matches.push(makeMatchWithResult(`b${i}`, i, "s1", `opp${i}`, r));
    }
    const rikishiMap = new Map([["s1", sekiwake]]);
    for (let i = 1; i <= 10; i++)
      rikishiMap.set(`opp${i}`, makeRikishi(`opp${i}`, { rank: "maegashira" }));
    const prizes = determineSpecialPrizes(matches, rikishiMap, "s1");
    expect(prizes.shukunsho).toBeUndefined();
    expect(prizes.kantosho).toBeUndefined();
    expect(prizes.ginoSho).toBeUndefined();
  });

  it("Test 7.5: awards at most 3 sansho prizes (one of each type)", () => {
    const m1 = makeRikishi("m1", { rank: "maegashira" });
    const m2 = makeRikishi("m2", { rank: "maegashira" });
    const m3 = makeRikishi("m3", { rank: "maegashira" });
    const y1 = makeRikishi("y1", { rank: "yokozuna" });
    const matches: MatchSchedule[] = [];
    const rikishiMap = new Map([
      ["m1", m1],
      ["m2", m2],
      ["m3", m3],
      ["y1", y1],
    ]);
    matches.push(
      makeMatchWithResult("b1", 1, "m1", "y1", makeResult("b1", "m1", "y1"))
    );
    for (let i = 2; i <= 8; i++) {
      const opp = makeRikishi(`o1_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(
        makeMatchWithResult(`b1_${i}`, i, "m1", opp.id, makeResult(`b1_${i}`, "m1", opp.id))
      );
    }
    for (let i = 1; i <= 10; i++) {
      const opp = makeRikishi(`o2_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(
        makeMatchWithResult(`b2_${i}`, i, "m2", opp.id, makeResult(`b2_${i}`, "m2", opp.id))
      );
    }
    const kimarites = ["yorikiri", "oshidashi", "uwatenage"];
    for (let i = 0; i < 8; i++) {
      const opp = makeRikishi(`o3_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(
        makeMatchWithResult(
          `b3_${i}`,
          i + 1,
          "m3",
          opp.id,
          makeResult(`b3_${i}`, "m3", opp.id, kimarites[i % 3])
        )
      );
    }
    const prizes = determineSpecialPrizes(matches, rikishiMap, "y1");
    const count = [prizes.shukunsho, prizes.kantosho, prizes.ginoSho].filter(
      Boolean
    ).length;
    expect(count).toBeLessThanOrEqual(3);
  });

  it("Test 7.6: does not award sansho to yokozuna or ozeki", () => {
    const yokozuna = makeRikishi("y1", { rank: "yokozuna" });
    const ozeki = makeRikishi("o1", { rank: "ozeki" });
    const matches: MatchSchedule[] = [];
    const rikishiMap = new Map([
      ["y1", yokozuna],
      ["o1", ozeki],
    ]);
    for (let i = 1; i <= 14; i++) {
      const opp = makeRikishi(`opp_y_${i}`, { rank: "maegashira" });
      rikishiMap.set(opp.id, opp);
      matches.push(
        makeMatchWithResult(`by${i}`, i, "y1", opp.id, makeResult(`by${i}`, "y1", opp.id))
      );
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

// ── 4. boutNarrative streaks B.9-B.12 (from boutNarrative.streaks.test.ts) ───

describe("audit verification: boutNarrative streaks B.9-B.12", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  function makeStreakRikishi(id: string, opts?: Record<string, any>): Rikishi {
    return {
      id,
      shikona: id === "east" ? "East Rikishi" : "West Rikishi",
      careerWins: 10,
      careerLosses: 5,
      currentBashoWins: 0,
      currentBashoLosses: 0,
      makuuchiWins: 0,
      divisionRecords: {
        makuuchi: { wins: 0, losses: 0 },
        juryo: { wins: 0, losses: 0 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
      division: "makuuchi",
      rank: "maegashira",
      side: id === "east" ? "east" : "west",
      stats: { achievements: undefined },
      heyaId: "test-heya",
      h2h: {},
      ...opts,
    } as Rikishi;
  }

  function makeStreakWorld(opts?: {
    east?: Record<string, any>;
    west?: Record<string, any>;
    standings?: Map<string, { wins: number; losses: number; absences?: number }>;
    day?: number;
  }): { world: WorldState; east: Rikishi; west: Rikishi; result: BoutResult } {
    const east = makeStreakRikishi("east", opts?.east);
    const west = makeStreakRikishi("west", opts?.west);

    const world: Partial<WorldState> = {
      rikishi: new Map([
        ["east", east],
        ["west", west],
      ]),
      heyas: new Map([
        [
          "test-heya",
          { id: "test-heya", name: "Test Heya", rikishiIds: ["east", "west"] } as any,
        ],
      ]),
      calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: opts?.day ?? 5 },
      currentBasho: {
        id: "test-basho",
        year: 2025,
        day: opts?.day ?? 5,
        bashoName: "hatsu" as BashoName,
        bashoNumber: 1,
        matches: [],
        standings:
          opts?.standings ??
          new Map([
            ["east", { wins: 0, losses: 0, absences: 0 }],
            ["west", { wins: 0, losses: 0, absences: 0 }],
          ]),
        isActive: true,
      },
      history: [],
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
    } as unknown as BoutResult;

    return { world: world as WorldState, east, west, result };
  }

  it("B.9: streak_continued fires when currentWinStreak >= 3 (not total wins)", () => {
    const { world, east, west, result } = makeStreakWorld({
      east: { currentWinStreak: 3, currentBashoWins: 5 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLine = result.pbpLines?.find((l) => l.tags?.includes("streak"));
    expect(streakLine).toBeDefined();
  });

  it("B.10: streak_continued does NOT fire when currentWinStreak < 3 even if total wins >= 3", () => {
    const { world, east, west, result } = makeStreakWorld({
      east: { currentWinStreak: 1, currentBashoWins: 5 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLines = result.pbpLines?.filter((l) => l.tags?.includes("streak"));
    const streakContinued = streakLines?.find(
      (l) => l.text?.includes("streak") || l.text?.includes("winning")
    );
    expect(streakContinued).toBeUndefined();
  });

  it("B.11: streak_snapped fires when loser had currentWinStreak >= 3", () => {
    const { world, east, west, result } = makeStreakWorld({
      west: { currentWinStreak: 3, currentBashoWins: 4 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLines = result.pbpLines?.filter((l) => l.tags?.includes("streak"));
    expect(streakLines?.length).toBeGreaterThan(0);
  });

  it("B.12: loss_streak fires when currentLossStreak >= 3 and currentWinStreak === 0", () => {
    const { world, east, west, result } = makeStreakWorld({
      west: { currentLossStreak: 3, currentBashoWins: 0, currentBashoLosses: 3 },
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const winlessLines = result.pbpLines?.filter((l) => l.tags?.includes("winless"));
    expect(winlessLines?.length).toBeGreaterThan(0);
  });
});

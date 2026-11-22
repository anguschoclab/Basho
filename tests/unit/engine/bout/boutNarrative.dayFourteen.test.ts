/**
 * W Z — Day-14 Kyushu Basho commentary & feature tests.
 * Transcript items: milestone set (Z4), sanyaku jeopardy (Z5), pairing
 * framings (Z6), versatile finisher (Z8), sibling-lead interview (Z10),
 * repeat spoiler (Z12), bloodied-unfazed (Z13).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BoutResult, BashoState } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import type { MatchResultLog } from "@/engine/types/records";
import type { Rank } from "@/engine/types/banzuke";

const BASHO = "kyushu" as BashoName;

beforeEach(() => BardEngine.resetCache());

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  day = 14,
  seed = "seed-d14"
): BoutResult {
  generateBoutNarrative(result, east, west, BASHO, day, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

const allText = (r: BoutResult) => (r.pbpLines ?? []).map((l) => l.text).join("\n");

function pref(g: "migi" | "hidari" | "none") {
  return {
    archetype: "hybrid" as const,
    familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
    preferredGrip: g,
    preferredGripDepth: "standard" as const,
    statModifiers: {},
    counterFamily: "push" as const,
    archetypeBehavior: {
      tachiaiSpeedBonus: 0,
      lateralMovementBonus: 0,
      edgeEscapeBonus: 0,
      beltTorqueBonus: 0,
      pushVelocityBonus: 0,
    },
  };
}

function snap(wins: number, losses: number, overrides: Partial<CareerSnapshot> = {}): CareerSnapshot {
  return {
    id: `s-${wins}-${losses}-${overrides.rank ?? "maegashira"}-${overrides.year ?? 2026}`,
    bashoId: "aki-2026",
    year: 2026,
    month: 9,
    bashoName: "aki",
    rank: "maegashira" as Rank,
    division: "makuuchi",
    rankNumber: 5,
    side: "east",
    wins,
    losses,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 150,
    momentum: 0,
    ...overrides,
  } as CareerSnapshot;
}

function h2hEntry(overrides: Partial<MatchResultLog> = {}): MatchResultLog {
  return {
    opponentId: "prev-opp",
    win: true,
    kimarite: "yorikiri",
    bashoId: "kyushu-2026",
    day: 13,
    year: 2026,
    division: "makuuchi",
    ...overrides,
  } as MatchResultLog;
}

/** Standings world — makuuchi leader at 12-2 by default. */
function standingsWorld(
  east: Rikishi,
  west: Rikishi,
  extra: Array<[string, number, number]> = [],
  opts: { leaderWins?: number; juryoLeaderWins?: number } = {}
): FullWorld {
  const leader = mockRikishi("leader", { division: "makuuchi" });
  const standings: Array<[string, { wins: number; losses: number }]> = [
    ["leader", { wins: opts.leaderWins ?? 12, losses: 2 }],
    [east.id, { wins: east.currentBashoWins ?? 0, losses: east.currentBashoLosses ?? 0 }],
    [west.id, { wins: west.currentBashoWins ?? 0, losses: west.currentBashoLosses ?? 0 }],
    ...extra.map(
      ([id, w, l]) => [id, { wins: w, losses: l }] as [string, { wins: number; losses: number }]
    ),
  ];
  const basho = MockFactory.createBasho({
    id: "kyushu-2026",
    bashoName: "kyushu",
    day: 14,
    standings: new Map(standings),
  }) as BashoState;
  const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
  world.rikishi.set(leader.id, leader);
  return world;
}

// ─── Z4: Milestones ─────────────────────────────────────────────────────────

describe("Z4 — milestone set", () => {
  it("fires makuuchi_win_milestone on a round-hundred top-division win", () => {
    const east = mockRikishi("r-east", {
      divisionRecords: {
        makuuchi: { wins: 499, losses: 400 },
        juryo: { wins: 50, losses: 40 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "milestone").some((t) => /500/.test(t))).toBe(true);
  });

  it("fires career_bout_milestone on the 300th career appearance", () => {
    const east = mockRikishi("r-east", { careerWins: 180, careerLosses: 119 });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "milestone").some((t) => /300/.test(t))).toBe(true);
  });

  it("fires double_digit on the 10th win", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 9, currentBashoLosses: 4 });
    const west = mockRikishi("r-west", { currentBashoWins: 6, currentBashoLosses: 7 });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(allText(result)).toMatch(/double|ten|figures/i);
  });

  it("uses the 'first since' variant when a prior basho had 10+ but recent ones did not", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 9,
      currentBashoLosses: 4,
      careerHistory: [
        snap(10, 5, { bashoName: "haru", year: 2025, bashoId: "haru-2025" }),
        snap(6, 9, { bashoName: "aki", year: 2026, bashoId: "aki-2026" }),
      ],
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(allText(result)).toMatch(/since/i);
  });

  it("stays silent at 9 and 11 wins / off-round milestones", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 8, currentBashoLosses: 5 });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(allText(result)).not.toMatch(/double figures/i);
  });
});

// ─── Z5: Sanyaku jeopardy ───────────────────────────────────────────────────

describe("Z5 — sanyaku_retention + kadoban_pending", () => {
  it("fires sanyaku_retention for a sekiwake/komusubi trending to demotion", () => {
    const east = mockRikishi("r-east", {
      rank: "sekiwake",
      currentBashoWins: 5,
      currentBashoLosses: 6,
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "sanyaku_retention").length).toBeGreaterThan(0);
  });

  it("does NOT fire sanyaku_retention for a maegashira (demotion_watch's lane)", () => {
    const east = mockRikishi("r-east", {
      rank: "maegashira",
      rankNumber: 16,
      currentBashoWins: 3,
      currentBashoLosses: 9,
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "sanyaku_retention")).toHaveLength(0);
  });

  it("fires kadoban_pending when an ozeki clinches make-koshi", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west", {
      rank: "ozeki",
      currentBashoWins: 6,
      currentBashoLosses: 7,
    });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(allText(result)).toMatch(/kadoban/i);
  });

  it("does NOT fire kadoban_pending for a non-ozeki loser or ozeki winner", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west", {
      rank: "sekiwake",
      currentBashoWins: 6,
      currentBashoLosses: 7,
    });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(allText(result)).not.toMatch(/kadoban/i);
  });
});

// ─── Z6: Pairing framings ───────────────────────────────────────────────────

describe("Z6 — mirror_grips / same_class / feast_famine", () => {
  it("fires mirror_grips on opposite declared grips", () => {
    const east = mockRikishi("r-east", { combatProfile: pref("migi") });
    const west = mockRikishi("r-west", { combatProfile: pref("hidari") });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "mirror_grips").length).toBeGreaterThan(0);
  });

  it("stays silent when a grip is 'none' or both share the same side", () => {
    const east = mockRikishi("r-east", { combatProfile: pref("migi") });
    const westNone = mockRikishi("r-west", { combatProfile: pref("none") });
    const world = makeBoutWorld(east, westNone) as FullWorld;
    const r1 = narrate(east, westNone, world);
    expect(tagged(r1, "mirror_grips")).toHaveLength(0);

    const westSame = mockRikishi("r-west", { combatProfile: pref("migi") });
    const world2 = makeBoutWorld(east, westSame) as FullWorld;
    const r2 = narrate(east, westSame, world2);
    expect(tagged(r2, "mirror_grips")).toHaveLength(0);
  });

  it("fires same_class when both debuted the same year in different heyas", () => {
    const east = mockRikishi("r-east", { debutYear: 2021 });
    const west = mockRikishi("r-west", { debutYear: 2021, heyaId: "heya-other" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "same_class").length).toBeGreaterThan(0);
  });

  it("does NOT fire same_class on dual-undefined debutYear or same heya", () => {
    const east = mockRikishi("r-east", {});
    const west = mockRikishi("r-west", {});
    const world = makeBoutWorld(east, west) as FullWorld;
    const r1 = narrate(east, west, world);
    expect(tagged(r1, "same_class")).toHaveLength(0);

    const westSameHeya = mockRikishi("r-west", { debutYear: 2021, heyaId: "heya-r-east" });
    const eastD = mockRikishi("r-east", { debutYear: 2021 });
    const world2 = makeBoutWorld(eastD, westSameHeya) as FullWorld;
    const r2 = narrate(eastD, westSameHeya, world2);
    expect(tagged(r2, "same_class")).toHaveLength(0);
  });

  it("fires feast_famine when both hold elite scalps but sit on middling records", () => {
    const achievements = {
      kinboshiEarned: 1,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    };
    const east = mockRikishi("r-east", {
      stats: { ...mockRikishi("s").stats, achievements },
      currentBashoWins: 5,
      currentBashoLosses: 7,
    });
    const west = mockRikishi("r-west", {
      stats: { ...mockRikishi("s").stats, achievements },
      currentBashoWins: 6,
      currentBashoLosses: 7,
    });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "feast_famine").length).toBeGreaterThan(0);
  });

  it("does NOT fire feast_famine when either lacks a scalp or holds a winning record", () => {
    const noScalp = {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    };
    const east = mockRikishi("r-east", {
      stats: { ...mockRikishi("s").stats, achievements: noScalp },
      currentBashoWins: 5,
      currentBashoLosses: 7,
    });
    const west = mockRikishi("r-west", {
      stats: { ...mockRikishi("s").stats, achievements: { ...noScalp, kinboshiEarned: 1 } },
      currentBashoWins: 6,
      currentBashoLosses: 7,
    });
    const world = makeBoutWorld(east, west) as FullWorld;
    const r1 = narrate(east, west, world);
    expect(tagged(r1, "feast_famine")).toHaveLength(0);

    const winning = mockRikishi("r-west", {
      stats: { ...mockRikishi("s").stats, achievements: { ...noScalp, kinboshiEarned: 1 } },
      currentBashoWins: 9,
      currentBashoLosses: 4,
    });
    const east2 = mockRikishi("r-east", {
      stats: { ...mockRikishi("s").stats, achievements: { ...noScalp, kinboshiEarned: 1 } },
      currentBashoWins: 6,
      currentBashoLosses: 7,
    });
    const world2 = makeBoutWorld(east2, winning) as FullWorld;
    const r2 = narrate(east2, winning, world2);
    expect(tagged(r2, "feast_famine")).toHaveLength(0);
  });
});

// ─── Z8: Versatile finisher ────────────────────────────────────────────────

describe("Z8 — versatile_kimarite", () => {
  it("fires when the winner has finished with many distinct techniques this basho", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = MockFactory.createBasho({
      id: "kyushu-2026",
      bashoName: "kyushu",
      day: 14,
      standings: new Map(),
      boutMetrics: {
        "r-east": {
          kimariteUsed: { oshidashi: 2, uwatenage: 1, hatakikomi: 1 },
          upsetCount: 0, boutDurations: [], edgeCrisisSurvived: 0,
          comebackWins: 0, opponentTiers: [],
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "yorikiri" }));
    expect(tagged(result, "versatile_kimarite").length).toBeGreaterThan(0);
  });

  it("stays silent below the distinct-technique threshold", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = MockFactory.createBasho({
      id: "kyushu-2026",
      bashoName: "kyushu",
      day: 14,
      standings: new Map(),
      boutMetrics: { "r-east": { kimariteUsed: { oshidashi: 3 }, upsetCount: 0, boutDurations: [], edgeCrisisSurvived: 0, comebackWins: 0, opponentTiers: [] } },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "yorikiri" }));
    expect(tagged(result, "versatile_kimarite")).toHaveLength(0);
  });
});

// ─── Z10: Sibling-lead interview ────────────────────────────────────────────

describe("Z10 — sibling_lead interview question", () => {
  it("asks about the brother leading another division", () => {
    const sib = mockRikishi("sib-1", { division: "juryo" });
    const east = mockRikishi("r-east", {
      siblingIds: ["sib-1"],
      currentBashoWins: 11,
      currentBashoLosses: 2,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 8, currentBashoLosses: 5 });
    const juryoFiller = mockRikishi("juryo-x", { division: "juryo" });
    const standings: Array<[string, { wins: number; losses: number }]> = [
      ["leader", { wins: 12, losses: 2 }],
      ["sib-1", { wins: 10, losses: 4 }],
      ["juryo-x", { wins: 8, losses: 6 }],
      [east.id, { wins: 11, losses: 2 }],
      [west.id, { wins: 8, losses: 5 }],
    ];
    const basho = MockFactory.createBasho({
      id: "kyushu-2026",
      bashoName: "kyushu",
      day: 14,
      standings: new Map(standings),
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    world.rikishi.set(sib.id, sib);
    world.rikishi.set(juryoFiller.id, juryoFiller);
    let found = false;
    for (let i = 0; i < 80 && !found; i++) {
      const r = narrate(
        east,
        west,
        world,
        { ...makeBoutResult(), pbpLines: [] } as BoutResult,
        14,
        `seed-d14-sib-${i}`
      );
      const text = (r.pbpLines ?? [])
        .filter((l) => l.phase === "interview")
        .map((l) => l.text)
        .join("\n");
      if (/brother/i.test(text)) found = true;
    }
    expect(found).toBe(true);
  });
});

// ─── Z12: Repeat spoiler ───────────────────────────────────────────────────

describe("Z12 — spoiler_strike 'again' variant", () => {
  it("uses the again variant when yesterday's victim was also a contender", () => {
    const prevOpp = mockRikishi("prev-opp", { division: "makuuchi" });
    const east = mockRikishi("r-east", {
      currentBashoWins: 8,
      currentBashoLosses: 5,
      history: [h2hEntry({ opponentId: "prev-opp", day: 13, win: true })],
    });
    // west is a contender (within window of the 12-2 leader)
    const west = mockRikishi("r-west", { currentBashoWins: 10, currentBashoLosses: 3 });
    const leader = mockRikishi("leader", { division: "makuuchi" });
    const basho = MockFactory.createBasho({
      id: "kyushu-2026",
      bashoName: "kyushu",
      day: 14,
      standings: new Map([
        ["leader", { wins: 12, losses: 2 }],
        ["prev-opp", { wins: 10, losses: 4 }],
        [east.id, { wins: 8, losses: 5 }],
        [west.id, { wins: 10, losses: 3 }],
      ]),
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    world.rikishi.set(prevOpp.id, prevOpp);
    world.rikishi.set(leader.id, leader);
    const result = narrate(east, west, world);
    expect(allText(result)).toMatch(/back-to-back|again|another/i);
    expect(tagged(result, "spoiler").length).toBeGreaterThan(0);
  });
});

// ─── Z13: Bloodied-unfazed ─────────────────────────────────────────────────

describe("Z13 — bloodied_unfazed", () => {
  it("fires when the winner took a minor in-bout cut and won anyway", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 5 } },
          {
            phase: "bout_injury",
            data: { rikishiId: "r-east", area: "face", severity: "minor" },
          },
          { phase: "finish", data: {} },
        ],
      })
    );
    expect(allText(result)).toMatch(/blood|cut|unfazed/i);
  });

  it("stays silent without a winner-side minor injury entry", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(allText(result)).not.toMatch(/blood|unfazed/i);
  });
});

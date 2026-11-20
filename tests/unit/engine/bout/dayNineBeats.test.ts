/**
 * W M — Day-9 commentary beats.
 *
 * Mechanics + narrative for:
 *  - signature-grip reputation ("once he gets that grip he wins day after
 *    day") — BoutResult.winnerGrip / gripSecured, per-basho boutMetrics
 *    counters, pre- and post-bout beats.
 *  - division-split confidence ("great in Juryo, can't win in Makuuchi").
 *  - career-meeting milestones ("meeting for the 30th time").
 *  - first top-division meeting despite lower-division history.
 *  - sanyaku arcs — shin-sanyaku growing pains + return-to-sanyaku watch.
 *  - consecutive wins vs sanyaku+ opponents ("beat an Ozeki for the
 *    second straight day").
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildBoutResultV2 } from "@/engine/bout/physics/resultBuilders";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type {
  BeltBattleState,
  EngineStateV2,
  PushBattleState,
} from "@/engine/types/combat-spatial";
import type { RivalriesState } from "@/constants/engine/rivalry";
import type { BashoState } from "@/engine/types/basho";

// ─── mechanics fixtures ──────────────────────────────────────────────────────

function belt(overrides: Partial<BeltBattleState> = {}): BeltBattleState {
  return {
    eastLeft: { isInside: true } as BeltBattleState["eastLeft"],
    eastRight: { isInside: false } as BeltBattleState["eastRight"],
    westLeft: null,
    westRight: null,
    eastGripClass: "shitate",
    westGripClass: "none",
    eastDepth: "standard",
    westDepth: "standard",
    torqueEast: 5,
    torqueWest: -5,
    eastAngularAuthority: 0.1,
    westAngularAuthority: 0.05,
    ...overrides,
  };
}

function stWithBelt(b: BeltBattleState): EngineStateV2 {
  return {
    tick: 20,
    phase: { tag: "belt_battle", state: b, push: {} as PushBattleState },
    east: {},
    west: {},
    grappleState: {},
    tachiaiWinner: "east",
    momentumScore: 0,
    prevDominantSide: null,
    inBoutInjury: null,
  } as unknown as EngineStateV2;
}

function stWithPush(): EngineStateV2 {
  return {
    tick: 20,
    phase: { tag: "push_battle", state: {} as PushBattleState },
    east: {},
    west: {},
    grappleState: {},
    tachiaiWinner: "east",
    momentumScore: 0,
    prevDominantSide: null,
    inBoutInjury: null,
  } as unknown as EngineStateV2;
}

const boutCtx = { id: "bout-1", day: 9 } as never;

function gripResultRikishi(id: string, pref: "migi" | "hidari" | "none"): Rikishi {
  return mockRikishi(id, {
    shikona: id,
    division: "makuuchi",
    rank: "maegashira",
    combatProfile: { preferredGrip: pref, preferredGripDepth: "standard" } as never,
  });
}

// ─── applyBoutResult fixture ─────────────────────────────────────────────────

function applyFixture(east: Rikishi, west: Rikishi): { world: FullWorld; match: MatchSchedule } {
  const world = makeBoutWorld(east, west, {
    currentBasho: MockFactory.createBasho({
      id: "basho-1",
      day: 9,
      bashoName: "kyushu" as BashoName,
      standings: new Map([
        [east.id, { wins: 4, losses: 4 }],
        [west.id, { wins: 4, losses: 4 }],
      ]),
    }) as BashoState,
  }) as FullWorld;
  const match: MatchSchedule = {
    boutId: "b-1",
    day: 9,
    eastRikishiId: east.id,
    westRikishiId: west.id,
  };
  return { world, match };
}

function metricsOf(impact: ReturnType<typeof applyBoutResult>, id: string) {
  const basho = impact.worldFields?.currentBasho as BashoState | undefined;
  return basho?.boutMetrics?.[id] as
    | {
        preferredGripBouts?: number;
        preferredGripSecured?: number;
        preferredGripWins?: number;
        sanyakuWinStreak?: number;
      }
    | undefined;
}

// ─── narrative fixture ───────────────────────────────────────────────────────

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  seed = "seed-w9"
): BoutResult {
  generateBoutNarrative(result, east, west, "kyushu" as BashoName, 9, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

function pair(meetings: number, aWins = 3, bWins = meetings - aWins): RivalriesState {
  return {
    version: "1.0.0",
    pairs: {
      "r-east|r-west": {
        key: "r-east|r-west",
        aId: "r-east",
        bId: "r-west",
        heat: 40,
        meetings,
        lastMetWeek: 5,
        aWins,
        bWins,
        closeness: 50,
        spite: 10,
        tone: "public_hype",
        triggers: {},
        sameHeya: false,
      } as never,
    },
  };
}

function gripMetrics(secured: number, wins: number, bouts = secured + 1) {
  return {
    kimariteUsed: {},
    upsetCount: 0,
    boutDurations: [],
    edgeCrisisSurvived: 0,
    comebackWins: 0,
    opponentTiers: [],
    preferredGripBouts: bouts,
    preferredGripSecured: secured,
    preferredGripWins: wins,
  };
}

beforeEach(() => BardEngine.resetCache());

// ─── buildBoutResultV2: grip fields ──────────────────────────────────────────

describe("buildBoutResultV2 — winnerGrip + gripSecured", () => {
  it("exposes the winner's final grip class from belt state", () => {
    const east = gripResultRikishi("r-east", "migi");
    const west = gripResultRikishi("r-west", "none");
    const result = buildBoutResultV2(
      boutCtx,
      east,
      west,
      stWithBelt(belt()),
      "east",
      "yorikiri",
      []
    );
    expect(result.winnerGrip).toBe("shitate");
  });

  it("flags preferred-grip secured via inside-hand side (hidari → left)", () => {
    const east = gripResultRikishi("r-east", "hidari"); // left inside
    const west = gripResultRikishi("r-west", "migi"); // right inside
    const result = buildBoutResultV2(
      boutCtx,
      east,
      west,
      stWithBelt(belt({ westRight: { isInside: true } as never })),
      "east",
      "yorikiri",
      []
    );
    expect(result.gripSecured?.east).toBe(true);
    expect(result.gripSecured?.west).toBe(true);
  });

  it("reports not-secured when the preferred hand never got inside", () => {
    const east = gripResultRikishi("r-east", "migi"); // wants RIGHT inside
    const west = gripResultRikishi("r-west", "none");
    const result = buildBoutResultV2(
      boutCtx,
      east,
      west,
      stWithBelt(belt()), // eastRight.isInside = false
      "east",
      "yorikiri",
      []
    );
    expect(result.gripSecured?.east).toBe(false);
  });

  it("leaves grip fields undefined for push-battle finishes", () => {
    const east = gripResultRikishi("r-east", "migi");
    const west = gripResultRikishi("r-west", "none");
    const result = buildBoutResultV2(boutCtx, east, west, stWithPush(), "east", "oshidashi", []);
    expect(result.winnerGrip).toBeUndefined();
    expect(result.gripSecured).toBeUndefined();
  });
});

// ─── applyBoutResult: metrics ────────────────────────────────────────────────

describe("applyBoutResult — signature-grip + sanyaku metrics", () => {
  it("counts secured preferred-grip bouts and wins", () => {
    const east = gripResultRikishi("east", "hidari");
    const west = gripResultRikishi("west", "none");
    const { world, match } = applyFixture(east, west);
    const result = makeBoutResult({
      winnerRikishiId: "east",
      loserRikishiId: "west",
      gripSecured: { east: true },
    });
    const impact = applyBoutResult(world, match, result);
    const m = metricsOf(impact, "east");
    expect(m?.preferredGripBouts).toBe(1);
    expect(m?.preferredGripSecured).toBe(1);
    expect(m?.preferredGripWins).toBe(1);
  });

  it("counts a secured loser as secured-but-not-won", () => {
    const east = gripResultRikishi("east", "migi");
    const west = gripResultRikishi("west", "none");
    const { world, match } = applyFixture(east, west);
    const result = makeBoutResult({
      winner: "west",
      winnerRikishiId: "west",
      loserRikishiId: "east",
      gripSecured: { east: true },
    });
    const impact = applyBoutResult(world, match, result);
    const m = metricsOf(impact, "east");
    expect(m?.preferredGripBouts).toBe(1);
    expect(m?.preferredGripSecured).toBe(1);
    expect(m?.preferredGripWins ?? 0).toBe(0);
  });

  it("skips grip metrics for rikishi with no grip preference", () => {
    const east = gripResultRikishi("east", "none");
    const west = gripResultRikishi("west", "none");
    const { world, match } = applyFixture(east, west);
    const impact = applyBoutResult(
      world,
      match,
      makeBoutResult({
        winnerRikishiId: "east",
        loserRikishiId: "west",
      })
    );
    expect(metricsOf(impact, "east")?.preferredGripBouts ?? 0).toBe(0);
  });

  it("streaks wins vs sanyaku opponents and resets otherwise", () => {
    const east = gripResultRikishi("east", "none");
    const west = mockRikishi("west", { rank: "ozeki", division: "makuuchi" });
    const { world, match } = applyFixture(east, west);
    const impact = applyBoutResult(
      world,
      match,
      makeBoutResult({
        winnerRikishiId: "east",
        loserRikishiId: "west",
      })
    );
    expect(metricsOf(impact, "east")?.sanyakuWinStreak).toBe(1);
    expect(metricsOf(impact, "west")?.sanyakuWinStreak).toBe(0);

    const westM = mockRikishi("west", { rank: "maegashira", division: "makuuchi" });
    const fx = applyFixture(east, westM);
    const impact2 = applyBoutResult(
      fx.world,
      fx.match,
      makeBoutResult({
        winnerRikishiId: "east",
        loserRikishiId: "west",
      })
    );
    expect(metricsOf(impact2, "east")?.sanyakuWinStreak).toBe(0);
  });
});

// ─── narrative beats ─────────────────────────────────────────────────────────

describe("pre_bout.signature_grip", () => {
  it("fires when a preferrer wins most secured-grip bouts", () => {
    const east = gripResultRikishi("r-east", "hidari");
    const west = gripResultRikishi("r-west", "none");
    const basho = MockFactory.createBasho({
      day: 9,
      boutMetrics: { "r-east": gripMetrics(4, 4, 5) },
    });
    const world = makeBoutWorld(east, west, { currentBasho: basho as BashoState }) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "signature_grip").length).toBeGreaterThan(0);
  });

  it("is silent when the secured win rate is weak", () => {
    const east = gripResultRikishi("r-east", "hidari");
    const west = gripResultRikishi("r-west", "none");
    const basho = MockFactory.createBasho({
      day: 9,
      boutMetrics: { "r-east": gripMetrics(4, 1, 5) },
    });
    const world = makeBoutWorld(east, west, { currentBasho: basho as BashoState }) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "signature_grip")).toEqual([]);
  });

  it("is silent with no metrics or no preference", () => {
    const east = gripResultRikishi("r-east", "hidari");
    const west = gripResultRikishi("r-west", "none");
    const world = makeBoutWorld(east, west, {
      currentBasho: MockFactory.createBasho({ day: 9 }) as BashoState,
    }) as FullWorld;
    expect(tagged(narrate(east, west, world), "signature_grip")).toEqual([]);

    const eastNone = gripResultRikishi("r-east", "none");
    const basho = MockFactory.createBasho({
      day: 9,
      boutMetrics: { "r-east": gripMetrics(4, 4, 5) },
    });
    const world2 = makeBoutWorld(eastNone, west, {
      currentBasho: basho as BashoState,
    }) as FullWorld;
    expect(tagged(narrate(eastNone, west, world2), "signature_grip")).toEqual([]);
  });
});

describe("post_bout.signature_grip", () => {
  it("fires when the winner secured his preferred grip again", () => {
    const east = gripResultRikishi("r-east", "hidari");
    const west = gripResultRikishi("r-west", "none");
    const basho = MockFactory.createBasho({
      day: 9,
      boutMetrics: { "r-east": gripMetrics(4, 4, 5) },
    });
    const world = makeBoutWorld(east, west, { currentBasho: basho as BashoState }) as FullWorld;
    const result = makeBoutResult({ gripSecured: { east: true } });
    narrate(east, west, world, result);
    expect(tagged(result, "signature_grip").length).toBeGreaterThan(0);
  });
});

describe("pre_bout.division_split", () => {
  it("fires when a rikishi dominates a lower division but loses here", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      divisionRecords: {
        makuuchi: { wins: 3, losses: 12 },
        juryo: { wins: 25, losses: 10 },
      } as never,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "division_split").length).toBeGreaterThan(0);
  });

  it("is silent when current-division form is healthy", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      divisionRecords: {
        makuuchi: { wins: 30, losses: 15 },
        juryo: { wins: 25, losses: 10 },
      } as never,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "division_split")).toEqual([]);
  });
});

describe("pre_bout.meeting_milestone", () => {
  it("fires on round-number career meetings (30th)", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west, {
      rivalriesState: pair(29) as never,
    }) as FullWorld;
    const result = narrate(east, west, world);
    const lines = tagged(result, "meeting_milestone");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("30");
  });

  it("is silent on non-milestone counts", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west, {
      rivalriesState: pair(28) as never,
    }) as FullWorld;
    expect(tagged(narrate(east, west, world), "meeting_milestone")).toEqual([]);
  });
});

describe("pre_bout.first_top_division", () => {
  const lowerMeetings = (opp: string) => [
    {
      opponentId: opp,
      win: true,
      kimarite: "yorikiri",
      bashoId: "b1",
      day: 3,
      year: 2025,
      division: "juryo" as const,
    },
    {
      opponentId: opp,
      win: false,
      kimarite: "oshidashi",
      bashoId: "b2",
      day: 5,
      year: 2025,
      division: "juryo" as const,
    },
    {
      opponentId: opp,
      win: true,
      kimarite: "yorikiri",
      bashoId: "b3",
      day: 2,
      year: 2024,
      division: "makushita" as const,
    },
  ];

  it("fires when every prior meeting was below the top division", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      history: lowerMeetings("r-west"),
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west, {
      rivalriesState: pair(3, 2, 1) as never,
    }) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "first_top_division").length).toBeGreaterThan(0);
  });

  it("is silent when a top-division meeting is already logged", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      history: [
        ...lowerMeetings("r-west"),
        {
          opponentId: "r-west",
          win: true,
          kimarite: "yorikiri",
          bashoId: "b4",
          day: 9,
          year: 2025,
          division: "makuuchi" as const,
        },
      ],
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west, {
      rivalriesState: pair(4, 3, 1) as never,
    }) as FullWorld;
    expect(tagged(narrate(east, west, world), "first_top_division")).toEqual([]);
  });
});

describe("pre_bout sanyaku arcs", () => {
  it("shin_sanyaku — first-basho sanyaku man with a losing record", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "komusubi",
      sanyakuPromotionThisBasho: true,
      currentBashoWins: 1,
      currentBashoLosses: 7,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "shin_sanyaku").length).toBeGreaterThan(0);
  });

  it("sanyaku_return — former sanyaku rikishi on a winning basho", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      careerHistory: [
        {
          bashoId: "b0",
          year: 2024,
          month: 5,
          bashoName: "natsu",
          rank: "sekiwake",
          division: "makuuchi",
          rankNumber: 1,
          side: "east",
          wins: 8,
          losses: 7,
          absences: 0,
          isYusho: false,
          isJunYusho: false,
          specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
          weight: 150,
          momentum: 0,
        },
      ] as never,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "sanyaku_return").length).toBeGreaterThan(0);
  });

  it("sanyaku_return is silent for a career maegashira", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      currentBashoWins: 5,
      currentBashoLosses: 3,
      careerHistory: [
        {
          bashoId: "b0",
          year: 2024,
          month: 5,
          bashoName: "natsu",
          rank: "maegashira",
          division: "makuuchi",
          rankNumber: 4,
          side: "east",
          wins: 8,
          losses: 7,
          absences: 0,
          isYusho: false,
          isJunYusho: false,
          specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
          weight: 150,
          momentum: 0,
        },
      ] as never,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "sanyaku_return")).toEqual([]);
  });
});

describe("post_bout.sanyaku_streak", () => {
  it("fires when the winner beats a sanyaku opponent again", () => {
    const east = mockRikishi("r-east", { division: "makuuchi", rank: "maegashira" });
    const west = mockRikishi("r-west", { division: "makuuchi", rank: "ozeki" });
    const basho = MockFactory.createBasho({
      day: 9,
      boutMetrics: {
        "r-east": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          sanyakuWinStreak: 1,
        },
      },
    });
    const world = makeBoutWorld(east, west, { currentBasho: basho as BashoState }) as FullWorld;
    const result = narrate(east, west, world);
    const lines = tagged(result, "sanyaku_streak");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("2");
  });

  it("is silent when the loser is not sanyaku", () => {
    const east = mockRikishi("r-east", { division: "makuuchi", rank: "maegashira" });
    const west = mockRikishi("r-west", { division: "makuuchi", rank: "maegashira" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "sanyaku_streak")).toEqual([]);
  });
});

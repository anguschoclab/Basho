/**
 * W P — Day-12 Kyushu Basho commentary & feature tests (P1–P15).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolvePlayoffs } from "@/engine/lifecycle/PlayoffResolver";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BoutResult, BashoState, MatchSchedule } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Rank } from "@/engine/types/banzuke";

const BASHO = "kyushu" as BashoName;

beforeEach(() => BardEngine.resetCache());

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  day = 12,
  seed = "seed-d12"
): BoutResult {
  generateBoutNarrative(result, east, west, BASHO, day, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

const interviewLines = (r: BoutResult) =>
  (r.pbpLines ?? []).filter((l) => l.phase === "interview").map((l) => l.text);

function interviewQuestionLine(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult,
  day = 12
): string[] {
  for (let i = 0; i < 60; i++) {
    const r = narrate(
      east,
      west,
      world,
      { ...result, pbpLines: [] } as BoutResult,
      day,
      `seed-d12-int-${i}`
    );
    const q = interviewLines(r);
    if (q.length > 0) return q;
  }
  return [];
}

function snap(
  wins: number,
  losses: number,
  overrides: Partial<CareerSnapshot> = {}
): CareerSnapshot {
  return {
    id: `s-${wins}-${losses}-${overrides.division ?? "makuuchi"}-${overrides.rank ?? "maegashira"}`,
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

/** Standings basho with leader + both combatants, division-scoped. */
function standingsWorld(
  east: Rikishi,
  west: Rikishi,
  extra: Array<[string, number, number]> = []
): FullWorld {
  const leader = mockRikishi("leader", { division: "makuuchi" });
  const standings: Array<[string, { wins: number; losses: number }]> = [
    ["leader", { wins: 11, losses: 1 }],
    [east.id, { wins: east.currentBashoWins ?? 0, losses: east.currentBashoLosses ?? 0 }],
    [west.id, { wins: west.currentBashoWins ?? 0, losses: west.currentBashoLosses ?? 0 }],
    ...extra.map(
      ([id, w, l]) => [id, { wins: w, losses: l }] as [string, { wins: number; losses: number }]
    ),
  ];
  const basho = MockFactory.createBasho({
    id: "kyushu-2026",
    day: 12,
    standings: new Map(standings),
  }) as BashoState;
  const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
  world.rikishi.set(leader.id, leader);
  return world;
}

// ─── P1: Yusho-race aftermath framing ───────────────────────────────────────

describe("P1 — chase_pack + spoiler_strike leaderboard aftermath", () => {
  it("fires chase_pack when the winner stays one back of a sole leader", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 9, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { currentBashoWins: 8, currentBashoLosses: 3 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }), 12);
    expect(tagged(result, "chase_pack").length).toBeGreaterThan(0);
    // Not the leader himself — sole_leader must stay silent
    expect(tagged(result, "yusho_race").some((t) => /sole leader/i.test(t))).toBe(false);
  });

  it("does NOT fire chase_pack when the winner ties or takes the lead", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 10, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { currentBashoWins: 8, currentBashoLosses: 3 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }), 12);
    expect(tagged(result, "chase_pack")).toEqual([]);
  });

  it("fires spoiler_strike when a non-contender beats an in-contention rikishi", () => {
    // Loser at 10 wins within CONTENTION_WINDOW (2) of the 11-win leader;
    // winner at 5 wins is far outside the window.
    const east = mockRikishi("r-east", { currentBashoWins: 5, currentBashoLosses: 5 });
    const west = mockRikishi("r-west", { currentBashoWins: 10, currentBashoLosses: 2 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }), 12);
    expect(tagged(result, "spoiler").length).toBeGreaterThan(0);
  });

  it("does NOT fire spoiler_strike when the winner is also in contention", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 10, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { currentBashoWins: 10, currentBashoLosses: 2 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }), 12);
    expect(tagged(result, "spoiler")).toEqual([]);
  });
});

// ─── P2: Demotion foreshadowing ─────────────────────────────────────────────

describe("P2 — demotion_watch", () => {
  it("fires for a bottom-ranked makuuchi maegashira with make-koshi clinched", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 16,
      currentBashoWins: 3,
      currentBashoLosses: 9,
    });
    const west = mockRikishi("r-west", { rankNumber: 5 });
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult(),
      12
    );
    expect(tagged(result, "demotion_watch").length).toBeGreaterThan(0);
  });

  it("stays silent for a mid-table maegashira with the same record", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 5,
      currentBashoWins: 3,
      currentBashoLosses: 9,
    });
    // A second rikishi at the floor anchors the bottom of the division.
    const floor = mockRikishi("floor-man", {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 16,
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    world.rikishi.set(floor.id, floor);
    const result = narrate(east, west, world, makeBoutResult(), 12);
    expect(tagged(result, "demotion_watch")).toEqual([]);
  });
});

// ─── P3: Playoff rematch H2H ────────────────────────────────────────────────

describe("P3 — playoff_rematch + playoff_win recording", () => {
  it("fires playoff_rematch when a careerHighlights playoff_win names the opponent", () => {
    const east = mockRikishi("r-east", {
      careerHighlights: [
        {
          type: "playoff_win",
          basho: "hatsu-2026",
          opponent: "r-west",
          description: "Playoff win over Wrestler-r-west",
        },
      ],
    });
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult(),
      12
    );
    expect(tagged(result, "playoff").length).toBeGreaterThan(0);
  });

  it("stays silent when the playoff_win is against a different rikishi", () => {
    const east = mockRikishi("r-east", {
      careerHighlights: [
        {
          type: "playoff_win",
          basho: "hatsu-2026",
          opponent: "someone-else",
          description: "Playoff win over someone else",
        },
      ],
    });
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult(),
      12
    );
    expect(tagged(result, "playoff")).toEqual([]);
  });

  it("records playoff_win careerHighlights on the winner via resolvePlayoffs", () => {
    const east = mockRikishi("p-east", { division: "makuuchi" });
    const west = mockRikishi("p-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const basho = MockFactory.createBasho({ bashoName: BASHO, day: 15 }) as BashoState;
    const { winner } = resolvePlayoffs(world, basho, [east.id, west.id]);
    const loserId = winner === east.id ? west.id : east.id;
    const winnerRikishi = world.rikishi.get(winner)!;
    const hl = (winnerRikishi.careerHighlights ?? []).find(
      (h) => h.type === "playoff_win" && h.opponent === loserId
    );
    expect(hl).toBeDefined();
  });
});

// ─── P4: Slapathon ──────────────────────────────────────────────────────────

describe("P4 — slapathon", () => {
  const pushEntries = (side: "east" | "west", n: number) =>
    Array.from({ length: n }, () => ({
      phase: "engagement" as const,
      data: { family: "push", attackerSide: side },
    }));

  it("fires when both sides logged >= 3 push-family exchanges", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({ log: [...pushEntries("east", 3), ...pushEntries("west", 3)] }),
      12
    );
    expect(tagged(result, "slapathon").length).toBeGreaterThan(0);
  });

  it("stays silent below the exchange threshold", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({ log: [...pushEntries("east", 2), ...pushEntries("west", 2)] }),
      12
    );
    expect(tagged(result, "slapathon")).toEqual([]);
  });
});

// ─── P5/P6: Loser credit ────────────────────────────────────────────────────

describe("P5/P6 — valiant_loser + loser_near_miss", () => {
  it("fires valiant_loser when the loser survived 2+ edge crises", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({
        winner: "east",
        log: [
          { phase: "edge_crisis", data: { side: "west", escaped: true } },
          { phase: "edge_crisis", data: { side: "west", escaped: true } },
        ],
      }),
      12
    );
    expect(tagged(result, "valiant_loser").length).toBeGreaterThan(0);
    expect(tagged(result, "loser_near_miss")).toEqual([]);
  });

  it("fires valiant_loser when the loser pushed a yokozuna deep", () => {
    const east = mockRikishi("r-east", { rank: "yokozuna" });
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({ winner: "east", duration: 40 }),
      12
    );
    expect(tagged(result, "valiant_loser").length).toBeGreaterThan(0);
  });

  it("fires loser_near_miss when the loser forced a winner-side escape", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({
        winner: "east",
        log: [{ phase: "edge_crisis", data: { side: "east", escaped: true } }],
      }),
      12
    );
    expect(tagged(result, "loser_near_miss").length).toBeGreaterThan(0);
    expect(tagged(result, "valiant_loser")).toEqual([]);
  });
});

// ─── P7: Followup delivered ─────────────────────────────────────────────────

describe("P7 — followup_delivered", () => {
  it("fires when a repeat phase-two offender wins tachiai AND the bout", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = MockFactory.createBasho({
      day: 12,
      boutMetrics: {
        "r-east": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          tachiaiWonButLost: 2,
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ winner: "east", tachiaiWinner: "east" }),
      12
    );
    expect(tagged(result, "followup").length).toBeGreaterThan(0);
  });

  it("stays silent when the tachiai winner lost the bout", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = MockFactory.createBasho({
      day: 12,
      boutMetrics: {
        "r-west": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          tachiaiWonButLost: 2,
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ winner: "east", tachiaiWinner: "west" }),
      12
    );
    expect(tagged(result, "followup")).toEqual([]);
  });
});

// ─── P8: Alternating KK/MK ──────────────────────────────────────────────────

describe("P8 — alternating_records", () => {
  it("fires for 3+ strictly alternating kachi-koshi/make-koshi bashos", () => {
    const east = mockRikishi("r-east", {
      careerHistory: [snap(8, 7), snap(7, 8), snap(8, 7)],
    });
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult(),
      12
    );
    expect(tagged(result, "alternating_records").length).toBeGreaterThan(0);
  });

  it("stays silent on a non-alternating run", () => {
    const east = mockRikishi("r-east", {
      careerHistory: [snap(8, 7), snap(8, 7), snap(7, 8)],
    });
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult(),
      12
    );
    expect(tagged(result, "alternating_records")).toEqual([]);
  });
});

// ─── P9: Edge-letdown beat + edgeFailedConversions metric ───────────────────

describe("P9 — edge_letdown beat + edgeFailedConversions metric", () => {
  it("fires edge_letdown when the loser's failed conversions reach the threshold", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const basho = MockFactory.createBasho({
      day: 12,
      boutMetrics: {
        "r-west": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          edgeFailedConversions: 2,
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    // West (loser) pushed east to the edge but east escaped — 2 prior + 1 new = 3.
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        winner: "east",
        log: [{ phase: "edge_crisis", data: { side: "east", escaped: true } }],
      }),
      12
    );
    expect(tagged(result, "edge_letdown").length).toBeGreaterThan(0);
  });

  it("stays silent on a first failed conversion", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({
        winner: "east",
        log: [{ phase: "edge_crisis", data: { side: "east", escaped: true } }],
      }),
      12
    );
    expect(tagged(result, "edge_letdown")).toEqual([]);
  });

  it("attributes edgeFailedConversions to the ATTACKER (non-crisis side) via applyBoutResult", () => {
    const east = mockRikishi("east", { division: "makuuchi" });
    const west = mockRikishi("west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west, {
      currentBasho: MockFactory.createBasho({
        id: "b1",
        day: 10,
        bashoName: BASHO,
        standings: new Map([
          ["east", { wins: 5, losses: 4 }],
          ["west", { wins: 5, losses: 4 }],
        ]),
      }) as BashoState,
    }) as FullWorld;
    const match: MatchSchedule = {
      boutId: "b-1",
      day: 10,
      eastRikishiId: "east",
      westRikishiId: "west",
    };
    // East escaped twice (west failed to convert twice);
    // west escaped once (east failed once); plus a non-escape entry.
    const imp = applyBoutResult(
      world,
      match,
      makeBoutResult({
        day: 10,
        winnerRikishiId: "east",
        loserRikishiId: "west",
        log: [
          { phase: "edge_crisis", data: { side: "east", escaped: true } },
          { phase: "edge_crisis", data: { side: "east", escaped: true } },
          { phase: "edge_crisis", data: { side: "west", escaped: true } },
          { phase: "edge_crisis", data: { side: "west", escaped: false } },
        ],
      })
    );
    const basho1 = imp.worldFields?.currentBasho as BashoState;
    expect(basho1.boutMetrics?.["west"]?.edgeFailedConversions).toBe(2);
    expect(basho1.boutMetrics?.["east"]?.edgeFailedConversions).toBe(1);
  });
});

// ─── P10: Road-back interview ───────────────────────────────────────────────

describe("P10 — road_back interview", () => {
  it("picks road_back for a sanyaku→sub-juryo→kachi-koshi career path", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 27,
      currentBashoWins: 7,
      currentBashoLosses: 4,
      careerHistory: [
        snap(9, 6, { rank: "sekiwake", division: "makuuchi" }),
        snap(5, 2, { rank: "maegashira", division: "sandanme" }),
        snap(8, 7, { rank: "maegashira", division: "makuuchi" }),
      ],
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const q = interviewQuestionLine(east, west, world, makeBoutResult(), 12);
    expect(q.length).toBeGreaterThan(0);
    expect(q[0].toLowerCase()).toMatch(/sanyaku|dropped|lower division|back/);
  });
});

// ─── P11: Return streak ≥3 ──────────────────────────────────────────────────

describe("P11 — mid_basho_return_streak", () => {
  it("fires the ≥3-wins variant on day reentered+2 or later", () => {
    const east = mockRikishi("r-east", { currentWinStreak: 2 });
    const west = mockRikishi("r-west");
    const basho = MockFactory.createBasho({
      day: 12,
      reenteredOnDay: { "r-east": 9 },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }), 12);
    const lines = tagged(result, "mid_basho_return");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((t) => /three|3 straight|3rd/i.test(t))).toBe(true);
  });
});

// ─── P12: Replay mechanics variants ─────────────────────────────────────────

describe("P12 — replay mechanics variants", () => {
  const replayLines = (r: BoutResult) =>
    (r.pbpLines ?? []).filter((l) => l.phase === "replay").map((l) => l.text);

  it("routes kakenage finishes to the arm_lock replay", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({ excitementScore: 55, kimarite: "kakenage", duration: 10 }),
      12
    );
    expect(replayLines(result).some((t) => /arm|clamp|squeeze|lock/i.test(t))).toBe(true);
  });

  it("routes tsukiotoshi-style finishes to the overlean replay", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({ excitementScore: 55, kimarite: "tsukiotoshi", duration: 10 }),
      12
    );
    expect(replayLines(result).some((t) => /lean|feet|overcommit|forward/i.test(t))).toBe(true);
  });

  it("routes 2+ grip-transition bouts to the grip_sequence replay", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const result = narrate(
      east,
      west,
      makeBoutWorld(east, west) as FullWorld,
      makeBoutResult({
        excitementScore: 55,
        kimarite: "yorikiri",
        duration: 10,
        log: [
          { phase: "tachiai", data: { tachiaiWinner: "east" } },
          { phase: "grip_transition", data: { type: "grip_class_shift" } },
          { phase: "grip_transition", data: { type: "grip_class_shift" } },
          { phase: "finish", data: {} },
        ],
      }),
      12
    );
    expect(replayLines(result).some((t) => /inside|grip|sequence|slip/i.test(t))).toBe(true);
  });
});

// ─── P13: Week-2 turnaround ─────────────────────────────────────────────────

describe("P13 — week_two_surge", () => {
  const bashoHistory = (entries: Array<{ win: boolean; day: number }>) =>
    entries.map((e) => ({
      opponentId: "opp-x",
      win: e.win,
      kimarite: "yorikiri",
      bashoId: "kyushu-2026",
      day: e.day,
      year: 2026,
    }));

  it("fires for >=3 early losses followed by >=4 week-two wins", () => {
    const east = mockRikishi("r-east", {
      history: bashoHistory([
        { win: false, day: 1 },
        { win: false, day: 2 },
        { win: false, day: 3 },
        { win: true, day: 8 },
        { win: true, day: 9 },
        { win: true, day: 10 },
        { win: true, day: 11 },
      ]),
    });
    const west = mockRikishi("r-west");
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world, makeBoutResult(), 12);
    expect(tagged(result, "week_two_surge").length).toBeGreaterThan(0);
  });

  it("stays silent with only 2 week-two wins", () => {
    const east = mockRikishi("r-east", {
      history: bashoHistory([
        { win: false, day: 1 },
        { win: false, day: 2 },
        { win: false, day: 3 },
        { win: true, day: 10 },
        { win: true, day: 11 },
      ]),
    });
    const west = mockRikishi("r-west");
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world, makeBoutResult(), 12);
    expect(tagged(result, "week_two_surge")).toEqual([]);
  });
});

// ─── P14: Closing-days interview ────────────────────────────────────────────

describe("P14 — closing_days interview", () => {
  it("picks closing_days for a contender on day >= 12", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 11,
      currentBashoLosses: 1,
      currentWinStreak: 1,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 8, currentBashoLosses: 4 });
    const world = standingsWorld(east, west);
    const q = interviewQuestionLine(east, west, world, makeBoutResult({ winner: "east" }), 13);
    expect(q.length).toBeGreaterThan(0);
    expect(q[0].toLowerCase()).toMatch(/days|remain|final|last/);
  });
});

// ─── P15: Win-streak interview ──────────────────────────────────────────────

describe("P15 — win_streak interview", () => {
  it("picks win_streak for a winner riding a >=6 bout streak", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 7,
      currentBashoLosses: 4,
      currentWinStreak: 6,
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const q = interviewQuestionLine(east, west, world, makeBoutResult(), 12);
    expect(q.length).toBeGreaterThan(0);
    expect(q[0].toLowerCase()).toMatch(/consecutive|streak|in a row|winning/);
  });
});

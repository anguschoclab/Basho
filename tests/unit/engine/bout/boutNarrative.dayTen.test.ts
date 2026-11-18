/**
 * W N — Day-10 commentary beats.
 *
 * Mechanics + narrative for:
 *  - henka dignity ("desperate times, desperate measures" — a yokozuna/sanyaku
 *    sidestep draws credibility lines; spontaneous henka now carries the
 *    momentum stigma too).
 *  - pull-sequence charm ("determined to pull going backwards — the third
 *    time's a charm").
 *  - lower-body injury commentary (pre-bout "hampered by the knee", post-bout
 *    "limping away", "competing is a plus" credit).
 *  - sibling leaderboard beats ("his brother shares the lead in Juryo").
 *  - "phase two" tendency (won the tachiai, lost the bout).
 *  - interview question types: consecutive sanyaku wins + debut kachi-koshi.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BoutResult, BashoState, MatchSchedule } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

const BASHO = "kyushu" as BashoName;

beforeEach(() => BardEngine.resetCache());

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  seed = "seed-d10"
): BoutResult {
  generateBoutNarrative(result, east, west, BASHO, 10, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

const interviewLines = (r: BoutResult) =>
  (r.pbpLines ?? []).filter((l) => l.phase === "interview").map((l) => l.text);

/**
 * The interview beat is RNG-gated; sweep a fixed seed list until it fires.
 * Deterministic — the same seeds always pass the gate first.
 */
function interviewQuestionLine(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult
): string[] {
  for (let i = 0; i < 60; i++) {
    const r = narrate(east, west, world, { ...result, pbpLines: [] } as BoutResult, `seed-d10-int-${i}`);
    const q = interviewLines(r);
    if (q.length > 0) return q;
  }
  return [];
}

// ─── N1: henka dignity ───────────────────────────────────────────────────────

const HENKA_LOG = [
  { phase: "tachiai", clock: 0, data: { event: "henka_success", attackerSide: "east" } },
  { phase: "finish", data: {} },
] as BoutResult["log"];

describe("post_bout.henka_dignity", () => {
  it("fires for a sanyaku+ winner who sidestepped", () => {
    const east = mockRikishi("r-east", { rank: "sekiwake", division: "makuuchi" });
    const west = mockRikishi("r-west", { rank: "maegashira", division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ log: HENKA_LOG }));
    expect(tagged(result, "henka_dignity").length).toBeGreaterThan(0);
  });

  it("fires with a leaping variant for high-agility winners", () => {
    const east = mockRikishi("r-east", {
      rank: "yokozuna",
      division: "makuuchi",
      stats: { speed: 80 } as never,
    });
    const west = mockRikishi("r-west", { rank: "maegashira", division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ log: HENKA_LOG }));
    const lines = tagged(result, "henka_dignity");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].toLowerCase()).toMatch(/leap|air|fly/);
  });

  it("is silent for a rank-and-file winner", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r-west", { rank: "maegashira", division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ log: HENKA_LOG }));
    expect(tagged(result, "henka_dignity")).toEqual([]);
  });
});

// ─── N2: pull-sequence charm ─────────────────────────────────────────────────

const pullLog = (pullerAbsorbs: number) => {
  const entries: unknown[] = [];
  for (let i = 0; i < pullerAbsorbs; i++) {
    entries.push({
      phase: "engagement",
      clock: i * 10,
      data: { tick: i * 4, family: "push", attackerSide: "west" },
    });
  }
  entries.push({ phase: "finish", data: {} });
  return entries as BoutResult["log"];
};

describe("post_bout.pull_charm", () => {
  it("fires when the winner lands a pull after absorbing attacks", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ kimarite: "hikiotoshi", kimariteName: "Hikiotoshi", log: pullLog(3) })
    );
    expect(tagged(result, "pull_charm").length).toBeGreaterThan(0);
  });

  it("is silent on a pull win with no absorbed pressure", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ kimarite: "hikiotoshi", kimariteName: "Hikiotoshi", log: pullLog(0) })
    );
    expect(tagged(result, "pull_charm")).toEqual([]);
  });

  it("is silent on non-pull kimarite even under pressure", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ log: pullLog(4) }));
    expect(tagged(result, "pull_charm")).toEqual([]);
  });
});

// ─── N3: lower-body injury commentary ────────────────────────────────────────

const lowerInjury = (area: string) =>
  ({
    type: "sprain",
    severity: "moderate",
    location: area,
    weeksRemaining: 2,
  }) as never;

describe("pre_bout.hurt_lower_body", () => {
  it("fires when an entered rikishi carries a knee injury", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      injured: true,
      injuryStatus: lowerInjury("knee"),
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "hurt_lower_body").length).toBeGreaterThan(0);
  });

  it("is silent for upper-body injuries", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      injured: true,
      injuryStatus: lowerInjury("shoulder"),
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "hurt_lower_body")).toEqual([]);
  });

  it("is silent for healthy rikishi", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "hurt_lower_body")).toEqual([]);
  });
});

describe("post_bout.limp_away", () => {
  it("fires when a lower-body injury is sustained in the bout", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        inBoutInjury: { rikishiId: "r-west", severity: "moderate", area: "knee" } as never,
      })
    );
    expect(tagged(result, "limp_away").length).toBeGreaterThan(0);
  });

  it("is silent for upper-body in-bout injuries", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        inBoutInjury: { rikishiId: "r-west", severity: "moderate", area: "wrist" } as never,
      })
    );
    expect(tagged(result, "limp_away")).toEqual([]);
  });
});

describe("post_bout.compete_credit", () => {
  it("fires when a pre-injured rikishi wins anyway", () => {
    const east = mockRikishi("r-east", { division: "makuuchi", injured: true });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "compete_credit").length).toBeGreaterThan(0);
  });

  it("is silent for a healthy winner", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    expect(tagged(narrate(east, west, world), "compete_credit")).toEqual([]);
  });
});

// ─── N4: sibling leaderboard ─────────────────────────────────────────────────

function siblingWorld(
  east: Rikishi,
  west: Rikishi,
  sibling: Rikishi,
  standings: [string, { wins: number; losses: number }][]
): FullWorld {
  const basho = MockFactory.createBasho({
    day: 10,
    standings: new Map(standings),
  }) as BashoState;
  const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
  world.rikishi.set(sibling.id, sibling);
  return world;
}

describe("pre_bout.sibling_lead", () => {
  it("fires when a sibling co-leads a different division", () => {
    const sib = mockRikishi("sib-1", { division: "juryo", currentBashoWins: 9 });
    const east = mockRikishi("r-east", { division: "makuuchi", siblingIds: ["sib-1"] });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = siblingWorld(east, west, sib, [
      ["sib-1", { wins: 9, losses: 1 }],
      ["r-east", { wins: 5, losses: 5 }],
      ["r-west", { wins: 5, losses: 5 }],
    ]);
    expect(tagged(narrate(east, west, world), "sibling_lead").length).toBeGreaterThan(0);
  });

  it("is silent when the sibling leads the SAME division", () => {
    const sib = mockRikishi("sib-1", { division: "makuuchi", currentBashoWins: 9 });
    const east = mockRikishi("r-east", { division: "makuuchi", siblingIds: ["sib-1"] });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = siblingWorld(east, west, sib, [
      ["sib-1", { wins: 9, losses: 1 }],
      ["r-east", { wins: 5, losses: 5 }],
      ["r-west", { wins: 5, losses: 5 }],
    ]);
    expect(tagged(narrate(east, west, world), "sibling_lead")).toEqual([]);
  });

  it("is silent when the sibling is not a division leader", () => {
    const sib = mockRikishi("sib-1", { division: "juryo", currentBashoWins: 4 });
    const otherJuryo = mockRikishi("j-lead", { division: "juryo" });
    const east = mockRikishi("r-east", { division: "makuuchi", siblingIds: ["sib-1"] });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = siblingWorld(east, west, sib, [
      ["sib-1", { wins: 4, losses: 6 }],
      ["j-lead", { wins: 9, losses: 1 }],
      ["r-east", { wins: 5, losses: 5 }],
      ["r-west", { wins: 5, losses: 5 }],
    ]);
    world.rikishi.set(otherJuryo.id, otherJuryo);
    expect(tagged(narrate(east, west, world), "sibling_lead")).toEqual([]);
  });
});

// ─── N7: phase-two tendency ──────────────────────────────────────────────────

describe("post_bout.phase_two", () => {
  it("fires when the loser repeatedly loses after winning the tachiai", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const basho = MockFactory.createBasho({
      day: 10,
      boutMetrics: {
        "r-west": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          tachiaiWins: 4,
          tachiaiWonButLost: 2, // this bout makes 3
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ tachiaiWinner: "west" }) // west won the charge, lost the bout
    );
    expect(tagged(result, "phase_two").length).toBeGreaterThan(0);
  });

  it("is silent below the threshold", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const basho = MockFactory.createBasho({
      day: 10,
      boutMetrics: {
        "r-west": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          tachiaiWins: 4,
          tachiaiWonButLost: 1, // this bout makes only 2
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ tachiaiWinner: "west" }));
    expect(tagged(result, "phase_two")).toEqual([]);
  });
});

// ─── applier metrics: tachiai + pulls ────────────────────────────────────────

function applyFixture(east: Rikishi, west: Rikishi) {
  const world = makeBoutWorld(east, west, {
    currentBasho: MockFactory.createBasho({
      id: "basho-1",
      day: 10,
      bashoName: BASHO,
      standings: new Map([
        [east.id, { wins: 5, losses: 4 }],
        [west.id, { wins: 5, losses: 4 }],
      ]),
    }) as BashoState,
  }) as FullWorld;
  const match: MatchSchedule = {
    boutId: "b-1",
    day: 10,
    eastRikishiId: east.id,
    westRikishiId: west.id,
  };
  return { world, match };
}

function metricsOf(impact: ReturnType<typeof applyBoutResult>, id: string) {
  const basho = impact.worldFields?.currentBasho as BashoState | undefined;
  return basho?.boutMetrics?.[id] as
    | { tachiaiWins?: number; tachiaiWonButLost?: number; pullWins?: number }
    | undefined;
}

describe("applyBoutResult — tachiai + pull metrics", () => {
  it("counts a tachiai win even when the bout is lost", () => {
    const east = mockRikishi("east", { division: "makuuchi" });
    const west = mockRikishi("west", { division: "makuuchi" });
    const { world, match } = applyFixture(east, west);
    const impact = applyBoutResult(
      world,
      match,
      makeBoutResult({
        winner: "east",
        winnerRikishiId: "east",
        loserRikishiId: "west",
        tachiaiWinner: "west",
      })
    );
    expect(metricsOf(impact, "west")?.tachiaiWins).toBe(1);
    expect(metricsOf(impact, "west")?.tachiaiWonButLost).toBe(1);
    expect(metricsOf(impact, "east")?.tachiaiWonButLost ?? 0).toBe(0);
  });

  it("counts pull-family wins on the winner", () => {
    const east = mockRikishi("east", { division: "makuuchi" });
    const west = mockRikishi("west", { division: "makuuchi" });
    const { world, match } = applyFixture(east, west);
    const impact = applyBoutResult(
      world,
      match,
      makeBoutResult({
        winnerRikishiId: "east",
        loserRikishiId: "west",
        kimarite: "hikiotoshi",
      })
    );
    expect(metricsOf(impact, "east")?.pullWins).toBe(1);
  });

  it("does not count pull wins on force-out kimarite", () => {
    const east = mockRikishi("east", { division: "makuuchi" });
    const west = mockRikishi("west", { division: "makuuchi" });
    const { world, match } = applyFixture(east, west);
    const impact = applyBoutResult(
      world,
      match,
      makeBoutResult({ winnerRikishiId: "east", loserRikishiId: "west", kimarite: "oshidashi" })
    );
    expect(metricsOf(impact, "east")?.pullWins ?? 0).toBe(0);
  });
});

// ─── N5: interview question types ────────────────────────────────────────────

describe("interview.questions — day-10 contexts", () => {
  it("sanyaku_streak: consecutive wins over sanyaku-ranked opponents", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "sekiwake",
      currentBashoWins: 8,
      currentBashoLosses: 1,
    });
    const west = mockRikishi("r-west", { division: "makuuchi", rank: "yokozuna" });
    const basho = MockFactory.createBasho({
      day: 10,
      boutMetrics: {
        "r-east": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          sanyakuWinStreak: 1, // this win makes it 2 in a row
        },
      },
    }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const q = interviewQuestionLine(east, west, world, makeBoutResult());
    expect(q.length).toBeGreaterThan(0); // an interview did fire
    // The first interview line is the question — it must ask about the
    // consecutive sanyaku scalps, not a generic question.
    expect(q[0].toLowerCase()).toMatch(/sanyaku|consecutive|yokozuna|in a row|straight/);
  });

  it("debut_kachikoshi: first-basho clinch asks about the debut", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      currentBashoWins: 7,
      currentBashoLosses: 2,
      careerHistory: [], // true debutant — no prior makuuchi tournaments
    });
    const west = mockRikishi("r-west", { division: "makuuchi", rank: "maegashira" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const q = interviewQuestionLine(east, west, world, makeBoutResult());
    expect(q.length).toBeGreaterThan(0); // an interview did fire
    expect(q[0].toLowerCase()).toContain("debut");
  });
});

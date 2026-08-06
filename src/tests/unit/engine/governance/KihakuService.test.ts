 
import { describe, it, expect } from "vitest";
import { KihakuService } from "@/engine/systems/governance/KihakuService";
import type { MatchSchedule, BashoState } from "@/engine/types/basho";

function makeMatch(
  boutId: string,
  day: number,
  winnerId: string,
  loserId: string,
  monoii = false
): MatchSchedule {
  return {
    boutId,
    day,
    eastId: winnerId,
    westId: loserId,
    result: {
      winnerRikishiId: winnerId,
      loserRikishiId: loserId,
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      duration: 8,
      monoii,
    },
  } as any;
}

describe("KihakuService — countPlayoffWins", () => {
  it("counts wins from bouts with boutId starting 'playoff'", () => {
    const matches: MatchSchedule[] = [
      makeMatch("playoff-1", 15, "r1", "r2"),
      makeMatch("playoff-2", 15, "r1", "r3"),
      makeMatch("day14-1", 14, "r1", "r4"),
    ];
    expect(KihakuService.countPlayoffWins("r1", matches)).toBe(2);
  });

  it("returns 0 when no playoff bouts exist", () => {
    const matches: MatchSchedule[] = [
      makeMatch("day14-1", 14, "r1", "r2"),
      makeMatch("day15-1", 15, "r1", "r3"),
    ];
    expect(KihakuService.countPlayoffWins("r1", matches)).toBe(0);
  });

  it("does not count losses as wins", () => {
    const matches: MatchSchedule[] = [
      makeMatch("playoff-1", 15, "r2", "r1"),
    ];
    expect(KihakuService.countPlayoffWins("r1", matches)).toBe(0);
  });
});

describe("KihakuService — countYushoContentionWins", () => {
  it("counts wins on day 12+ when winner is within 1 win of leader", () => {
    const standings = new Map([
      ["r1", { wins: 13, losses: 2 }],
      ["r2", { wins: 14, losses: 1 }],
    ]);
    const matches: MatchSchedule[] = [
      makeMatch("day12-1", 12, "r1", "r3"),
      makeMatch("day13-1", 13, "r1", "r4"),
      makeMatch("day14-1", 14, "r1", "r5"),
    ];
    // r1 has 13 wins, leader has 14 → within 1 → all wins counted
    expect(KihakuService.countYushoContentionWins("r1", matches, standings)).toBe(3);
  });

  it("does not count wins when winner is more than 1 win behind leader", () => {
    const standings = new Map([
      ["r1", { wins: 10, losses: 5 }],
      ["r2", { wins: 14, losses: 1 }],
    ]);
    const matches: MatchSchedule[] = [
      makeMatch("day12-1", 12, "r1", "r3"),
    ];
    // r1 has 10 wins, leader has 14 → difference > 1 → not counted
    expect(KihakuService.countYushoContentionWins("r1", matches, standings)).toBe(0);
  });

  it("does not count wins before day 12", () => {
    const standings = new Map([
      ["r1", { wins: 14, losses: 1 }],
    ]);
    const matches: MatchSchedule[] = [
      makeMatch("day11-1", 11, "r1", "r3"),
      makeMatch("day12-1", 12, "r1", "r4"),
    ];
    // Only day 12+ counts
    expect(KihakuService.countYushoContentionWins("r1", matches, standings)).toBe(1);
  });
});

describe("KihakuService — extractFromBasho", () => {
  it("returns hasMetrics=false when no bout metrics exist", () => {
    const basho = {
      boutMetrics: undefined,
      standings: new Map([["r1", { wins: 10, losses: 5 }]]),
      matches: [],
    } as any as BashoState;
    const input = KihakuService.extractFromBasho("r1", basho, 10, false);
    expect(input.hasMetrics).toBe(false);
  });

  it("returns hasMetrics=true when bout metrics exist", () => {
    const basho = {
      boutMetrics: {
        r1: {
          comebackWins: 3,
          edgeCrisisSurvived: 2,
          upsetCount: 1,
          boutDurations: [],
          opponentTiers: [],
        },
      },
      standings: new Map([["r1", { wins: 12, losses: 3 }]]),
      matches: [],
    } as any as BashoState;
    const input = KihakuService.extractFromBasho("r1", basho, 12, false);
    expect(input.hasMetrics).toBe(true);
    expect(input.comebackWins).toBe(3);
    expect(input.edgeCrisisSurvived).toBe(2);
  });

  it("detects make-koshi when losses > wins", () => {
    const basho = {
      boutMetrics: {
        r1: { comebackWins: 0, edgeCrisisSurvived: 0, upsetCount: 0, boutDurations: [], opponentTiers: [] },
      },
      standings: new Map([["r1", { wins: 5, losses: 10 }]]),
      matches: [],
    } as any as BashoState;
    const input = KihakuService.extractFromBasho("r1", basho, 5, false);
    expect(input.isMakeKoshi).toBe(true);
  });

  it("detects kachi-koshi when wins >= losses", () => {
    const basho = {
      boutMetrics: {
        r1: { comebackWins: 0, edgeCrisisSurvived: 0, upsetCount: 0, boutDurations: [], opponentTiers: [] },
      },
      standings: new Map([["r1", { wins: 10, losses: 5 }]]),
      matches: [],
    } as any as BashoState;
    const input = KihakuService.extractFromBasho("r1", basho, 10, false);
    expect(input.isMakeKoshi).toBe(false);
  });
});

describe("KihakuService — evaluateRikishi", () => {
  it("returns 50 for a rikishi with no bout metrics", () => {
    const basho = {
      boutMetrics: undefined,
      standings: new Map([["r1", { wins: 10, losses: 5 }]]),
      matches: [],
    } as any as BashoState;
    const rikishi = { id: "r1", currentBashoWins: 10, absentFinalDay: false } as any;
    expect(KihakuService.evaluateRikishi(rikishi, basho)).toBe(50);
  });

  it("calculates score from metrics with playoff wins", () => {
    const basho = {
      boutMetrics: {
        r1: { comebackWins: 2, edgeCrisisSurvived: 1, upsetCount: 0, boutDurations: [], opponentTiers: [] },
      },
      standings: new Map([["r1", { wins: 13, losses: 2 }]]),
      matches: [
        makeMatch("playoff-1", 15, "r1", "r2"),
      ],
    } as any as BashoState;
    const rikishi = { id: "r1", currentBashoWins: 13, absentFinalDay: false } as any;
    // 2*15 + 1*10 + 1*20 + 1*8 (yusho-contention: r1 has 13 wins, leader has 14, within 1) = 68
    expect(KihakuService.evaluateRikishi(rikishi, basho)).toBe(68);
  });
});

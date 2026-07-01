/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { computeStandingsEvolution } from "@/components/basho/computeStandingsEvolution";
import type { BoutResult } from "@/engine/types/basho";

function makeBout(winnerId: string, loserId: string): BoutResult {
  return {
    boutId: `bout-${winnerId}-${loserId}`,
    winner: "east",
    winnerRikishiId: winnerId,
    loserRikishiId: loserId,
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 5,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
  } as BoutResult;
}

describe("computeStandingsEvolution", () => {
  it("computes cumulative wins per day for top rikishi", () => {
    const basho = {
      day: 3,
      results: [
        [makeBout("r1", "r2"), makeBout("r3", "r4")],
        [makeBout("r1", "r3"), makeBout("r2", "r4")],
        [makeBout("r1", "r4"), makeBout("r2", "r3")],
      ],
      standings: new Map([
        ["r1", { wins: 3, losses: 0 }],
        ["r2", { wins: 1, losses: 2 }],
        ["r3", { wins: 1, losses: 2 }],
        ["r4", { wins: 0, losses: 3 }],
      ]),
    };

    const rikishiMap = new Map([
      ["r1", { id: "r1", shikona: "Alpha", rank: "yokozuna" }],
      ["r2", { id: "r2", shikona: "Beta", rank: "ozeki" }],
      ["r3", { id: "r3", shikona: "Gamma", rank: "sekiwake" }],
      ["r4", { id: "r4", shikona: "Delta", rank: "maegashira" }],
    ]);

    const { data, topIds } = computeStandingsEvolution(
      basho as any,
      rikishiMap as any,
      8
    );

    expect(data).toHaveLength(3);
    expect(topIds[0]).toBe("r1");
    expect(data[0].day).toBe(1);
    expect(data[2].Alpha).toBe(3);
  });

  it("respects maxLines limit", () => {
    const standings = new Map();
    for (let i = 0; i < 10; i++) {
      standings.set(`r${i}`, { wins: 10 - i, losses: i });
    }

    const basho = {
      day: 2,
      results: [[makeBout("r0", "r1")], [makeBout("r0", "r2")]],
      standings,
    };

    const rikishiMap = new Map();
    for (let i = 0; i < 10; i++) {
      rikishiMap.set(`r${i}`, {
        id: `r${i}`,
        shikona: `R${i}`,
        rank: "maegashira",
      });
    }

    const { topIds } = computeStandingsEvolution(
      basho as any,
      rikishiMap as any,
      4
    );

    expect(topIds).toHaveLength(4);
    expect(topIds[0]).toBe("r0");
  });

  it("returns empty data before day 2", () => {
    const basho = {
      day: 1,
      results: [],
      standings: new Map(),
    };

    const { data, topIds } = computeStandingsEvolution(
      basho as any,
      new Map() as any,
      8
    );

    expect(data).toHaveLength(0);
    expect(topIds).toHaveLength(0);
  });

  it("handles rikishi not in rikishiMap by using ID as label", () => {
    const basho = {
      day: 2,
      results: [[makeBout("r1", "r2")], [makeBout("r1", "r2")]],
      standings: new Map([
        ["r1", { wins: 2, losses: 0 }],
        ["r2", { wins: 0, losses: 2 }],
      ]),
    };

    const { data } = computeStandingsEvolution(
      basho as any,
      new Map() as any,
      8
    );

    expect(data[0]["r1"]).toBeDefined();
    expect(data[1]["r1"]).toBe(2);
  });
});

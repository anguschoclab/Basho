/**
 * Spec (RED) — WS-11 leftovers: sekitori incumbent bonus + merit evidence.
 *
 * Real JSA conventions:
 *   - Incumbent preference: on a bubble call (bottom maegashira MK vs a
 *     marginal J1 promotable), the makuuchi incumbent keeps his slot — the
 *     committee only swaps when the challenger's case is clear.
 *   - Crossover evidence: bouts fought against the opposite sekitori
 *     division are direct boundary evidence — a J1 man who beat makuuchi
 *     opponents has proven the swap; an in-zone makushita who beat juryo
 *     opponents has proven his claim.
 *
 * Implementation shape: SEKITORI_INCUMBENT_BONUS damps a sekitori
 * incumbent's desiredKey drift (status-quo bias), CROSS_DIVISION_WIN_BONUS
 * adds per-win merit on top — so a bubble challenger who proved himself in
 * crossover bouts still wins the call.
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import { buildPerformanceList } from "@/engine/banzuke/publish/performance";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

function entry(
  id: string,
  rank: string,
  rankNumber: number | undefined,
  side: "east" | "west",
  division: string
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank, rankNumber, side } as RankPosition,
    division: division as BanzukeEntry["division"],
  };
}
const perf = (id: string, w: number, l: number, x: Partial<BashoPerformance> = {}): BashoPerformance => ({
  rikishiId: id,
  wins: w,
  losses: l,
  absences: 0,
  ...x,
});

/**
 * The J→M bubble: a realistic makuuchi sheet (1Y + 2O + 2S + 2K sanyaku +
 * 35 maegashira = 42; bottom maegashira m35 make-koshi 7-8, everyone else
 * neutral 8-7) and 28 juryo (all 8-7; only J1 clears the J1-line). 60
 * makushita all 3-4 so no Ms→J pressure muddies the bubble. The single
 * contested outcome: does the J1 promotable displace the bottom
 * maegashira, or does the incumbent hold?
 */
function bubbleSheet(j1Extra: Partial<BashoPerformance> = {}) {
  const entries: BanzukeEntry[] = [];
  const perfs = new Map<string, BashoPerformance>();
  const sanyaku: Array<[string, string]> = [
    ["y1", "yokozuna"],
    ["o1", "ozeki"],
    ["o2", "ozeki"],
    ["s1", "sekiwake"],
    ["s2", "sekiwake"],
    ["k1", "komusubi"],
    ["k2", "komusubi"],
  ];
  for (const [id, rank] of sanyaku) {
    entries.push(entry(id, rank, 1, "east", "makuuchi"));
    perfs.set(id, perf(id, 8, 7));
  }
  for (let i = 1; i <= 35; i++) {
    const id = i === 35 ? "m35" : `m${i}`;
    entries.push(entry(id, "maegashira", i, i % 2 ? "east" : "west", "makuuchi"));
    perfs.set(id, perf(id, ...(i === 35 ? [7, 8] : [8, 7]) as [number, number]));
  }
  for (let i = 1; i <= 28; i++) {
    const id = i === 1 ? "j1" : `j${i}`;
    entries.push(entry(id, "juryo", i, i % 2 ? "east" : "west", "juryo"));
    perfs.set(id, perf(id, 8, 7, i === 1 ? j1Extra : {}));
  }
  for (let i = 1; i <= 60; i++) {
    const id = `ms${i}`;
    entries.push(entry(id, "makushita", i, i % 2 ? "east" : "west", "makushita"));
    perfs.set(id, perf(id, 3, 4));
  }
  return { entries, perfs };
}

function divisionOf(result: ReturnType<typeof updateBanzuke>, id: string) {
  return result.newBanzuke.find((e) => e.rikishiId === id)?.position.rank;
}

describe("sekitori incumbent bonus — bubble calls favor the incumbent", () => {
  it("a marginal J1 promotable (8-7) does NOT displace a 7-8 bottom maegashira", () => {
    const { entries, perfs } = bubbleSheet();
    const world = MockFactory.createWorld();
    for (const e of entries) {
      world.rikishi.set(
        e.rikishiId,
        MockFactory.createRikishi(e.rikishiId, { division: e.division as never })
      );
    }
    const result = updateBanzuke(entries, perfs, world, {});
    expect(divisionOf(result, "m35")).toBe("maegashira");
    expect(divisionOf(result, "j1")).toBe("juryo");
  });

  it("the incumbent bonus cannot hold a clearly beaten man — J1 12-3 still promotes", () => {
    const { entries, perfs } = bubbleSheet();
    perfs.set("j1", perf("j1", 12, 3));
    const world = MockFactory.createWorld();
    for (const e of entries) {
      world.rikishi.set(
        e.rikishiId,
        MockFactory.createRikishi(e.rikishiId, { division: e.division as never })
      );
    }
    const result = updateBanzuke(entries, perfs, world, {});
    expect(divisionOf(result, "j1")).toBe("maegashira");
    expect(divisionOf(result, "m35")).toBe("juryo");
  });
});

describe("cross-division merit evidence", () => {
  it("crossover wins win the bubble call — J1 8-7 with 3 wins vs makuuchi promotes", () => {
    const { entries, perfs } = bubbleSheet({ crossDivisionWins: 3 });
    const world = MockFactory.createWorld();
    for (const e of entries) {
      world.rikishi.set(
        e.rikishiId,
        MockFactory.createRikishi(e.rikishiId, { division: e.division as never })
      );
    }
    const result = updateBanzuke(entries, perfs, world, {});
    expect(divisionOf(result, "j1")).toBe("maegashira");
  });

  it("in-zone makushita callup wins strengthen the promotion claim", () => {
    // Two identical in-zone promotables; only A has crossover evidence.
    const entries: BanzukeEntry[] = [];
    const perfs = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 28; i++) {
      entries.push(entry(`j${i}`, "juryo", i, i % 2 ? "east" : "west", "juryo"));
      perfs.set(`j${i}`, perf(`j${i}`, 7, 8)); // all juryo MK → slots open
    }
    entries.push(entry("msA", "makushita", 3, "east", "makushita"));
    entries.push(entry("msB", "makushita", 3, "west", "makushita"));
    perfs.set("msA", perf("msA", 4, 3, { crossDivisionWins: 2 }));
    perfs.set("msB", perf("msB", 4, 3));
    for (let i = 4; i <= 60; i++) {
      entries.push(entry(`ms${i}`, "makushita", i, i % 2 ? "east" : "west", "makushita"));
      perfs.set(`ms${i}`, perf(`ms${i}`, 3, 4));
    }
    const world = MockFactory.createWorld();
    for (const e of entries) {
      world.rikishi.set(
        e.rikishiId,
        MockFactory.createRikishi(e.rikishiId, { division: e.division as never })
      );
    }
    const result = updateBanzuke(entries, perfs, world, {});
    const a = result.newBanzuke.find((e) => e.rikishiId === "msA")!;
    const b = result.newBanzuke.find((e) => e.rikishiId === "msB")!;
    expect(a.position.rank).toBe("juryo");
    expect(b.position.rank).toBe("juryo");
    // Same record, same rank — the callup wins put A on the higher rung
    // (lower rankNumber, or the east side when rungs tie).
    const rankOrder = (p: typeof a.position) =>
      (p.rankNumber ?? 99) * 2 + (p.side === "east" ? 0 : 1);
    expect(rankOrder(a.position)).toBeLessThan(rankOrder(b.position));
  });
});

describe("buildPerformanceList — crossover evidence wiring", () => {
  it("counts wins and the pulled-up flag from tagged crossover bouts", () => {
    const world = MockFactory.createWorld();
    world.rikishi.set("j1", MockFactory.createRikishi("j1", { division: "juryo", rank: "juryo" }));
    world.rikishi.set("msA", MockFactory.createRikishi("msA", { division: "makushita", rank: "makushita" }));
    world.currentBanzuke = undefined;
    world.activeRikishiIds = new Set(["j1", "msA"]);

    const basho = MockFactory.createBasho({
      bashoName: "hatsu",
      matches: [
        {
          boutId: "x-1",
          day: 5,
          eastRikishiId: "j1",
          westRikishiId: "msA",
          crossDivisionCallupId: "msA",
          result: {
            boutId: "x-1",
            winner: "west",
            winnerRikishiId: "msA",
            loserRikishiId: "j1",
            kimarite: "yorikiri",
          } as never,
        },
      ],
    });
    const builder = createImpactBuilder("test");
    const list = buildPerformanceList(
      world,
      basho,
      [
        ["j1", { wins: 7, losses: 8 }],
        ["msA", { wins: 5, losses: 2 }],
      ],
      builder
    );
    const jPerf = list.find((p) => p.rikishiId === "j1")!;
    const msPerf = list.find((p) => p.rikishiId === "msA")!;
    expect(msPerf.crossDivisionWins).toBe(1);
    expect(msPerf.crossoverPulledUp).toBe(true);
    expect(jPerf.crossoverPulledUp ?? false).toBe(false);
  });
});

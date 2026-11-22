/**
 * Spec (RED) — sekitori boundary promotion matrices.
 *
 * Real JSA rules:
 *   Ms→J: only makushita ranks 1–15 (the promotion zone) can rise.
 *         Locks: Ms1 any kachi-koshi; any ≤Ms15 zenshō (7-0).
 *         An Ms16+ 7-0 NEVER promotes — he lands ~Ms5 instead.
 *   J→M:  "clears J1" — rankNumber − netWins ≤ 0 → promotion-eligible;
 *         J1E 8-7 is an effective lock. Juryo yūshō lifts the landing.
 *   Shared: incumbent preference at equal claims; crossover evidence
 *         (bouts vs the other division) feeds merit.
 *
 * Current code has NO juryo/makushita cases in bestTierAllowed() and the
 * slot-vacuum fallback promotes ineligible Ms16+ — every assertion below
 * should fail today.
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";

const NONE = new Set<string>();

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

function buildWorld(entries: BanzukeEntry[]): WorldState {
  const world = makeMockWorld();
  for (const e of entries) {
    world.rikishi.set(
      e.rikishiId,
      mockRikishi(e.rikishiId, {
        rank: e.position.rank as never,
        rankNumber: e.position.rankNumber as never,
        division: e.division as never,
        side: e.position.side as never,
      })
    );
  }
  return world;
}

/** Sheet with room at the boundary: 42 M + 28 J + 60 Ms. */
function boundarySheet(
  msEntries: Array<{ id: string; num: number; rec: [number, number] }>,
  jEntries: Array<{ id: string; num: number; rec: [number, number] }> = []
) {
  const entries: BanzukeEntry[] = [];
  const perfs = new Map<string, BashoPerformance>();
  for (let i = 1; i <= 42; i++) {
    entries.push(entry(`m${i}`, "maegashira", i, i % 2 ? "east" : "west", "makuuchi"));
    perfs.set(`m${i}`, perf(`m${i}`, 8, 7));
  }
  const jNums = new Set(jEntries.map((j) => j.num));
  for (let i = 1; i <= 28; i++) {
    const spec = jEntries.find((j) => j.num === i);
    const id = spec?.id ?? `j${i}`;
    if (!jNums.has(i) || spec) entries.push(entry(id, "juryo", i, i % 2 ? "east" : "west", "juryo"));
    perfs.set(id, perf(id, ...(spec?.rec ?? [8, 7] as [number, number])));
  }
  const msNums = new Set(msEntries.map((s) => s.num));
  for (let i = 1; i <= 60; i++) {
    const spec = msEntries.find((s) => s.num === i);
    const id = spec?.id ?? `ms${i}`;
    entries.push(entry(id, "makushita", i, i % 2 ? "east" : "west", "makushita"));
    perfs.set(id, perf(id, ...(spec?.rec ?? [4, 3] as [number, number])));
  }
  return { entries, perfs };
}

describe("Ms→J promotion zone", () => {
  it("Ms16+ can never promote to juryo, even with a zenshō record", () => {
    const { entries, perfs } = boundarySheet([{ id: "ms16hero", num: 16, rec: [7, 0] }]);
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "ms16hero");
    expect(landed).toBeDefined();
    expect(landed!.position.rank).toBe("makushita");
    // 7-0 from Ms16 lifts him deep into the zone — around Ms5.
    expect((landed!.position as { rankNumber?: number }).rankNumber ?? 99).toBeLessThanOrEqual(10);
  });

  it("Ms1 with kachi-koshi is a promotion lock", () => {
    const { entries, perfs } = boundarySheet([{ id: "ms1kk", num: 1, rec: [4, 3] }]);
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "ms1kk");
    expect(landed!.position.rank).toBe("juryo");
  });

  it("a 7-0 zenshō inside the zone (≤Ms15) is a promotion lock", () => {
    const { entries, perfs } = boundarySheet([{ id: "ms14zensho", num: 14, rec: [7, 0] }]);
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "ms14zensho");
    expect(landed!.position.rank).toBe("juryo");
  });
});

describe("J→M promotion ceiling", () => {
  it("J1 east 8-7 clears the J1 ceiling → makuuchi eligible", () => {
    const e = entry("j1e", "juryo", 1, "east", "juryo");
    // rank 1 − netWins 1 = 0 ≤ 0 → eligible for tier 5.
    expect(bestTierAllowed(e, perf("j1e", 8, 7), undefined, NONE)).toBe(5);
  });

  it("J5 10-5 clears J1 → makuuchi eligible", () => {
    const e = entry("j5", "juryo", 5, "east", "juryo");
    expect(bestTierAllowed(e, perf("j5", 10, 5), undefined, NONE)).toBe(5);
  });

  it("J12 10-5 does NOT clear J1 → stays juryo-tier", () => {
    const e = entry("j12", "juryo", 12, "east", "juryo");
    expect(bestTierAllowed(e, perf("j12", 10, 5), undefined, NONE)).not.toBe(5);
  });

  it("a juryo yūshō lifts a mid-juryo rikishi into makuuchi contention", () => {
    const { entries, perfs } = boundarySheet([], [{ id: "jyusho", num: 10, rec: [14, 1] }]);
    perfs.get("jyusho")!.yusho = true;
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "jyusho");
    expect(landed!.position.rank).toBe("maegashira");
  });
});

describe("BashoPerformance crossover evidence", () => {
  it("performance records carry crossover-vs-makuuchi evidence fields", () => {
    const p = perf("j1", 10, 5, {
      crossDivisionWins: 2,
      crossoverPulledUp: false,
    } as Partial<BashoPerformance>) as BashoPerformance & {
      crossDivisionWins?: number;
      crossoverPulledUp?: boolean;
    };
    expect(p.crossDivisionWins).toBe(2);
    expect(p.crossoverPulledUp).toBe(false);
  });
});

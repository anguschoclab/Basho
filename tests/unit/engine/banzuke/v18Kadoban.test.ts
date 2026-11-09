/**
 * v18Kadoban.test.ts
 * ==================
 * V18 failing-first regression pin: ozeki kadoban state goes stale across a
 * demotion → re-promotion cycle.
 *
 * Root cause chain (banzuke/banzukeOps.ts):
 *   - resolveOzekiStatuses (:227) clones the previous kadoban map wholesale
 *     and only rewrites entries for rikishi whose CURRENT banzuke position
 *     is ozeki (:230-241).
 *   - A demoted ozeki leaves the loop, so their entry keeps whatever
 *     consecutiveMakeKoshi the demotion produced (≥ 2) — indefinitely.
 *   - When the rikishi is later re-promoted and eats one make-koshi,
 *     getOzekiStatus (ozekiLogic.ts:26-29) accumulates on the stale counter:
 *     nextConsecutive = 3 → `isKadoban: nextConsecutive === 1` → false →
 *     immediate re-demotion, skipping the kadoban grace basho entirely.
 *
 * Correct semantics (real sumo): a re-promoted ozeki's first make-koshi is
 * kadoban grace — demotion requires consecutive make-koshi as an ozeki.
 *
 * Fixture conventions follow tests/unit/engine/banzuke/ozekiDemotionFlow.test.ts.
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";

function makeEntry(
  id: string,
  rank: string,
  rankNumber: number | undefined,
  side: "east" | "west",
  division: string = "makuuchi"
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank: rank as never, rankNumber, side } as RankPosition,
    division: division as never,
  } as BanzukeEntry;
}

/** Minimal makuuchi banzuke: R at ozeki plus sanyaku/maegashira fillers. */
function banzukeWith(rRank: string): BanzukeEntry[] {
  return [
    makeEntry("R", rRank, undefined, "east"),
    makeEntry("o2", "ozeki", undefined, "west"),
    makeEntry("s1", "sekiwake", undefined, "east"),
    makeEntry("s2", "sekiwake", undefined, "west"),
    makeEntry("k1", "komusubi", undefined, "east"),
    makeEntry("k2", "komusubi", undefined, "west"),
    makeEntry("m1", "maegashira", 1, "east"),
    makeEntry("m2", "maegashira", 2, "west"),
    makeEntry("m3", "maegashira", 3, "east"),
    makeEntry("m4", "maegashira", 4, "west"),
  ];
}

function worldFor(entries: BanzukeEntry[], kadoban: Parameters<typeof updateBanzuke>[3]) {
  const world = makeMockWorld();
  world.ozekiKadoban = kadoban;
  for (const e of entries) {
    world.rikishi.set(
      e.rikishiId,
      mockRikishi(e.rikishiId, {
        rank: e.position.rank as never,
        division: e.division as never,
        heyaId: "heya-1",
      })
    );
  }
  return world;
}

const PERF_7_8 = { wins: 7, losses: 8, absences: 0 } as BashoPerformance;
const PERF_5_10 = { wins: 5, losses: 10, absences: 0 } as BashoPerformance;
const PERF_10_5 = { wins: 10, losses: 5, absences: 0 } as BashoPerformance;

describe("V18-K1 — kadoban residue survives an ozeki demotion", () => {
  it("a demoted ozeki's kadoban entry is reset, not retained at consecutiveMakeKoshi ≥ 2", () => {
    const entries = banzukeWith("ozeki");
    const prevKadoban = {
      R: { isKadoban: true, consecutiveMakeKoshi: 1 }, // kadoban entering the basho
      o2: { isKadoban: false, consecutiveMakeKoshi: 0 },
    };
    const world = worldFor(entries, prevKadoban);
    const perfById = new Map<string, BashoPerformance>([
      ["R", PERF_5_10], // second consecutive make-koshi → demotion
      ["o2", PERF_10_5],
      ["s1", PERF_10_5],
      ["s2", PERF_10_5],
    ]);

    const result = updateBanzuke(entries, perfById, world, prevKadoban);

    // R is demoted; the demotion must close out its ozeki make-koshi count.
    // Today the map keeps { isKadoban: false, consecutiveMakeKoshi: 2 },
    // which is what poisons the eventual re-promotion. FAILS today.
    const entry = result.updatedOzekiKadoban["R"];
    expect(entry === undefined || entry.consecutiveMakeKoshi === 0).toBe(true);
  });
});

describe("V18-K2 — first make-koshi after re-promotion is kadoban grace", () => {
  it("a re-promoted ozeki going 7-8 enters kadoban, not immediate demotion", () => {
    const entries = banzukeWith("ozeki"); // R is ozeki again (re-promoted)
    // Residue exactly as production leaves it after the demotion basho:
    // resolveOzekiStatuses skips non-ozeki entries, so this entry persisted
    // unchanged through R's sekiwake basho.
    const prevKadoban = {
      R: { isKadoban: false, consecutiveMakeKoshi: 2 },
      o2: { isKadoban: false, consecutiveMakeKoshi: 0 },
    };
    const world = worldFor(entries, prevKadoban);
    const perfById = new Map<string, BashoPerformance>([
      ["R", PERF_7_8], // first make-koshi since reclaiming the rank
      ["o2", PERF_10_5],
      ["s1", PERF_10_5],
      ["s2", PERF_10_5],
    ]);

    const result = updateBanzuke(entries, perfById, world, prevKadoban);

    // Expected: first make-koshi of the new ozeki tenure → kadoban grace.
    // Actual today: { isKadoban: false, consecutiveMakeKoshi: 3 } → the
    // demotedOzeki set scoops R up and it is thrown straight back down.
    // FAILS today.
    expect(result.updatedOzekiKadoban["R"]).toEqual({
      isKadoban: true,
      consecutiveMakeKoshi: 1,
    });
  });

  it("the demotion is observable in the banzuke, not just the counter", () => {
    const entries = banzukeWith("ozeki");
    const prevKadoban = {
      R: { isKadoban: false, consecutiveMakeKoshi: 2 },
      o2: { isKadoban: false, consecutiveMakeKoshi: 0 },
    };
    const world = worldFor(entries, prevKadoban);
    const perfById = new Map<string, BashoPerformance>([
      ["R", PERF_7_8],
      ["o2", PERF_10_5],
      ["s1", PERF_10_5],
      ["s2", PERF_10_5],
    ]);

    const result = updateBanzuke(entries, perfById, world, prevKadoban);

    // Kadoban ozeki survive a single make-koshi — R must keep the ozeki slot.
    // FAILS today: R is demoted because the stale counter reaches 3.
    const rSlot = result.newBanzuke.find((e) => e.rikishiId === "R");
    expect(rSlot?.position.rank).toBe("ozeki");
  });
});

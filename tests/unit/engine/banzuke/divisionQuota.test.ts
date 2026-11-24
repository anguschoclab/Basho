import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";

// ---------------------------------------------------------------------------
// Division quota invariant — every printed banzuke carries its fixed count.
//
// Measured (diagnostic-25yr): makuuchi sagged to 38–39 in the late years —
// an invalid sheet. Real division membership is fixed (M42 / J28 / Ms120 /
// Sd200 / Jd~240); the committee ALWAYS fills the slots — the promotion bar
// flexes to meet the quota, never the reverse. The WS-11 earned-eligibility
// ceilings stay (they order WHO fills first), but when qualified promotees
// run out the top of the adjacent division fills the vacancy.
// ---------------------------------------------------------------------------

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

const perf = (id: string, w: number, l: number): BashoPerformance => ({
  rikishiId: id,
  wins: w,
  losses: l,
  absences: 0,
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

function countDivision(banzuke: BanzukeEntry[], division: string): number {
  return banzuke.filter((e) => e.division === division).length;
}

describe("division quota — sekitori tiers never publish short", () => {
  it("makuuchi fills to 42 by pulling top juryo when no promotee earns the jump", () => {
    // 5 maegashira slots vacant (fewer bodies than slots) — and every juryo
    // man posts a 4-11, so NOBODY clears the J→M earned ceiling. The quota
    // backstop must still print 42: the top juryo records fill the gap.
    const entries: BanzukeEntry[] = [];
    const perfs = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 37; i++) {
      entries.push(entry(`m${i}`, "maegashira", i, i % 2 ? "east" : "west", "makuuchi"));
      perfs.set(`m${i}`, perf(`m${i}`, 8, 7));
    }
    for (let i = 1; i <= 28; i++) {
      entries.push(entry(`j${i}`, "juryo", i, i % 2 ? "east" : "west", "juryo"));
      perfs.set(`j${i}`, perf(`j${i}`, 4, 11));
    }
    for (let i = 1; i <= 60; i++) {
      entries.push(entry(`ms${i}`, "makushita", i, i % 2 ? "east" : "west", "makushita"));
      perfs.set(`ms${i}`, perf(`ms${i}`, 3, 4));
    }

    const result = updateBanzuke(entries, perfs, buildWorld(entries), {});
    expect(countDivision(result.newBanzuke, "makuuchi")).toBe(42);
  });

  it("juryo fills to 28 by pulling top makushita when nobody earns Ms→J", () => {
    const entries: BanzukeEntry[] = [];
    const perfs = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 42; i++) {
      entries.push(entry(`m${i}`, "maegashira", i, i % 2 ? "east" : "west", "makuuchi"));
      perfs.set(`m${i}`, perf(`m${i}`, 8, 7));
    }
    for (let i = 1; i <= 23; i++) {
      entries.push(entry(`j${i}`, "juryo", i, i % 2 ? "east" : "west", "juryo"));
      perfs.set(`j${i}`, perf(`j${i}`, 6, 9));
    }
    // All makushita mediocre — nobody qualifies through the Ms→J zone.
    for (let i = 1; i <= 60; i++) {
      entries.push(entry(`ms${i}`, "makushita", i, i % 2 ? "east" : "west", "makushita"));
      perfs.set(`ms${i}`, perf(`ms${i}`, 3, 4));
    }

    const result = updateBanzuke(entries, perfs, buildWorld(entries), {});
    expect(countDivision(result.newBanzuke, "juryo")).toBe(28);
  });

  it("earned promotees fill before the quota backstop", () => {
    // Makuuchi short by 2; J1 posts a clearable record and earns the jump
    // normally — he must take a makuuchi slot before any unearned backfill.
    const entries: BanzukeEntry[] = [];
    const perfs = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 40; i++) {
      entries.push(entry(`m${i}`, "maegashira", i, i % 2 ? "east" : "west", "makuuchi"));
      perfs.set(`m${i}`, perf(`m${i}`, 8, 7));
    }
    entries.push(entry("j1earner", "juryo", 1, "east", "juryo"));
    perfs.set("j1earner", perf("j1earner", 9, 6)); // J1 9-6: clears J1 → earned
    for (let i = 2; i <= 28; i++) {
      entries.push(entry(`j${i}`, "juryo", i, i % 2 ? "east" : "west", "juryo"));
      perfs.set(`j${i}`, perf(`j${i}`, 4, 11));
    }
    for (let i = 1; i <= 60; i++) {
      entries.push(entry(`ms${i}`, "makushita", i, i % 2 ? "east" : "west", "makushita"));
      perfs.set(`ms${i}`, perf(`ms${i}`, 3, 4));
    }

    const result = updateBanzuke(entries, perfs, buildWorld(entries), {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "j1earner");
    expect(landed?.division).toBe("makuuchi");
    expect(countDivision(result.newBanzuke, "makuuchi")).toBe(42);
  });
});

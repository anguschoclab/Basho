/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "../utils";

function makeEntry(
  id: string,
  rank: string,
  rankNumber: number | undefined,
  side: "east" | "west",
  division: string = "makuuchi"
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank: rank as any, rankNumber, side } as RankPosition,
    division: division as any,
  } as BanzukeEntry;
}

describe("ozeki demotion flow — demoted ozeki not re-seated in ozeki slot", () => {
  it("a demoted ozeki is assigned to sekiwake or below, not re-seated as ozeki", () => {
    // 2 ozeki: one stays (o1), one is demoted (o2)
    // The demoted ozeki (o2) should NOT appear in an ozeki slot in the new banzuke
    const entries: BanzukeEntry[] = [
      makeEntry("o1", "ozeki", undefined, "east"),
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

    // o2 has a second consecutive make-koshi → demoted
    const perfById = new Map<string, BashoPerformance>([
      ["o1", { wins: 10, losses: 5, absences: 0 } as any],
      ["o2", { wins: 5, losses: 10, absences: 0 } as any],
      ["s1", { wins: 8, losses: 7, absences: 0 } as any],
      ["s2", { wins: 8, losses: 7, absences: 0 } as any],
    ]);

    const world = makeMockWorld();
    world.ozekiKadoban = {
      o1: { isKadoban: false, consecutiveMakeKoshi: 0 },
      o2: { isKadoban: true, consecutiveMakeKoshi: 1 },
    };

    for (const e of entries) {
      world.rikishi.set(
        e.rikishiId,
        mockRikishi(e.rikishiId, {
          rank: e.position.rank as any,
          division: e.division as any,
          heyaId: "heya-1",
        })
      );
    }

    const result = updateBanzuke(entries, perfById, world, world.ozekiKadoban);

    // Find where o2 was placed
    const o2Entry = result.newBanzuke.find((e) => e.rikishiId === "o2");
    expect(o2Entry).toBeDefined();
    expect(o2Entry!.position.rank).not.toBe("ozeki");
  });
});

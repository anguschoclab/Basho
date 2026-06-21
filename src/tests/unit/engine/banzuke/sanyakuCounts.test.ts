/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { computeVariableSanyakuCounts } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";

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

describe("computeVariableSanyakuCounts — ozeki slot cap", () => {
  it("clamps ozeki count to max 4 even with many eligible ozeki + sekiwake promoters", () => {
    const entries: BanzukeEntry[] = [
      makeEntry("o1", "ozeki", undefined, "east"),
      makeEntry("o2", "ozeki", undefined, "west"),
      makeEntry("o3", "ozeki", undefined, "east"),
      makeEntry("o4", "ozeki", undefined, "west"),
      makeEntry("o5", "ozeki", undefined, "east"),
      makeEntry("s1", "sekiwake", undefined, "east"),
      makeEntry("s2", "sekiwake", undefined, "west"),
      makeEntry("k1", "komusubi", undefined, "east"),
      makeEntry("k2", "komusubi", undefined, "west"),
      makeEntry("m1", "maegashira", 1, "east"),
      makeEntry("m2", "maegashira", 2, "west"),
    ];

    const perfById = new Map<string, BashoPerformance>([
      ["s1", { wins: 12, losses: 3, absences: 0 } as any],
      ["s2", { wins: 11, losses: 4, absences: 0 } as any],
    ]);

    const result = computeVariableSanyakuCounts(entries, perfById, new Set());
    expect(result.ozeki).toBeLessThanOrEqual(4);
    expect(result.ozeki).toBeGreaterThanOrEqual(2);
  });

  it("ensures minimum 2 ozeki slots even with no ozeki", () => {
    const entries: BanzukeEntry[] = [
      makeEntry("s1", "sekiwake", undefined, "east"),
      makeEntry("s2", "sekiwake", undefined, "west"),
      makeEntry("k1", "komusubi", undefined, "east"),
      makeEntry("k2", "komusubi", undefined, "west"),
      makeEntry("m1", "maegashira", 1, "east"),
    ];

    const perfById = new Map<string, BashoPerformance>();
    const result = computeVariableSanyakuCounts(entries, perfById, new Set());
    expect(result.ozeki).toBeGreaterThanOrEqual(2);
  });

  it("allows 3 ozeki when exactly 3 are eligible", () => {
    const entries: BanzukeEntry[] = [
      makeEntry("o1", "ozeki", undefined, "east"),
      makeEntry("o2", "ozeki", undefined, "west"),
      makeEntry("o3", "ozeki", undefined, "east"),
      makeEntry("s1", "sekiwake", undefined, "east"),
      makeEntry("s2", "sekiwake", undefined, "west"),
      makeEntry("k1", "komusubi", undefined, "east"),
      makeEntry("k2", "komusubi", undefined, "west"),
    ];

    const perfById = new Map<string, BashoPerformance>();
    const result = computeVariableSanyakuCounts(entries, perfById, new Set());
    expect(result.ozeki).toBe(3);
  });
});

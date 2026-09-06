import { describe, it, expect } from "vitest";
import { boundHistoryArrays, ALMANAC_SNAPSHOTS_MAX } from "@/engine/tick/phases/boundHistoryArrays";
import { makeMockWorld } from "../../utils";
import type { AlmanacSnapshot } from "@/engine/almanac";

function makeAlmanacSnapshot(year: number, bashoNumber: number): AlmanacSnapshot {
  return {
    year,
    bashoNumber,
    bashoName: "Hatsu",
    makuuchiSummary: {
      yushoWinnerId: "r-1",
      yushoWinnerShikona: "Test",
      championRecord: { wins: 15, losses: 0 },
    },
  } as unknown as AlmanacSnapshot;
}

describe("almanacSnapshots bounding", () => {
  it("bounds almanacSnapshots to last 6", () => {
    const snapshots = Array.from({ length: 12 }, (_, i) =>
      makeAlmanacSnapshot(2000 + Math.floor(i / 6), (i % 6) + 1)
    );

    const world = makeMockWorld({ almanacSnapshots: snapshots });
    const result = boundHistoryArrays(world);

    expect(result.almanacSnapshots).toHaveLength(6);
    // Most recent 6 should be retained (last 6 of the array)
    expect(result.almanacSnapshots![0].bashoNumber).toBe(1);
    expect(result.almanacSnapshots![0].year).toBe(2001);
    expect(result.almanacSnapshots![5].bashoNumber).toBe(6);
    expect(result.almanacSnapshots![5].year).toBe(2001);
  });

  it("does not truncate under 6", () => {
    const snapshots = Array.from({ length: 3 }, (_, i) => makeAlmanacSnapshot(2000, i + 1));

    const world = makeMockWorld({ almanacSnapshots: snapshots });
    const result = boundHistoryArrays(world);

    expect(result.almanacSnapshots).toHaveLength(3);
  });

  it("preserves most recent entries when truncating", () => {
    const snapshots = Array.from({ length: 10 }, (_, i) =>
      makeAlmanacSnapshot(2000 + i, 1) // each has unique year
    );

    const world = makeMockWorld({ almanacSnapshots: snapshots });
    const result = boundHistoryArrays(world);

    expect(result.almanacSnapshots).toHaveLength(6);
    // First 4 (years 2000-2003) should be dropped, last 6 (years 2004-2009) retained
    expect(result.almanacSnapshots![0].year).toBe(2004);
    expect(result.almanacSnapshots![5].year).toBe(2009);
  });

  it("returns world unchanged when under cap and history/awardLog under cap", () => {
    const snapshots = Array.from({ length: 3 }, (_, i) => makeAlmanacSnapshot(2000, i + 1));

    const world = makeMockWorld({
      almanacSnapshots: snapshots,
      history: [],
      awardLog: [],
    });

    const result = boundHistoryArrays(world);
    // Should return the same reference (no allocation)
    expect(result).toBe(world);
  });

  it("ALMANAC_SNAPSHOTS_MAX is 6", () => {
    expect(ALMANAC_SNAPSHOTS_MAX).toBe(6);
  });

  it("handles undefined almanacSnapshots", () => {
    const world = makeMockWorld();
    world.almanacSnapshots = undefined;
    const result = boundHistoryArrays(world);
    // Should not crash
    expect(result).toBe(world);
  });
});

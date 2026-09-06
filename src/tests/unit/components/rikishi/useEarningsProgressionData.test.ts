/**
 * useEarningsProgressionData.test.ts
 * ==================================
 * Tests the useEarningsProgressionData hook which derives cumulative and
 * per-basho earnings from careerHistory snapshots.
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEarningsProgressionData } from "@/components/rikishi/useRikishiData";
import type { CareerSnapshot } from "@/engine/types/history";

function makeSnap(
  year: number,
  bashoName: string,
  totalEarningsAtBasho?: number
): CareerSnapshot {
  return {
    id: `snap-${bashoName}-${year}`,
    bashoId: `${bashoName}-${year}`,
    year,
    month: 1,
    bashoName,
    rank: "maegashira" as any,
    division: "makuuchi",
    rankNumber: 5,
    side: "east",
    wins: 8,
    losses: 7,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 140,
    momentum: 0,
    ...(totalEarningsAtBasho !== undefined ? { totalEarningsAtBasho } : {}),
  } as CareerSnapshot;
}

describe("useEarningsProgressionData", () => {
  it("returns empty array for undefined history", () => {
    const { result } = renderHook(() => useEarningsProgressionData(undefined));
    expect(result.current).toEqual([]);
  });

  it("returns empty array for empty history", () => {
    const { result } = renderHook(() => useEarningsProgressionData([]));
    expect(result.current).toEqual([]);
  });

  it("computes cumulative running sum and per-basho deltas", () => {
    // careerHistory is stored newest-first; the hook reverses to chronological
    const history: CareerSnapshot[] = [
      makeSnap(2024, "aki", 400), // newest first
      makeSnap(2024, "natsu", 250),
      makeSnap(2024, "hatsu", 100), // oldest last
    ];
    const { result } = renderHook(() => useEarningsProgressionData(history));
    const data = result.current;
    expect(data).toHaveLength(3);
    // Chronological order: hatsu, natsu, aki
    expect(data[0].basho).toBe("hatsu 2024");
    expect(data[0].cumulativeEarnings).toBe(100);
    expect(data[0].bashoEarnings).toBe(100);
    expect(data[1].basho).toBe("natsu 2024");
    expect(data[1].cumulativeEarnings).toBe(250);
    expect(data[1].bashoEarnings).toBe(150);
    expect(data[2].basho).toBe("aki 2024");
    expect(data[2].cumulativeEarnings).toBe(400);
    expect(data[2].bashoEarnings).toBe(150);
  });

  it("handles undefined totalEarningsAtBasho as 0", () => {
    const history: CareerSnapshot[] = [
      makeSnap(2024, "aki", 400), // newest first
      makeSnap(2024, "natsu"), // undefined → 0
      makeSnap(2024, "hatsu", 100), // oldest last
    ];
    const { result } = renderHook(() => useEarningsProgressionData(history));
    const data = result.current;
    expect(data[0].cumulativeEarnings).toBe(100);
    expect(data[0].bashoEarnings).toBe(100);
    expect(data[1].cumulativeEarnings).toBe(100); // 0, no change
    expect(data[1].bashoEarnings).toBe(0);
    expect(data[2].cumulativeEarnings).toBe(400);
    expect(data[2].bashoEarnings).toBe(300);
  });

  it("reverses history to chronological order", () => {
    const history: CareerSnapshot[] = [
      makeSnap(2025, "hatsu", 500), // newest first
      makeSnap(2024, "aki", 300),
      makeSnap(2024, "natsu", 150), // oldest last
    ];
    const { result } = renderHook(() => useEarningsProgressionData(history));
    const data = result.current;
    // Should be chronological: natsu 2024, aki 2024, hatsu 2025
    expect(data[0].basho).toBe("natsu 2024");
    expect(data[1].basho).toBe("aki 2024");
    expect(data[2].basho).toBe("hatsu 2025");
  });
});

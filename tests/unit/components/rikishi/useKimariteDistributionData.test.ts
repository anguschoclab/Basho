/**
 * useKimariteDistributionData.test.ts
 * ==================================
 * Tests the hook that shapes favoredKimariteDetailed into chart rows:
 * empty shapes, top-8 slice, desc ordering, capitalization, and
 * totalWins summed over the FULL detailed list.
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKimariteDistributionData } from "@/components/rikishi/useRikishiData";
import type { UIRikishi } from "@/presenters/uiModels";

function uiRikishi(
  detailed?: { kimarite: string; percentage: number; wins: number }[]
): UIRikishi {
  return { favoredKimariteDetailed: detailed } as unknown as UIRikishi;
}

describe("useKimariteDistributionData", () => {
  it("returns the empty shape for a null rikishi", () => {
    const { result } = renderHook(() => useKimariteDistributionData(null));
    expect(result.current).toEqual({ rows: [], totalWins: 0 });
  });

  it("returns the empty shape when no detailed kimarite exist", () => {
    const { result } = renderHook(() => useKimariteDistributionData(uiRikishi([])));
    expect(result.current).toEqual({ rows: [], totalWins: 0 });
  });

  it("maps to capitalized rows sorted by wins desc; totalWins covers the full list", () => {
    const detailed = Array.from({ length: 10 }, (_, i) => ({
      kimarite: `tech${i}`,
      percentage: 1,
      wins: i + 1,
    }));
    const { result } = renderHook(() => useKimariteDistributionData(uiRikishi(detailed)));
    expect(result.current.totalWins).toBe(55);
    expect(result.current.rows).toHaveLength(8);
    expect(result.current.rows[0]).toEqual({ name: "Tech9", wins: 10, percentage: 1 });
    expect(result.current.rows[7]).toEqual({ name: "Tech2", wins: 3, percentage: 1 });
  });
});

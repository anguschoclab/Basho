import { describe, it, expect } from "vitest";
import {
  selectAllTimeKimaritePercentages,
  selectKimariteObservedShare,
  selectKimaritePercentages,
} from "@/presenters/selectors";
import { makeMockWorld } from "../engine/utils";
import { KIMARITE_FREQUENCY_TARGETS } from "@/constants/engine/kimariteFrequencies";
import { KIMARITE_REGISTRY } from "@/engine/kimariteRegistry";

/**
 * selectKimaritePercentages joins world.globalKimariteStats with the registry
 * and real-world target table to produce the Almanac "Techniques" view:
 * observed share, real-world reference share, and rarity per kimarite.
 */
describe("selectKimaritePercentages", () => {
  it("returns empty array when no bouts have been recorded", () => {
    const world = makeMockWorld({ globalKimariteStats: {} });
    expect(selectKimaritePercentages(world)).toEqual([]);
  });

  it("computes observed percentages that sum to 100", () => {
    const world = makeMockWorld({
      globalKimariteStats: { yorikiri: 60, oshidashi: 30, tsutaezori: 10 },
    });
    const rows = selectKimaritePercentages(world);
    const total = rows.reduce((a, r) => a + r.observedPct, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it("returns per-kimarite rows sorted by count descending", () => {
    const world = makeMockWorld({
      globalKimariteStats: { oshidashi: 30, yorikiri: 60, tsutaezori: 10 },
    });
    const rows = selectKimaritePercentages(world);
    // Observed techniques lead the ordering; the full registry follows with
    // count 0 sorted by real-world share.
    expect(rows.slice(0, 3).map((r) => r.kimarite)).toEqual([
      "yorikiri",
      "oshidashi",
      "tsutaezori",
    ]);
    expect(rows[0].observedPct).toBeCloseTo(60, 1);
    expect(rows[2].observedPct).toBeCloseTo(10, 1);
  });

  it("includes every registered kimarite even when unobserved", () => {
    const world = makeMockWorld({ globalKimariteStats: { yorikiri: 3 } });
    const rows = selectKimaritePercentages(world);
    expect(rows.length).toBe(KIMARITE_REGISTRY.length);
    const unobserved = rows.filter((r) => r.count === 0);
    expect(unobserved.length).toBeGreaterThan(0);
    expect(unobserved.every((r) => r.observedPct === 0)).toBe(true);
  });

  it("includes real-world reference share and rarity", () => {
    const world = makeMockWorld({
      globalKimariteStats: { yorikiri: 5, tsutaezori: 1 },
    });
    const rows = selectKimaritePercentages(world);
    const yorikiri = rows.find((r) => r.kimarite === "yorikiri")!;
    expect(yorikiri.realWorldPct).toBeCloseTo(KIMARITE_FREQUENCY_TARGETS.yorikiri * 100, 4);
    expect(yorikiri.rarity).toBe("common");
    const tsutaezori = rows.find((r) => r.kimarite === "tsutaezori")!;
    expect(tsutaezori.rarity).toBe("legendary");
  });

  it("surfaces a display name from the registry", () => {
    const world = makeMockWorld({ globalKimariteStats: { yorikiri: 3 } });
    const rows = selectKimaritePercentages(world);
    expect(rows[0].name).toBe("Yorikiri");
  });
});

describe("selectAllTimeKimaritePercentages", () => {
  it("returns empty array when no all-time stats exist", () => {
    const world = makeMockWorld({ allTimeKimariteStats: {} });
    expect(selectAllTimeKimaritePercentages(world)).toEqual([]);
  });

  it("returns empty array when the field is absent (pre-1.4.0 saves)", () => {
    const world = makeMockWorld({ allTimeKimariteStats: undefined });
    expect(selectAllTimeKimaritePercentages(world)).toEqual([]);
  });

  it("reads allTimeKimariteStats, not the era-scoped map", () => {
    const world = makeMockWorld({
      globalKimariteStats: { yorikiri: 5 },
      allTimeKimariteStats: { yorikiri: 90, uwatenage: 10 },
    });
    const rows = selectAllTimeKimaritePercentages(world);
    const yorikiri = rows.find((r) => r.kimarite === "yorikiri")!;
    expect(yorikiri.count).toBe(90);
    expect(yorikiri.observedPct).toBeCloseTo(90, 1);
  });
});

describe("selectKimariteObservedShare", () => {
  it("returns the observed share of a technique this era", () => {
    const world = makeMockWorld({
      globalKimariteStats: { yorikiri: 60, oshidashi: 40 },
    });
    expect(selectKimariteObservedShare(world, "yorikiri")).toBeCloseTo(60, 1);
    expect(selectKimariteObservedShare(world, "oshidashi")).toBeCloseTo(40, 1);
  });

  it("returns undefined when the technique has no recorded endings", () => {
    const world = makeMockWorld({ globalKimariteStats: { yorikiri: 10 } });
    expect(selectKimariteObservedShare(world, "oshidashi")).toBeUndefined();
  });

  it("returns undefined when no bouts have been recorded", () => {
    const world = makeMockWorld({ globalKimariteStats: {} });
    expect(selectKimariteObservedShare(world, "yorikiri")).toBeUndefined();
  });
});

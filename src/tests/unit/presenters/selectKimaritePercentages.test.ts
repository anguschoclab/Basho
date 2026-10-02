import { describe, it, expect } from "vitest";
import { selectKimaritePercentages } from "@/presenters/selectors";
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

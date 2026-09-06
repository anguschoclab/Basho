import { describe, it, expect } from "vitest";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld } from "../utils";
import type { RetiredRikishiSummary } from "@/engine/types/history";

function makeSummary(id: string, overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id,
    shikona: `Wrestler-${id}`,
    birthYear: 1980,
    heyaId: `heya-${id}`,
    careerWins: 100,
    careerLosses: 50,
    yushoCount: 0,
    junYushoCount: 0,
    sanshoCount: 0,
    kinboshiCount: 0,
    totalEarnings: 0,
    peakRank: "maegashira",
    peakRankYear: 2010,
    peakDivision: "makuuchi",
    retirementYear: 2010,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [],
    isSummary: true,
    ...overrides,
  };
}

describe("updateHistoricalRikishi (ImpactBuilder + ImpactResolver)", () => {
  it("updateHistoricalRikishi writes to historicalRikishiUpdates, not rikishiUpdates", () => {
    const summary = makeSummary("r-1");
    const builder = createImpactBuilder("test");
    builder.updateHistoricalRikishi("r-1", summary);
    const impact = builder.build();

    // Should have historicalRikishiUpdates
    const histUpdates = impact.entities?.historicalRikishiUpdates;
    expect(histUpdates).toBeDefined();
    expect(histUpdates!.get("r-1")).toEqual(summary);

    // Should NOT have rikishiUpdates (the bug in the old archival.ts)
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });

  it("ImpactResolver applies historicalRikishiUpdates to world.historicalRikishi", () => {
    const summary = makeSummary("r-2", { careerWins: 250 });
    const world = makeMockWorld();
    world.historicalRikishi = new Map();

    const impact = createImpactBuilder("test")
      .updateHistoricalRikishi("r-2", summary)
      .build();

    const resolved = resolveImpacts(world, [impact]);

    const entry = resolved.historicalRikishi.get("r-2") as RetiredRikishiSummary;
    expect(entry).toBeDefined();
    expect(entry.careerWins).toBe(250);
    expect(entry.isSummary).toBe(true);
  });

  it("does not create ghost entries in world.rikishi", () => {
    const summary = makeSummary("r-ghost-test");
    const world = makeMockWorld();
    world.historicalRikishi = new Map();

    const impact = createImpactBuilder("test")
      .updateHistoricalRikishi("r-ghost-test", summary)
      .build();

    const resolved = resolveImpacts(world, [impact]);

    // Critical regression test: old archival.ts wrote to world.rikishi
    expect(resolved.rikishi.get("r-ghost-test")).toBeUndefined();
    expect(resolved.historicalRikishi.get("r-ghost-test")).toBeDefined();
  });

  it("merges with existing historicalRikishi entries", () => {
    const existingSummary = makeSummary("r-existing", { careerWins: 100 });
    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r-existing", existingSummary]]);

    const newSummary = makeSummary("r-new", { careerWins: 200 });
    const impact = createImpactBuilder("test")
      .updateHistoricalRikishi("r-new", newSummary)
      .build();

    const resolved = resolveImpacts(world, [impact]);

    // Existing entry should be preserved
    expect(resolved.historicalRikishi.get("r-existing")).toBeDefined();
    // New entry should be added
    expect(resolved.historicalRikishi.get("r-new")).toBeDefined();
    expect((resolved.historicalRikishi.get("r-new") as RetiredRikishiSummary).careerWins).toBe(200);
  });
});

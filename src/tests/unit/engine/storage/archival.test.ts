import { describe, it, expect } from "vitest";
import { runRetiredRikishiSummarization } from "@/engine/archival";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Rank, Division } from "@/engine/types/banzuke";

function makeSnapshot(
  year: number,
  rank: Rank,
  division: Division,
  wins: number,
  losses: number
): CareerSnapshot {
  return {
    id: `snap-${year}-${rank}`,
    bashoId: `basho-${year}`,
    year,
    month: 1,
    bashoName: "Hatsu",
    rank,
    division,
    rankNumber: 1,
    side: "east",
    wins,
    losses,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 140,
    momentum: 0,
  };
}

function makeHistoricalRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return mockRikishi(id, {
    isRetired: true,
    retirementYear: 2010,
    retirementReason: "Age",
    rank: "maegashira",
    division: "makuuchi",
    careerHistory: [makeSnapshot(2010, "maegashira", "makuuchi", 10, 5)],
    careerWins: 100,
    careerLosses: 50,
    ...overrides,
  });
}

function makeWorldWithHistorical(rikishi: Rikishi[]): WorldState {
  const world = makeMockWorld();
  world.historicalRikishi = new Map(rikishi.map((r) => [r.id, r]));
  return world;
}

// ── Regression tests for the OLD broken archival system ──────────────────────
// These tests assert that the bugs in the old runArchivalPruning are FIXED
// in the new runRetiredRikishiSummarization.

describe("runRetiredRikishiSummarization — regression: no ghost entries in world.rikishi", () => {
  it("does NOT create ghost entries in world.rikishi (was bug in old runArchivalPruning)", () => {
    const r = makeHistoricalRikishi("r-ghost-check");
    const world = makeWorldWithHistorical([r]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    // OLD BUG: archival.ts called builder.updateRikishi(id, r) which went to
    // rikishiUpdates → world.rikishi, creating ghost entries.
    // NEW: should write to historicalRikishi only.
    expect(resolved.rikishi.get("r-ghost-check")).toBeUndefined();
    expect(resolved.historicalRikishi.get("r-ghost-check")).toBeDefined();
  });
});

describe("runRetiredRikishiSummarization — regression: uses peakRank not retirement rank", () => {
  it("uses peakRank from career history, not retirement rank (was bug in old determineArchivalTier)", () => {
    // Rikishi peaked at ozeki but retired at jonokuchi
    // OLD BUG: determineArchivalTier used r.rank (jonokuchi) → tier 3 → aggressive pruning
    // NEW: peakRank should be ozeki
    const r = makeHistoricalRikishi("r-peak-regression", {
      rank: "jonokuchi", // rank at retirement
      division: "jonokuchi",
      careerHistory: [
        makeSnapshot(2004, "maegashira", "makuuchi", 11, 4),
        makeSnapshot(2005, "sekiwake", "makuuchi", 12, 3),
        makeSnapshot(2006, "ozeki", "makuuchi", 13, 2),
        makeSnapshot(2007, "jonokuchi", "jonokuchi", 5, 2), // demoted all the way
      ],
      retirementYear: 2008,
    });

    const world = makeWorldWithHistorical([r]);
    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    const summary = resolved.historicalRikishi.get("r-peak-regression") as RetiredRikishiSummary;
    expect(summary.peakRank).toBe("ozeki");
    expect(summary.peakRankYear).toBe(2006);
  });
});

describe("runRetiredRikishiSummarization — all entries converted to summaries", () => {
  it("yokozuna + maegashira + jonokuchi all become summaries (no tiering)", () => {
    const r1 = makeHistoricalRikishi("legend", { rank: "yokozuna", division: "makuuchi" });
    const r2 = makeHistoricalRikishi("sekitori", { rank: "maegashira", division: "makuuchi" });
    const r3 = makeHistoricalRikishi("clerk", { rank: "jonokuchi", division: "jonokuchi" });

    const world = makeWorldWithHistorical([r1, r2, r3]);
    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    // ALL entries become summaries (no tier-based retention)
    for (const id of ["legend", "sekitori", "clerk"]) {
      const entry = resolved.historicalRikishi.get(id) as RetiredRikishiSummary;
      expect(entry).toBeDefined();
      expect(entry.isSummary).toBe(true);
      expect("stats" in entry!).toBe(false); // No longer full Rikishi
    }
  });
});

describe("runRetiredRikishiSummarization — empty/missing historicalRikishi", () => {
  it("empty Map → no crash, no-op", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map();
    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.historicalRikishi.size).toBe(0);
  });

  it("undefined historicalRikishi → returns early with empty impact", () => {
    const world = makeMockWorld();
    world.historicalRikishi = undefined as unknown as Map<string, Rikishi>;
    const impact = runRetiredRikishiSummarization(world);
    expect(impact).toBeDefined();
  });
});

describe("runRetiredRikishiSummarization — impact structure", () => {
  it("metadata.source is 'runRetiredRikishiSummarization'", () => {
    const world = makeWorldWithHistorical([makeHistoricalRikishi("r1")]);
    const impact = runRetiredRikishiSummarization(world);
    expect(impact.metadata?.source).toBe("runRetiredRikishiSummarization");
  });

  it("historicalRikishiUpdates is a Map with correct keys", () => {
    const r = makeHistoricalRikishi("r-struct");
    const world = makeWorldWithHistorical([r]);
    const impact = runRetiredRikishiSummarization(world);

    const updates = impact.entities?.historicalRikishiUpdates;
    expect(updates).toBeDefined();
    expect(updates).toBeInstanceOf(Map);
    expect(updates!.has("r-struct")).toBe(true);
  });
});

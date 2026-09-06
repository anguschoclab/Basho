import { describe, it, expect, beforeEach, vi } from "vitest";
import { runRetiredRikishiSummarization } from "@/engine/archival";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Rank, Division } from "@/engine/types/banzuke";

// Mock the archive services so we can assert archival calls.
vi.mock("@/engine/storage/opfsArchive", () => ({
  opfsArchiveService: {
    archiveFullRikishiRecord: vi.fn(() => Promise.resolve()),
    retrieveFullRikishiRecord: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock("@/engine/storage/electronArchive", () => ({
  electronArchiveService: {
    archiveFullRikishiRecord: vi.fn(() => Promise.resolve()),
    retrieveFullRikishiRecord: vi.fn(() => Promise.resolve(null)),
  },
}));

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

function makeFullHistoricalRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
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

function makeSummaryEntry(id: string, overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
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

describe("runRetiredRikishiSummarization", () => {
  it("converts full Rikishi in historicalRikishi to RetiredRikishiSummary", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([
      ["r1", makeFullHistoricalRikishi("r1")],
      ["r2", makeFullHistoricalRikishi("r2", { careerWins: 200 })],
      ["r3", makeFullHistoricalRikishi("r3", { careerWins: 300 })],
    ]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    for (const id of ["r1", "r2", "r3"]) {
      const entry = resolved.historicalRikishi.get(id);
      expect(entry, `entry ${id} should exist`).toBeDefined();
      expect((entry as RetiredRikishiSummary).isSummary).toBe(true);
      expect((entry as RetiredRikishiSummary).yearlyAggregates).toBeDefined();
      expect("stats" in entry!).toBe(false); // No longer a full Rikishi
    }
  });

  it("does not re-convert entries that are already summaries", () => {
    const existingSummary = makeSummaryEntry("r-sum", { careerWins: 999 });
    const fullRikishi = makeFullHistoricalRikishi("r-full", { careerWins: 100 });

    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r-sum", existingSummary],
      ["r-full", fullRikishi],
    ]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    // Summary should be unchanged
    const sumEntry = resolved.historicalRikishi.get("r-sum") as RetiredRikishiSummary;
    expect(sumEntry.careerWins).toBe(999);
    expect(sumEntry.isSummary).toBe(true);

    // Full Rikishi should be converted
    const fullEntry = resolved.historicalRikishi.get("r-full") as RetiredRikishiSummary;
    expect(fullEntry.isSummary).toBe(true);
    expect(fullEntry.careerWins).toBe(100);
  });

  it("writes to historicalRikishi, NOT world.rikishi (no ghost entries)", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r1", makeFullHistoricalRikishi("r1")]]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    // The critical regression test: the OLD archival.ts wrote to world.rikishi
    // creating ghost entries. The new system must NOT do this.
    expect(resolved.rikishi.get("r1")).toBeUndefined();
    expect(resolved.historicalRikishi.get("r1")).toBeDefined();
  });

  it("conversion preserves id, shikona, heyaId, careerWins, careerLosses, retirementYear", () => {
    const rikishi = makeFullHistoricalRikishi("r-preserve", {
      shikona: "Preserved Legend",
      heyaId: "heya-special",
      careerWins: 250,
      careerLosses: 175,
      retirementYear: 2015,
      retirementReason: "Injury",
    });

    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r-preserve", rikishi]]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    const summary = resolved.historicalRikishi.get("r-preserve") as RetiredRikishiSummary;
    expect(summary.id).toBe("r-preserve");
    expect(summary.shikona).toBe("Preserved Legend");
    expect(summary.heyaId).toBe("heya-special");
    expect(summary.careerWins).toBe(250);
    expect(summary.careerLosses).toBe(175);
    expect(summary.retirementYear).toBe(2015);
    expect(summary.retirementReason).toBe("Injury");
  });

  it("handles empty historicalRikishi gracefully", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map();

    const impact = runRetiredRikishiSummarization(world);
    expect(impact).toBeDefined();
    // Should not crash
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.historicalRikishi.size).toBe(0);
  });

  it("handles undefined historicalRikishi gracefully", () => {
    const world = makeMockWorld();
    world.historicalRikishi = undefined as unknown as Map<string, Rikishi>;

    const impact = runRetiredRikishiSummarization(world);
    expect(impact).toBeDefined();
    // Should not crash
  });

  it("metadata.source is 'runRetiredRikishiSummarization'", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r1", makeFullHistoricalRikishi("r1")]]);

    const impact = runRetiredRikishiSummarization(world);
    expect(impact.metadata?.source).toBe("runRetiredRikishiSummarization");
  });

  it("uses peakRank from career history, not retirement rank", () => {
    // Rikishi peaked at ozeki but retired at maegashira
    const rikishi = makeFullHistoricalRikishi("r-peak", {
      rank: "maegashira", // rank at retirement
      division: "makuuchi",
      careerHistory: [
        makeSnapshot(2004, "maegashira", "makuuchi", 11, 4),
        makeSnapshot(2005, "sekiwake", "makuuchi", 12, 3),
        makeSnapshot(2006, "ozeki", "makuuchi", 13, 2),
        makeSnapshot(2007, "maegashira", "makuuchi", 8, 7), // demoted
      ],
      retirementYear: 2008,
    });

    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r-peak", rikishi]]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    const summary = resolved.historicalRikishi.get("r-peak") as RetiredRikishiSummary;
    // OLD system used retirement rank (maegashira → tier 2). New system uses peak rank.
    expect(summary.peakRank).toBe("ozeki");
    expect(summary.peakRankYear).toBe(2006);
  });

  it("archives full Rikishi to cold storage before conversion (safety net)", async () => {
    const { opfsArchiveService } = await import("@/engine/storage/opfsArchive");
    const archiveSpy = opfsArchiveService.archiveFullRikishiRecord as ReturnType<typeof vi.fn>;
    archiveSpy.mockClear();

    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r1", makeFullHistoricalRikishi("r1")],
      ["r2", makeFullHistoricalRikishi("r2", { careerWins: 200 })],
    ]);

    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    // Both full Rikishi should have been archived to cold storage as a safety net
    expect(archiveSpy).toHaveBeenCalledTimes(2);
    expect(archiveSpy).toHaveBeenCalledWith("r1", expect.objectContaining({ id: "r1" }));
    expect(archiveSpy).toHaveBeenCalledWith("r2", expect.objectContaining({ id: "r2" }));

    // And both should be converted to summaries
    for (const id of ["r1", "r2"]) {
      const entry = resolved.historicalRikishi.get(id);
      expect((entry as RetiredRikishiSummary).isSummary).toBe(true);
    }
  });

  it("does not archive entries that are already summaries", async () => {
    const { opfsArchiveService } = await import("@/engine/storage/opfsArchive");
    const archiveSpy = opfsArchiveService.archiveFullRikishiRecord as ReturnType<typeof vi.fn>;
    archiveSpy.mockClear();

    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r-sum", makeSummaryEntry("r-sum")],
      ["r-full", makeFullHistoricalRikishi("r-full")],
    ]);

    runRetiredRikishiSummarization(world);

    // Only the full Rikishi should be archived, not the already-summarized one
    expect(archiveSpy).toHaveBeenCalledTimes(1);
    expect(archiveSpy).toHaveBeenCalledWith("r-full", expect.objectContaining({ id: "r-full" }));
  });

  it("archival failure does not block conversion", async () => {
    const { opfsArchiveService } = await import("@/engine/storage/opfsArchive");
    const archiveSpy = opfsArchiveService.archiveFullRikishiRecord as ReturnType<typeof vi.fn>;
    archiveSpy.mockClear();
    archiveSpy.mockImplementation(() => Promise.reject(new Error("OPFS full")));

    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r1", makeFullHistoricalRikishi("r1")],
    ]);

    // Should not throw — archival is fire-and-forget
    const impact = runRetiredRikishiSummarization(world);
    const resolved = resolveImpacts(world, [impact]);

    // Conversion should still proceed despite archival failure
    const entry = resolved.historicalRikishi.get("r1");
    expect((entry as RetiredRikishiSummary).isSummary).toBe(true);
  });
});

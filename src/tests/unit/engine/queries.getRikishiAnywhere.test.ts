import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getRikishiAnywhere,
  getRetiredRikishiSummary,
  loadFullRikishiRecord,
} from "@/engine/queries";
import { makeMockWorld, mockRikishi } from "./utils";
import { opfsArchiveService } from "@/engine/storage/opfsArchive";
import { resetMockFileSystem } from "@/tests/setup";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Rikishi } from "@/engine/types/rikishi";

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

describe("getRikishiAnywhere with RetiredRikishiSummary", () => {
  it("returns Rikishi for active rikishi", () => {
    const rikishi = mockRikishi("r-active");
    const world = makeMockWorld();
    world.rikishi.set("r-active", rikishi);

    const result = getRikishiAnywhere(world, "r-active");
    expect(result).toBeDefined();
    expect(result!.id).toBe("r-active");
  });

  it("returns Rikishi for unconverted retired rikishi", () => {
    const rikishi = mockRikishi("r-retired", { isRetired: true });
    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r-retired", rikishi]]);

    const result = getRikishiAnywhere(world, "r-retired");
    expect(result).toBeDefined();
    expect(result!.id).toBe("r-retired");
  });

  it("returns RetiredRikishiSummary for converted retired rikishi", () => {
    const summary = makeSummary("r-converted");
    const world = makeMockWorld();
    world.historicalRikishi = new Map([["r-converted", summary]]);

    const result = getRikishiAnywhere(world, "r-converted");
    expect(result).toBeDefined();
    expect(result!.id).toBe("r-converted");
    // Should be the summary (has isSummary)
    expect("isSummary" in result! && result!.isSummary).toBe(true);
  });

  it("returns undefined for unknown id", () => {
    const world = makeMockWorld();
    const result = getRikishiAnywhere(world, "r-unknown");
    expect(result).toBeUndefined();
  });
});

describe("getRetiredRikishiSummary helper", () => {
  it("returns summary or undefined", () => {
    const summary = makeSummary("r-sum");
    const fullRikishi = mockRikishi("r-full", { isRetired: true });

    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r-sum", summary],
      ["r-full", fullRikishi],
    ]);

    expect(getRetiredRikishiSummary(world, "r-sum")).toBeDefined();
    expect(getRetiredRikishiSummary(world, "r-sum")!.careerWins).toBe(100);
    expect(getRetiredRikishiSummary(world, "r-full")).toBeUndefined();
    expect(getRetiredRikishiSummary(world, "r-unknown")).toBeUndefined();
  });
});

describe("loadFullRikishiRecord helper", () => {
  beforeEach(() => {
    resetMockFileSystem();
    opfsArchiveService.clearCache();
    vi.restoreAllMocks();
  });

  it("loads from cold storage", async () => {
    const rikishi = mockRikishi("r-load-test", { careerWins: 333 });
    await opfsArchiveService.archiveFullRikishiRecord("r-load-test", rikishi);

    const loaded = await loadFullRikishiRecord("r-load-test");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe("r-load-test");
    expect(loaded!.careerWins).toBe(333);
  });

  it("returns null for unknown id", async () => {
    const loaded = await loadFullRikishiRecord("r-unknown");
    expect(loaded).toBeNull();
  });
});

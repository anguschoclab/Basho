import { describe, it, expect } from "vitest";
import { makeBashoKey, createEmptyHistoryIndex, indexBashoResult, getBashoSummary, listBashoSummaries, getRikishiHistory } from "../historyIndex";
import { generateWorld } from "../worldgen";
import type { BashoResult } from "../types/basho";

describe("History Indexing", () => {
  it("should create empty index", () => {
    const idx = createEmptyHistoryIndex();
    expect(idx.basho).toBeDefined();
    expect(idx.rikishi).toBeDefined();
  });

  it("should generate basho key", () => {
    expect(makeBashoKey(2025, 1)).toBe("2025-1");
    expect(makeBashoKey(2025, 6)).toBe("2025-6");
  });

  it("should index a basho result and query it", () => {
    const world = generateWorld("test-history");
    world.historyIndex = createEmptyHistoryIndex();
    world.year = 2025;
    world.bashoNumber = 1;
    world.currentBashoName = "hatsu";

    // Simulate a basho result payload
    const bashoResult = {
      id: "hatsu-2025",
      bashoName: "hatsu",
      year: 2025,
      bashoNumber: 1,
      yusho: "test-rikishi-id",
      promotions: [],
      demotions: [],
      records: [{
        rikishiId: "test-rikishi-id",
        name: "Hakuho",
        division: "makuuchi",
        rank: "yokozuna",
        wins: 15,
        losses: 0,
        yusho: true,
        rankNumber: 1,
        side: "east",
        boutResults: []
      }]
    } as unknown as any;

    indexBashoResult(world, bashoResult);

    const summary = getBashoSummary(world.historyIndex!, 2025, 1);
    expect(summary).toBeDefined();

    const summaries = listBashoSummaries(world.historyIndex!);
    expect(summaries.length).toBe(1);
    expect(summaries[0].yusho).toBe("test-rikishi-id");

    const history = getRikishiHistory(world.historyIndex!, "test-rikishi-id");
    expect(history.length).toBe(1);
    expect(history[0].yusho).toBe(true);
  });
});

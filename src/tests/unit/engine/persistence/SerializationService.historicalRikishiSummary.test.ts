import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { makeMockWorld, mockRikishi } from "../utils";
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
    yushoCount: 3,
    junYushoCount: 1,
    sanshoCount: 5,
    kinboshiCount: 10,
    totalEarnings: 500_000,
    peakRank: "ozeki",
    peakRankYear: 2005,
    peakDivision: "makuuchi",
    retirementYear: 2010,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [
      {
        year: 2005,
        division: "makuuchi",
        rank: "ozeki",
        wins: 12,
        losses: 3,
        yusho: 1,
        junYusho: 0,
        sansho: 2,
      },
    ],
    isSummary: true,
    ...overrides,
  };
}

describe("SerializationService historicalRikishi with RetiredRikishiSummary", () => {
  it("serializes and deserializes historicalRikishi with summary entries", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([
      ["r1", makeSummary("r1")],
      ["r2", makeSummary("r2", { careerWins: 250, peakRank: "yokozuna" })],
    ]);

    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    expect(deserialized.historicalRikishi.size).toBe(2);

    const entry1 = deserialized.historicalRikishi.get("r1") as RetiredRikishiSummary;
    expect(entry1).toBeDefined();
    expect(entry1.id).toBe("r1");
    expect(entry1.careerWins).toBe(100);
    expect(entry1.isSummary).toBe(true);
    expect(entry1.yearlyAggregates).toHaveLength(1);
    expect(entry1.yearlyAggregates[0].year).toBe(2005);

    const entry2 = deserialized.historicalRikishi.get("r2") as RetiredRikishiSummary;
    expect(entry2.careerWins).toBe(250);
    expect(entry2.peakRank).toBe("yokozuna");
  });

  it("serializes and deserializes historicalRikishi with full Rikishi entries", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([
      ["r-full", mockRikishi("r-full", { isRetired: true, careerWins: 300 })],
    ]);

    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    const entry = deserialized.historicalRikishi.get("r-full") as Rikishi;
    expect(entry).toBeDefined();
    expect(entry.id).toBe("r-full");
    expect(entry.careerWins).toBe(300);
    expect("stats" in entry).toBe(true);
  });

  it("serializes mixed state (some summaries, some full)", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r-sum", makeSummary("r-sum")],
      ["r-full", mockRikishi("r-full", { isRetired: true })],
    ]);

    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    expect(deserialized.historicalRikishi.size).toBe(2);

    const sumEntry = deserialized.historicalRikishi.get("r-sum") as RetiredRikishiSummary;
    expect(sumEntry.isSummary).toBe(true);

    const fullEntry = deserialized.historicalRikishi.get("r-full") as Rikishi;
    expect("stats" in fullEntry).toBe(true);
  });

  it("handles empty historicalRikishi", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map();

    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    expect(deserialized.historicalRikishi.size).toBe(0);
  });
});

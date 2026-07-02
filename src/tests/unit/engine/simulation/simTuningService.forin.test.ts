import { describe, it, expect } from "vitest";
import { SimTuningService } from "@/engine/simulation/SimTuningService";
import { makeMockWorld, mockRikishi } from "../utils";

describe("SimTuningService.topKimarite (for...in optimization)", () => {
  it("correctly sorts by count descending", () => {
    const world = makeMockWorld({ globalKimariteStats: {} });
    const metrics = SimTuningService.calculateMetrics(world, {
      yokozunaVacancy: 0,
      uniqueWinners: 0,
      successions: 0,
      cumulativeKimarite: {
        oshidashi: 50,
        yorikiri: 100,
        uwatenage: 30,
        hatakikomi: 75,
      },
    });
    expect(metrics.topKimarite[0]).toEqual({ id: "yorikiri", count: 100 });
    expect(metrics.topKimarite[1]).toEqual({ id: "hatakikomi", count: 75 });
    expect(metrics.topKimarite[2]).toEqual({ id: "oshidashi", count: 50 });
    expect(metrics.topKimarite[3]).toEqual({ id: "uwatenage", count: 30 });
  });

  it("limits to 10 entries", () => {
    const stats: Record<string, number> = {};
    for (let i = 0; i < 15; i++) {
      stats[`kimarite_${i}`] = 100 - i;
    }
    const world = makeMockWorld({ globalKimariteStats: {} });
    const metrics = SimTuningService.calculateMetrics(world, {
      yokozunaVacancy: 0,
      uniqueWinners: 0,
      successions: 0,
      cumulativeKimarite: stats,
    });
    expect(metrics.topKimarite).toHaveLength(10);
    expect(metrics.topKimarite[0].count).toBe(100);
    expect(metrics.topKimarite[9].count).toBe(91);
  });

  it("handles empty kimarite stats", () => {
    const world = makeMockWorld({ globalKimariteStats: {} });
    const metrics = SimTuningService.calculateMetrics(world);
    expect(metrics.topKimarite).toEqual([]);
  });

  it("handles single entry", () => {
    const world = makeMockWorld({ globalKimariteStats: { oshidashi: 42 } });
    const metrics = SimTuningService.calculateMetrics(world);
    expect(metrics.topKimarite).toHaveLength(1);
    expect(metrics.topKimarite[0]).toEqual({ id: "oshidashi", count: 42 });
  });

  it("falls back to world.globalKimariteStats when no cumulative provided", () => {
    const world = makeMockWorld({ globalKimariteStats: { hatakikomi: 7 } });
    expect(SimTuningService.calculateMetrics(world).topKimarite[0]).toEqual({
      id: "hatakikomi",
      count: 7,
    });
  });
});

describe("SimTuningService.archetypeWinRates (for...in optimization)", () => {
  it("computes correct rates per archetype", () => {
    const r1 = mockRikishi("r1", { careerWins: 30, careerLosses: 10 });
    r1.combatProfile = { ...r1.combatProfile!, archetype: "oshi" as never };
    const r2 = mockRikishi("r2", { careerWins: 20, careerLosses: 20 });
    r2.combatProfile = { ...r2.combatProfile!, archetype: "yotsu" as never };

    const world = makeMockWorld();
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const metrics = SimTuningService.calculateMetrics(world);
    const rates = metrics.entropyAudit.archetypeWinRates;

    expect(rates["oshi"]).toEqual({ wins: 30, total: 40, rate: 0.75 });
    expect(rates["yotsu"]).toEqual({ wins: 20, total: 40, rate: 0.5 });
  });

  it("handles zero total (rate = 0)", () => {
    const r1 = mockRikishi("r1", { careerWins: 0, careerLosses: 0 });
    r1.combatProfile = { ...r1.combatProfile!, archetype: "oshi" as never };

    const world = makeMockWorld();
    world.rikishi.set("r1", r1);

    const metrics = SimTuningService.calculateMetrics(world);
    const rates = metrics.entropyAudit.archetypeWinRates;

    expect(rates["oshi"]).toEqual({ wins: 0, total: 0, rate: 0 });
  });

  it("handles unknown archetype (defaults to 'unknown')", () => {
    const r1 = mockRikishi("r1", { careerWins: 10, careerLosses: 5 });
    r1.combatProfile = undefined as never;

    const world = makeMockWorld();
    world.rikishi.set("r1", r1);

    const metrics = SimTuningService.calculateMetrics(world);
    const rates = metrics.entropyAudit.archetypeWinRates;

    expect(rates["unknown"]).toBeDefined();
    expect(rates["unknown"].wins).toBe(10);
  });

  it("handles multiple rikishi with same archetype", () => {
    const r1 = mockRikishi("r1", { careerWins: 10, careerLosses: 5 });
    r1.combatProfile = { ...r1.combatProfile!, archetype: "oshi" as never };
    const r2 = mockRikishi("r2", { careerWins: 20, careerLosses: 10 });
    r2.combatProfile = { ...r2.combatProfile!, archetype: "oshi" as never };

    const world = makeMockWorld();
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const metrics = SimTuningService.calculateMetrics(world);
    const rates = metrics.entropyAudit.archetypeWinRates;

    expect(rates["oshi"]).toEqual({ wins: 30, total: 45, rate: 30 / 45 });
  });
});

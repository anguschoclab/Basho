import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi } from "../utils";
import { SimTuningService } from "@/engine/simulation/SimTuningService";

describe("SimTuningService.topKimarite", () => {
  it("uses cumulative kimarite totals from historyStats when provided", () => {
    const world = makeMockWorld({ globalKimariteStats: {} });
    const metrics = SimTuningService.calculateMetrics(world, {
      yokozunaVacancy: 0,
      uniqueWinners: 0,
      successions: 0,
      cumulativeKimarite: { oshidashi: 120, yorikiri: 90, uwatenage: 30 },
    });
    expect(metrics.topKimarite.length).toBeGreaterThan(0);
    expect(metrics.topKimarite[0]).toEqual({ id: "oshidashi", count: 120 });
  });

  it("falls back to world.globalKimariteStats when no cumulative provided", () => {
    const world = makeMockWorld({ globalKimariteStats: { hatakikomi: 7 } });
    expect(SimTuningService.calculateMetrics(world).topKimarite[0]).toEqual({
      id: "hatakikomi",
      count: 7,
    });
  });
});

describe("SimTuningService.averageRetirementAge", () => {
  it("computes averageRetirementAge from historicalRikishi retirees (not a metric artifact)", () => {
    const retiredOld = mockRikishi("ret-1", {
      isRetired: true,
      birthYear: 1990,
      retirementYear: 2025,
    }); // 35
    const retiredYoung = mockRikishi("ret-2", {
      isRetired: true,
      birthYear: 2005,
      retirementYear: 2025,
    }); // 20
    const world = makeMockWorld({
      rikishi: new Map(),
      historicalRikishi: new Map([
        [retiredOld.id, retiredOld],
        [retiredYoung.id, retiredYoung],
      ]),
    });
    const metrics = SimTuningService.calculateMetrics(world);
    expect(metrics.retirementAges.sort((a, b) => a - b)).toEqual([20, 35]);
    expect(metrics.averageRetirementAge).toBe(27.5);
  });
});

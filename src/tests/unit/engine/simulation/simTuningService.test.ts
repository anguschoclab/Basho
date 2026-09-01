import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi } from "../utils";
import { SimTuningService } from "@/engine/simulation/SimTuningService";
import type { Oyakata } from "@/engine/types/oyakata";

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

describe("SimTuningService.oyakataMetrics", () => {
  it("counts total oyakata and those promoted from former rikishi", () => {
    const world = makeMockWorld();
    world.oyakata.set("o1", { id: "o1", formerRikishiId: "r-old-1" } as Oyakata);
    world.oyakata.set("o2", { id: "o2" } as Oyakata); // no formerRikishiId
    world.oyakata.set("o3", { id: "o3", formerRikishiId: "r-old-3" } as Oyakata);

    const metrics = SimTuningService.calculateMetrics(world);
    expect(metrics.oyakataMetrics.totalOyakata).toBe(3);
    expect(metrics.oyakataMetrics.newOyakataFromRikishi).toBe(2);
  });

  it("returns zero oyakata metrics for an empty oyakata map", () => {
    const world = makeMockWorld(); // makeMockWorld defaults oyakata to new Map()
    const metrics = SimTuningService.calculateMetrics(world);
    expect(metrics.oyakataMetrics.totalOyakata).toBe(0);
    expect(metrics.oyakataMetrics.newOyakataFromRikishi).toBe(0);
    expect(metrics.oyakataMetrics.promotionRate).toBe(0);
  });
});

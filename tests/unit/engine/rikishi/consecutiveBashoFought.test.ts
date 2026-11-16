/**
 * W F — consecutiveBashoFought (the "Iron Man" counter).
 *
 * Incremented at banzuke publish when a rikishi's normalized basho
 * record shows zero absences; reset on any absence (partial or full).
 * Saves that predate the field backfill it from the careerHistory tail.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { buildPerformanceList } from "@/engine/banzuke/publish/performance";
import { computeConsecutiveBashoFought } from "@/engine/history/records";
import type { CareerSnapshot } from "@/engine/types/history";

function snapshot(overrides: Partial<CareerSnapshot>): CareerSnapshot {
  return {
    id: "snap",
    bashoId: "hatsu-2030",
    year: 2030,
    month: 1,
    bashoName: "hatsu",
    rank: "maegashira",
    division: "makuuchi",
    rankNumber: 5,
    side: "east",
    wins: 9,
    losses: 6,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 150,
    momentum: 0,
    ...overrides,
  };
}

function runPublish(
  rikishiOverrides: Parameters<typeof MockFactory.createRikishi>[1],
  standings: { wins: number; losses: number }
) {
  const r = MockFactory.createRikishi("r1", {
    division: "makuuchi",
    rank: "maegashira",
    ...rikishiOverrides,
  });
  const world = MockFactory.createWorld({ rikishi: new Map([["r1", r]]) });
  const lastBasho = MockFactory.createBasho({ bashoName: "hatsu", matches: [] });
  const builder = createImpactBuilder("test");
  buildPerformanceList(world, lastBasho, [["r1", standings]], builder);
  const next = resolveImpacts(world, [builder.build()]);
  return next.rikishi.get("r1")!;
}

describe("consecutiveBashoFought — basho-publish update", () => {
  it("increments when the basho record shows zero absences", () => {
    const r = runPublish({ consecutiveBashoFought: 12 }, { wins: 10, losses: 5 });
    expect(r.consecutiveBashoFought).toBe(13);
  });

  it("starts at 1 when the field was unset", () => {
    const r = runPublish({}, { wins: 8, losses: 7 });
    expect(r.consecutiveBashoFought).toBe(1);
  });

  it("resets to 0 on any partial absence", () => {
    // 15-day division, only 12 contested → 3 absences.
    const r = runPublish({ consecutiveBashoFought: 30 }, { wins: 8, losses: 4 });
    expect(r.consecutiveBashoFought).toBe(0);
  });

  it("resets to 0 on a full-kyujo basho (synthesized absence row)", () => {
    // No standings row at all → the eligible-set synthesis produces a
    // full-absence entry.
    const r = MockFactory.createRikishi("r1", {
      division: "makuuchi",
      rank: "maegashira",
      consecutiveBashoFought: 44,
    });
    const world = MockFactory.createWorld({ rikishi: new Map([["r1", r]]) });
    const lastBasho = MockFactory.createBasho({ bashoName: "hatsu", matches: [] });
    const builder = createImpactBuilder("test");
    buildPerformanceList(world, lastBasho, [], builder);
    const next = resolveImpacts(world, [builder.build()]);
    expect(next.rikishi.get("r1")!.consecutiveBashoFought).toBe(0);
  });
});

describe("computeConsecutiveBashoFought — save-file backfill", () => {
  it("counts trailing snapshots with zero absences", () => {
    const history = [
      snapshot({ id: "a", absences: 0 }),
      snapshot({ id: "b", absences: 0 }),
      snapshot({ id: "c", absences: 0 }),
    ];
    expect(computeConsecutiveBashoFought(history)).toBe(3);
  });

  it("stops at the first absence going backwards", () => {
    const history = [
      snapshot({ id: "a", absences: 0 }),
      snapshot({ id: "b", absences: 5 }),
      snapshot({ id: "c", absences: 0 }),
      snapshot({ id: "d", absences: 0 }),
    ];
    expect(computeConsecutiveBashoFought(history)).toBe(2);
  });

  it("returns 0 when the latest basho has absences or history is empty", () => {
    expect(computeConsecutiveBashoFought([snapshot({ id: "a", absences: 15 })])).toBe(0);
    expect(computeConsecutiveBashoFought([])).toBe(0);
  });
});

/**
 * BanzukePublisher.currentBashoEarningsReset.test.ts
 * ===================================================
 * Tests that publishBanzukeUpdate resets currentBashoEarnings to 0 at the
 * start of each new basho cycle, while preserving other economics fields.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { RikishiEconomics } from "@/engine/types/economy";

describe("BanzukePublisher — currentBashoEarnings reset", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld({
      cyclePhase: "post_basho",
      history: [],
    });
  });

  function setupBashoWithRikishi(economics: RikishiEconomics) {
    const basho = makeMockBasho({
      bashoName: "hatsu",
      standings: new Map([["r1", { wins: 8, losses: 7, absences: 0 }]]),
    });
    world.currentBasho = basho;

    world.history.push({
      year: 2025,
      bashoNumber: 1,
      bashoName: "hatsu",
      yusho: "none",
      junYusho: [],
      ginoSho: "none",
      shukunsho: "none",
      kantosho: "none",
      id: "1",
    } as any);

    const r1 = mockRikishi("r1", { rank: "maegashira", economics });
    world.rikishi.set("r1", r1);
  }

  it("resets currentBashoEarnings to 0 at banzuke publish", () => {
    setupBashoWithRikishi({
      cash: 100000,
      retirementFund: 50000,
      careerKenshoWon: 3,
      kinboshiCount: 2,
      totalEarnings: 200000,
      currentBashoEarnings: 75000,
      popularity: 75,
    });

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const updatedR1 = newWorld.rikishi.get("r1")!;
    expect(updatedR1.economics?.currentBashoEarnings).toBe(0);
  });

  it("preserves other economics fields when resetting currentBashoEarnings", () => {
    setupBashoWithRikishi({
      cash: 100000,
      retirementFund: 50000,
      careerKenshoWon: 3,
      kinboshiCount: 2,
      totalEarnings: 200000,
      currentBashoEarnings: 75000,
      popularity: 75,
    });

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const econ = newWorld.rikishi.get("r1")!.economics!;
    expect(econ.cash).toBe(100000);
    expect(econ.totalEarnings).toBe(200000);
    expect(econ.retirementFund).toBe(50000);
    expect(econ.careerKenshoWon).toBe(3);
    expect(econ.kinboshiCount).toBe(2);
    expect(econ.popularity).toBe(75);
  });

  it("handles rikishi with no economics object gracefully", () => {
    const basho = makeMockBasho({
      bashoName: "hatsu",
      standings: new Map([["r1", { wins: 8, losses: 7, absences: 0 }]]),
    });
    world.currentBasho = basho;

    world.history.push({
      year: 2025,
      bashoNumber: 1,
      bashoName: "hatsu",
      yusho: "none",
      junYusho: [],
      ginoSho: "none",
      shukunsho: "none",
      kantosho: "none",
      id: "1",
    } as any);

    const r1 = mockRikishi("r1", { rank: "maegashira", economics: undefined });
    world.rikishi.set("r1", r1);

    expect(() => {
      const impact = publishBanzukeUpdate(world);
      resolveImpacts(world, [impact]);
    }).not.toThrow();
  });
});

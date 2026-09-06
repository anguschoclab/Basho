/**
 * history.generateCareerSnapshot.test.ts
 * =======================================
 * Tests that generateCareerSnapshot captures totalEarningsAtBasho from
 * rikishi.economics.totalEarnings.
 */
import { describe, it, expect } from "vitest";
import { generateCareerSnapshot } from "@/engine/history";
import { makeMockWorld, mockRikishi } from "../utils";
import type { RikishiEconomics } from "@/engine/types/economy";

describe("generateCareerSnapshot — totalEarningsAtBasho", () => {
  it("snapshots totalEarnings from rikishi.economics", () => {
    const world = makeMockWorld({ year: 2025 });
    const economics: RikishiEconomics = {
      cash: 100000,
      retirementFund: 50000,
      careerKenshoWon: 3,
      kinboshiCount: 2,
      totalEarnings: 500000,
      currentBashoEarnings: 21000,
      popularity: 75,
    };
    const rikishi = mockRikishi("r1", { economics });

    const snapshot = generateCareerSnapshot(world, rikishi);
    expect(snapshot.totalEarningsAtBasho).toBe(500000);
  });

  it("defaults totalEarningsAtBasho to 0 when economics is undefined", () => {
    const world = makeMockWorld({ year: 2025 });
    const rikishi = mockRikishi("r1", { economics: undefined });

    const snapshot = generateCareerSnapshot(world, rikishi);
    expect(snapshot.totalEarningsAtBasho).toBe(0);
  });

  it("defaults totalEarningsAtBasho to 0 when economics.totalEarnings is undefined", () => {
    const world = makeMockWorld({ year: 2025 });
    const economics = {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    } as RikishiEconomics;
    const rikishi = mockRikishi("r1", { economics });

    const snapshot = generateCareerSnapshot(world, rikishi);
    expect(snapshot.totalEarningsAtBasho).toBe(0);
  });
});

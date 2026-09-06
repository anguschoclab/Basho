/**
 * economics.test.ts
 * =================
 * Tests that toEconomicsDTO exposes cumulative earnings fields from
 * rikishi.economics, with safe defaults when economics is undefined.
 */
import { describe, it, expect } from "vitest";
import { toEconomicsDTO } from "@/presenters/rikishi/transformers/economics";
import { mockRikishi } from "@/tests/unit/engine/utils";
import type { RikishiEconomics } from "@/engine/types/economy";

describe("toEconomicsDTO — cumulative earnings fields", () => {
  it("populates totalEarnings, cash, retirementFund from rikishi.economics", () => {
    const economics: RikishiEconomics = {
      cash: 100000,
      retirementFund: 50000,
      careerKenshoWon: 3,
      kinboshiCount: 2,
      totalEarnings: 500000,
      currentBashoEarnings: 21000,
      popularity: 75,
    };
    const rikishi = mockRikishi("r1", { rank: "maegashira", economics });

    const dto = toEconomicsDTO(rikishi);
    expect(dto.totalEarnings).toBe(500000);
    expect(dto.cash).toBe(100000);
    expect(dto.retirementFund).toBe(50000);
    expect(dto.careerKenshoWon).toBe(3);
    expect(dto.kinboshiCount).toBe(2);
    expect(dto.popularity).toBe(75);
    expect(dto.currentBashoEarnings).toBe(21000);
  });

  it("defaults all economics fields to 0 when economics is undefined", () => {
    const rikishi = mockRikishi("r1", { rank: "maegashira", economics: undefined });

    const dto = toEconomicsDTO(rikishi);
    expect(dto.totalEarnings).toBe(0);
    expect(dto.cash).toBe(0);
    expect(dto.retirementFund).toBe(0);
    expect(dto.careerKenshoWon).toBe(0);
    expect(dto.kinboshiCount).toBe(0);
    expect(dto.currentBashoEarnings).toBe(0);
  });

  it("defaults popularity to 50 when economics exists but popularity is undefined", () => {
    const economics = {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
    } as RikishiEconomics;
    const rikishi = mockRikishi("r1", { rank: "maegashira", economics });

    const dto = toEconomicsDTO(rikishi);
    expect(dto.popularity).toBe(50);
  });

  it("preserves existing salaryBreakdown computation", () => {
    const economics: RikishiEconomics = {
      cash: 100000,
      retirementFund: 50000,
      careerKenshoWon: 3,
      kinboshiCount: 2,
      totalEarnings: 500000,
      currentBashoEarnings: 21000,
      popularity: 75,
    };
    const rikishi = mockRikishi("r1", { rank: "maegashira", economics });

    const dto = toEconomicsDTO(rikishi);
    expect(dto.salaryBreakdown).toBeDefined();
    expect(dto.salaryBreakdown.base).toEqual(expect.any(Number));
    expect(dto.salaryBreakdown.total).toEqual(expect.any(Number));
  });
});

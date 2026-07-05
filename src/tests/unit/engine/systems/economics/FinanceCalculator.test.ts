import { describe, it, expect, beforeEach } from "vitest";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import {
  FIXED_OPERATING_OVERHEAD_WEEKLY,
  FACILITY_UPKEEP,
  RECRUITMENT_BUDGET_WEEKLY,
} from "@/constants/engine/economic";
import { makeMockHeya, makeMockWorld } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

describe("FinanceCalculator — fixed operating overhead", () => {
  let world: WorldState;
  let heya: Heya;

  beforeEach(() => {
    heya = makeMockHeya("heya-1", {
      funds: 10_000_000,
      facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });
  });

  it("includes FIXED_OPERATING_OVERHEAD_WEEKLY in totalBurn exactly", () => {
    const result = calculateHeyaWeeklyFinances(heya, world);
    const expectedFacilityUpkeep =
      50 * FACILITY_UPKEEP.training +
      50 * FACILITY_UPKEEP.recovery +
      50 * FACILITY_UPKEEP.nutrition;
    const expectedBurn =
      expectedFacilityUpkeep + 0 + FIXED_OPERATING_OVERHEAD_WEEKLY + RECRUITMENT_BUDGET_WEEKLY;
    expect(result.totalBurn).toBe(expectedBurn);
  });

  it("does NOT clamp away fixed overhead — net goes negative when income < baseBurn+fixed", () => {
    const expensiveHeya = makeMockHeya("heya-exp", {
      funds: 5_000_000,
      facilities: { training: 30, recovery: 30, nutrition: 30, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const w = makeMockWorld({ heyas: new Map([["heya-exp", expensiveHeya]]) });
    const result = calculateHeyaWeeklyFinances(expensiveHeya, w);

    // facilityUpkeep = 30*1000 + 30*1000 + 30*2000 = 120,000
    // fixed overhead = FIXED_OPERATING_OVERHEAD_WEEKLY; baseBurn = 120,000 + fixed
    // income = JSA grant (50K) + oyakata salary (1.2M/4 = 300K) = 350,000
    // effectiveBurn must be >= baseBurn, NOT clamped to income
    const expectedBaseBurn = 120_000 + FIXED_OPERATING_OVERHEAD_WEEKLY;
    expect(result.expenses).toBeGreaterThanOrEqual(expectedBaseBurn);
    expect(result.nextFunds).toBeLessThan(expensiveHeya.funds);
    const expectedLoss = expectedBaseBurn - 350_000;
    expect(expensiveHeya.funds - result.nextFunds).toBe(expectedLoss);
  });

  it("still clamps discretionary recruitment when income < baseBurn", () => {
    const poorHeya = makeMockHeya("heya-poor", {
      funds: 1_000_000,
      facilities: { training: 30, recovery: 30, nutrition: 30, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const w = makeMockWorld({ heyas: new Map([["heya-poor", poorHeya]]) });
    const result = calculateHeyaWeeklyFinances(poorHeya, w);
    // baseBurn = 120,000 + FIXED_OPERATING_OVERHEAD_WEEKLY; income = 350,000
    // (JSA grant 50K + oyakata salary 300K)
    // recruitment is discretionary — should NOT be charged
    const expectedBaseBurn = 120_000 + FIXED_OPERATING_OVERHEAD_WEEKLY;
    expect(result.expenses).toBe(expectedBaseBurn);
  });
});

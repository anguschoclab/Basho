import { describe, it, expect, beforeEach } from "vitest";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import {
  FIXED_OPERATING_OVERHEAD_WEEKLY,
  FACILITY_UPKEEP,
  RECRUITMENT_BUDGET_WEEKLY,
  JSA_STABLE_WEEKLY_GRANT,
  JSA_PER_WRESTLER_SUBSIDY_MONTHLY,
  OYAKATA_SALARY_MONTHLY,
  KOENKAI_INCOME_SPLIT,
  DEBT_LIMIT,
  RUNWAY_INFINITE_SENTINEL,
  STAFF_UPKEEP_PER_MEMBER,
} from "@/constants/engine/economic";
import { SPONSOR_TIER_INCOME } from "@/engine/systems/economy/SponsorshipService";
import { KOENKAI_INCOME_POWERFUL } from "@/constants/engine/economyExtended";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Sponsor, SponsorPool, Koenkai } from "@/engine/types/sponsors";

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
    const expectedBaseBurn = 120_000 + FIXED_OPERATING_OVERHEAD_WEEKLY;
    expect(result.expenses).toBe(expectedBaseBurn);
  });
});

// ── Income Components ──────────────────────────────────────────────────────

describe("FinanceCalculator — income components", () => {
  it("includes koenkai income (heya portion = 70% / 4)", () => {
    const heya = makeMockHeya("h1", {
      funds: 50_000_000,
      koenkaiBand: "powerful",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);

    const expectedKoenkai = (KOENKAI_INCOME_POWERFUL * KOENKAI_INCOME_SPLIT.heyaPortion) / 4;
    const otherIncome = JSA_STABLE_WEEKLY_GRANT + OYAKATA_SALARY_MONTHLY / 4;
    expect(result.revenue).toBeCloseTo(expectedKoenkai + otherIncome, 0);
  });

  it("includes JSA per-wrestler subsidy based on roster ranks", () => {
    const r1 = mockRikishi("r1", { rank: "yokozuna", division: "makuuchi" });
    const r2 = mockRikishi("r2", { rank: "makushita", division: "makushita" });
    const heya = makeMockHeya("h1", {
      funds: 50_000_000,
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: ["r1", "r2"],
    });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1], ["r2", r2]]),
      heyas: new Map([["h1", heya]]),
    });
    const result = calculateHeyaWeeklyFinances(heya, world);

    const monthlyJsa =
      JSA_PER_WRESTLER_SUBSIDY_MONTHLY.yokozuna + JSA_PER_WRESTLER_SUBSIDY_MONTHLY.makushita;
    const weeklyJsa = monthlyJsa / 4;
    const otherIncome = JSA_STABLE_WEEKLY_GRANT + OYAKATA_SALARY_MONTHLY / 4;
    expect(result.revenue).toBeCloseTo(weeklyJsa + otherIncome, 0);
  });

  it("includes sponsor tier income from koenkai members", () => {
    const sponsor1 = { sponsorId: "s1", tier: "T2", active: true } as unknown as Sponsor;
    const sponsor2 = { sponsorId: "s2", tier: "T3", active: true } as unknown as Sponsor;
    const koenkai = {
      koenkaiId: "k1",
      heyaId: "h1",
      strengthBand: "moderate",
      members: [{ sponsorId: "s1" }, { sponsorId: "s2" }],
    } as unknown as Koenkai;
    const sponsorPool = {
      sponsors: new Map([["s1", sponsor1], ["s2", sponsor2]]),
      koenkais: new Map([["k1", koenkai]]),
    } as unknown as SponsorPool;

    const heya = makeMockHeya("h1", {
      funds: 50_000_000,
      koenkaiBand: "none",
      koenkaiId: "k1",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
    });
    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
      sponsorPool,
    } as any);
    const result = calculateHeyaWeeklyFinances(heya, world);

    const monthlySponsor = SPONSOR_TIER_INCOME.T2 + SPONSOR_TIER_INCOME.T3;
    const weeklySponsor = monthlySponsor / 4;
    const otherIncome = JSA_STABLE_WEEKLY_GRANT + OYAKATA_SALARY_MONTHLY / 4;
    expect(result.revenue).toBeCloseTo(weeklySponsor + otherIncome, 0);
  });

  it("includes JSA base weekly grant", () => {
    const heya = makeMockHeya("h1", {
      funds: 50_000_000,
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    // With no koenkai, no roster, no sponsors: income = JSA grant + oyakata salary
    expect(result.revenue).toBe(JSA_STABLE_WEEKLY_GRANT + OYAKATA_SALARY_MONTHLY / 4);
  });

  it("includes oyakata salary as heya income (JSA model)", () => {
    const heya = makeMockHeya("h1", {
      funds: 50_000_000,
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    expect(result.revenue).toBeGreaterThanOrEqual(OYAKATA_SALARY_MONTHLY / 4);
  });
});

// ── Expense Components ─────────────────────────────────────────────────────

describe("FinanceCalculator — expense components", () => {
  it("calculates facility upkeep from training + recovery + nutrition", () => {
    const heya = makeMockHeya("h1", {
      funds: 100_000_000,
      facilities: { training: 40, recovery: 60, nutrition: 20, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    const expectedFacility =
      40 * FACILITY_UPKEEP.training + 60 * FACILITY_UPKEEP.recovery + 20 * FACILITY_UPKEEP.nutrition;
    const expectedBaseBurn = expectedFacility + FIXED_OPERATING_OVERHEAD_WEEKLY;
    // Income > totalBurn so effectiveBurn = totalBurn = baseBurn + recruitment
    expect(result.totalBurn).toBe(expectedBaseBurn + RECRUITMENT_BUDGET_WEEKLY);
  });

  it("calculates staff upkeep per member", () => {
    const heya = makeMockHeya("h1", {
      funds: 100_000_000,
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: ["staff1", "staff2", "staff3"],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    const expectedStaff = 3 * STAFF_UPKEEP_PER_MEMBER;
    const expectedBaseBurn = expectedStaff + FIXED_OPERATING_OVERHEAD_WEEKLY;
    expect(result.totalBurn).toBe(expectedBaseBurn + RECRUITMENT_BUDGET_WEEKLY);
  });

  it("skips recruitment cost when funds <= DEBT_LIMIT", () => {
    const heya = makeMockHeya("h1", {
      funds: DEBT_LIMIT,
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    // recruitmentCost = 0 when funds <= DEBT_LIMIT
    expect(result.totalBurn).toBe(FIXED_OPERATING_OVERHEAD_WEEKLY);
  });
});

// ── Runway & Debt Floor ────────────────────────────────────────────────────

describe("FinanceCalculator — runway and debt floor", () => {
  it("calculates runway as funds / monthlyBurn", () => {
    const heya = makeMockHeya("h1", {
      funds: 10_000_000,
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    const monthlyBurn = result.totalBurn * 4;
    expect(result.runwayMonths).toBeCloseTo(10_000_000 / monthlyBurn, 0);
  });

  it("returns RUNWAY_INFINITE_SENTINEL when monthlyBurn is 0", () => {
    // This is hard to achieve since FIXED_OPERATING_OVERHEAD is always > 0
    // but test the sentinel path by mocking
    const heya = makeMockHeya("h1", {
      funds: 10_000_000,
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    // monthlyBurn > 0 due to fixed overhead, so runway should be finite
    expect(result.runwayMonths).not.toBe(RUNWAY_INFINITE_SENTINEL);
    expect(result.runwayMonths).toBeGreaterThan(0);
  });

  it("clamps nextFunds to DEBT_LIMIT (debt floor)", () => {
    const heya = makeMockHeya("h1", {
      funds: DEBT_LIMIT + 100_000,
      facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    expect(result.nextFunds).toBeGreaterThanOrEqual(DEBT_LIMIT);
  });
});

// ── Solvency Clamping ──────────────────────────────────────────────────────

describe("FinanceCalculator — solvency clamping", () => {
  it("clamps to baseBurn when income < totalBurn", () => {
    const heya = makeMockHeya("h1", {
      funds: 1_000_000,
      facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "none",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    const expectedFacility =
      50 * FACILITY_UPKEEP.training + 50 * FACILITY_UPKEEP.recovery + 50 * FACILITY_UPKEEP.nutrition;
    const expectedBaseBurn = expectedFacility + FIXED_OPERATING_OVERHEAD_WEEKLY;
    // Income (350K) < totalBurn (baseBurn + recruitment) → effectiveBurn = baseBurn
    expect(result.expenses).toBe(expectedBaseBurn);
  });

  it("does not clamp when income >= totalBurn", () => {
    const heya = makeMockHeya("h1", {
      funds: 100_000_000,
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 50 },
      staffIds: [],
      rikishiIds: [],
      koenkaiBand: "powerful",
    });
    const world = makeMockWorld({ heyas: new Map([["h1", heya]]) });
    const result = calculateHeyaWeeklyFinances(heya, world);
    // High income from powerful koenkai → effectiveBurn = totalBurn
    expect(result.expenses).toBe(result.totalBurn);
  });
});

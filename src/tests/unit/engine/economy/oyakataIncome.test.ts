import { describe, it, expect } from "vitest";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import { OYAKATA_SALARY_MONTHLY, JSA_STABLE_WEEKLY_GRANT } from "@/constants/engine/economic";
import { makeMockHeya, makeMockWorld } from "../utils";

 

describe("Oyakata salary as heya income", () => {
  it("zero-wrestler heya earns at least ¥350K/week (oyakata ¥300K + JSA grant ¥50K)", () => {
    const heya = makeMockHeya("heya-1", {
      funds: 1_000_000,
      rikishiIds: [],
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 0 },
      staffIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

    const result = calculateHeyaWeeklyFinances(heya, world);
    const expectedOyakataWeekly = OYAKATA_SALARY_MONTHLY / 4;
    expect(result.revenue).toBe(expectedOyakataWeekly + JSA_STABLE_WEEKLY_GRANT);
  });

  it("oyakata salary is OYAKATA_SALARY_MONTHLY / 4", () => {
    const heya = makeMockHeya("heya-1", {
      funds: 1_000_000,
      rikishiIds: [],
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 0 },
      staffIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

    const result = calculateHeyaWeeklyFinances(heya, world);
    // Revenue = oyakata salary + JSA base grant (no wrestlers, no koenkai, no sponsors)
    expect(result.revenue).toBe(OYAKATA_SALARY_MONTHLY / 4 + JSA_STABLE_WEEKLY_GRANT);
  });

  it("no maintenance subsidy when funds < 0", () => {
    const heya = makeMockHeya("heya-1", {
      funds: -5_000_000,
      rikishiIds: [],
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 0 },
      staffIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

    const result = calculateHeyaWeeklyFinances(heya, world);
    // With safety nets removed, revenue should only be oyakata + JSA grant
    // (no maintenance subsidy, no survival floor)
    expect(result.revenue).toBe(OYAKATA_SALARY_MONTHLY / 4 + JSA_STABLE_WEEKLY_GRANT);
  });

  it("no KOENKAI_SURVIVAL_FLOOR applied", () => {
    const heya = makeMockHeya("heya-1", {
      funds: 1_000_000,
      rikishiIds: [],
      koenkaiBand: "none",
      facilities: { training: 0, recovery: 0, nutrition: 0, housing: 0 },
      staffIds: [],
    });
    const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });

    const result = calculateHeyaWeeklyFinances(heya, world);
    // Revenue should be exactly oyakata + JSA grant, not clamped to any floor
    const expectedRevenue = OYAKATA_SALARY_MONTHLY / 4 + JSA_STABLE_WEEKLY_GRANT;
    expect(result.revenue).toBe(expectedRevenue);
    expect(result.revenue).not.toBeGreaterThan(expectedRevenue);
  });
});

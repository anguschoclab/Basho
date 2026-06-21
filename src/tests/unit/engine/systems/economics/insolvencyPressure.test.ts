import { describe, it, expect } from "vitest";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import { processHeyaEconomics } from "@/engine/tick/phases/monthly/economics/salaries";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  LOAN_ISSUANCE_THRESHOLD,
  SEKITORI_OVERHEAD_MONTHLY,
  NON_SEKITORI_OVERHEAD_MONTHLY,
  FIXED_OPERATING_OVERHEAD_WEEKLY,
} from "@/constants/engine/economic";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { HeyaUpdates } from "@/engine/tick/phases/monthly/types";

/**
 * Simulate advancing a heya through N months, applying weekly finances (4 weeks/month)
 * and monthly overhead. Returns the funds trajectory.
 */
function simulateMonths(
  initialHeya: Heya,
  initialWorld: WorldState,
  months: number
): number[] {
  let heya = { ...initialHeya };
  let world = { ...initialWorld, heyas: new Map([[heya.id, heya]]) };
  const trajectory: number[] = [heya.funds];

  for (let m = 0; m < months; m++) {
    // 4 weekly ticks
    for (let w = 0; w < 4; w++) {
      const result = calculateHeyaWeeklyFinances(heya, world);
      heya = { ...heya, funds: result.nextFunds };
      world = { ...world, heyas: new Map([[heya.id, heya]]) };
    }

    // Monthly overhead
    const builder = createImpactBuilder("test-monthly");
    const heyaUpdates: HeyaUpdates = {};
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);
    builder.updateHeya(heya.id, heyaUpdates);
    const impact = builder.build();
    world = resolveImpacts(world, [impact]);
    heya = world.heyas.get(heya.id)!;

    trajectory.push(heya.funds);
  }

  return trajectory;
}

describe("Insolvency pressure and wealth stratification", () => {
  it("weak heya trends downward and crosses LOAN_ISSUANCE_THRESHOLD", () => {
    // Weak heya: no koenkai, no sponsors, roster-heavy with non-sekitori
    const rikishi = [
      mockRikishi("w-r1", { rank: "makushita", division: "makushita", heyaId: "heya-weak" }),
      mockRikishi("w-r2", { rank: "makushita", division: "makushita", heyaId: "heya-weak" }),
      mockRikishi("w-r3", { rank: "sandanme", division: "sandanme", heyaId: "heya-weak" }),
      mockRikishi("w-r4", { rank: "sandanme", division: "sandanme", heyaId: "heya-weak" }),
      mockRikishi("w-r5", { rank: "jonidan", division: "jonidan", heyaId: "heya-weak" }),
    ];
    const rikishiMap = new Map(rikishi.map((r) => [r.id, r]));

    const weakHeya = makeMockHeya("heya-weak", {
      funds: 0,
      rikishiIds: rikishi.map((r) => r.id),
      koenkaiBand: "none",
      facilities: { training: 30, recovery: 30, nutrition: 30, housing: 50 },
      staffIds: [],
    });

    const world = makeMockWorld({
      heyas: new Map([["heya-weak", weakHeya]]),
      rikishi: rikishiMap,
    });

    const trajectory = simulateMonths(weakHeya, world, 12);

    // Funds should trend downward (not monotonically, but overall)
    expect(trajectory[trajectory.length - 1]).toBeLessThan(trajectory[0]);

    // Should cross LOAN_ISSUANCE_THRESHOLD at some point (proving bailout would fire)
    const minFunds = Math.min(...trajectory);
    expect(minFunds).toBeLessThanOrEqual(LOAN_ISSUANCE_THRESHOLD);
  });

  it("strong heya with powerful koenkai stays solvent", () => {
    // Strong heya: powerful koenkai, high-tier sponsors, sekitori roster
    const rikishi = [
      mockRikishi("s-r1", { rank: "yokozuna", division: "makuuchi", heyaId: "heya-strong" }),
      mockRikishi("s-r2", { rank: "ozeki", division: "makuuchi", heyaId: "heya-strong" }),
      mockRikishi("s-r3", { rank: "maegashira", division: "makuuchi", heyaId: "heya-strong" }),
      mockRikishi("s-r4", { rank: "makushita", division: "makushita", heyaId: "heya-strong" }),
    ];
    const rikishiMap = new Map(rikishi.map((r) => [r.id, r]));

    const strongHeya = makeMockHeya("heya-strong", {
      funds: 50_000_000,
      rikishiIds: rikishi.map((r) => r.id),
      koenkaiBand: "powerful",
      facilities: { training: 70, recovery: 70, nutrition: 70, housing: 50 },
      staffIds: [],
    });

    const world = makeMockWorld({
      heyas: new Map([["heya-strong", strongHeya]]),
      rikishi: rikishiMap,
    });

    const trajectory = simulateMonths(strongHeya, world, 12);

    // Strong heya should stay solvent — never cross LOAN_ISSUANCE_THRESHOLD
    const minFunds = Math.min(...trajectory);
    expect(minFunds).toBeGreaterThan(LOAN_ISSUANCE_THRESHOLD);
  });

  it("overhead constants are meaningful sinks (not trivially small)", () => {
    // Verify the overhead is large enough to matter relative to income
    const weeklyIncomeWeak = 50_000; // JSA grant only
    const weeklyFixedOverhead = FIXED_OPERATING_OVERHEAD_WEEKLY;
    expect(weeklyFixedOverhead).toBeGreaterThan(weeklyIncomeWeak);

    // Monthly overhead for a single yokozuna should be significant
    expect(SEKITORI_OVERHEAD_MONTHLY.yokozuna).toBeGreaterThan(1_000_000);
    expect(NON_SEKITORI_OVERHEAD_MONTHLY).toBeGreaterThan(10_000);
  });
});

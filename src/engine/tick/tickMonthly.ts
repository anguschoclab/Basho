import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { autosave } from "../saveload";
import * as facilities from "../facilities";
import * as npcAI from "../npcAI";
import { RANK_HIERARCHY } from "../banzuke";
import { stableSort } from "../utils/sort";

/**
 * Safe call.
 *  * @param fn - The Fn.
 *  * @returns The result.
 */
function safeCall(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * Monthly boundary tick — Constitution A3.3.
 * Salaries/allowances, kōenkai income, rent/maintenance, loans/interest.
 */
export function tickMonthlyBoundary(world: WorldState, subs: string[]): void {
  safeCall(() => { tickMonthlyEconomics(world); }) && subs.push("economics_monthly");
  safeCall(() => { facilities.tickMonthly(world); }) && subs.push("facilities");
  safeCall(() => { npcAI.tickMonthly(world); }) && subs.push("npcAI_monthly");

  logEngineEvent(world, {
    type: "MONTHLY_BOUNDARY",
    category: "economy",
    importance: "minor",
    scope: "world",
    title: "Month-end financial cycle",
    summary: `Monthly salaries, rent, and supporter income processed for month ${world.calendar.month}.`,
    data: { year: world.calendar.year, month: world.calendar.month },
    tags: ["economy", "boundary"]
  });

  // Autosave at monthly boundary (Constitution §6)
  safeCall(() => { autosave(world); });
}

/**
 * Monthly economy postings per A3.3:
 * - Sekitori salaries (league → rikishi accounts)
 * - Kōenkai/supporter income (→ heya funds)
 * - Rent/maintenance & facility upkeep
 * - Loans/interest
 */
export function tickMonthlyEconomics(world: WorldState): void {
  for (const heya of stableSort(Array.from(world.heyas.values()), x => (x as any).id || String(x))) {
    // 1. Sekitori monthly salaries (paid to rikishi, deducted from heya as payroll)
    let totalSalaries = 0;
    for (const rId of heya.rikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      const info = RANK_HIERARCHY[r.rank];
      if (info?.isSekitori) {
        const salary = info.salary ?? 0;
        // Credit rikishi account
        if (!r.economics) {
          r.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
        }
        r.economics.cash += salary;
        r.economics.totalEarnings += salary;
        totalSalaries += salary;
      } else {
        // Lower division allowance (~¥70k/month)
        totalSalaries += 70_000;
      }
    }

    // 2. Oyakata monthly salary
    const oyakataSalary = 1_200_000;
    totalSalaries += oyakataSalary;

    // 3. Rent / maintenance / facility upkeep
    const facilityUpkeep =
      (heya.facilities.training * 4000) +
      (heya.facilities.recovery * 4000) +
      (heya.facilities.nutrition * 8000);

    // 4. Kōenkai/supporter monthly income
    const koenkaiBands: Record<string, number> = {
      none: 0,
      weak: 200_000,
      moderate: 800_000,
      strong: 2_000_000,
      powerful: 5_000_000
    };
    const supporterIncome = koenkaiBands[heya.koenkaiBand] ?? 500_000;

    // 5. Apply net
    const totalExpenses = totalSalaries + facilityUpkeep;
    const net = supporterIncome - totalExpenses;
    heya.funds += net;

    // 6. Update runway band
    const monthlyBurn = Math.max(1, totalExpenses);
    const runwayMonths = heya.funds / monthlyBurn;
    if (runwayMonths >= 12) heya.runwayBand = "secure";
    else if (runwayMonths >= 6) heya.runwayBand = "comfortable";
    else if (runwayMonths >= 3) heya.runwayBand = "tight";
    else if (runwayMonths >= 1) heya.runwayBand = "critical";
    else heya.runwayBand = "desperate";

    // 7. Emit financial events for player heya
    if (heya.id === world.playerHeyaId) {
      if (heya.funds < 0) {
        logEngineEvent(world, {
          type: "MONTHLY_DEFICIT",
          category: "economy",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Monthly deficit",
          summary: `${heya.name} is operating at a deficit. Runway: ${heya.runwayBand}.`,
          data: { net, runway: heya.runwayBand },
          tags: ["economy"]
        });
      }
    }
  }
}

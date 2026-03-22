import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import * as facilities from "../facilities";
import { RANK_HIERARCHY } from "../banzuke";
import { runTickPipeline, type TickStep } from "./tickOrchestrator";

/**
 * Monthly boundary tick — Constitution A3.3.
 * Salaries/allowances, kōenkai income, rent/maintenance, loans/interest.
 */
export function tickMonthlyBoundary(world: WorldState, subs: string[]): void {
  const steps: TickStep[] = [
    { label: "economics_monthly", run: (w) => { tickMonthlyEconomics(w); } },
    { label: "facilities", run: (w) => { facilities.tickMonthly(w); } },
  ];

  runTickPipeline(world, subs, steps, { autosave: true });

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
}

/**
 * Monthly economy postings per A3.3:
 * - Sekitori salaries (league → rikishi accounts)
 * - Kōenkai/supporter income (→ heya funds)
 * - Rent/maintenance & facility upkeep
 * - Loans/interest
 */
export function tickMonthlyEconomics(world: WorldState): void {
  for (const heya of world.heyas.values()) {
    let totalSalaries = 0;
    for (const rId of heya.rikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      const info = RANK_HIERARCHY[r.rank];
      if (info?.isSekitori) {
        const salary = info.salary ?? 0;
        if (!r.economics) {
          r.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
        }
        r.economics.cash += salary;
        r.economics.totalEarnings += salary;
        totalSalaries += salary;
      } else {
        totalSalaries += 70_000;
      }
    }

    const oyakataSalary = 1_200_000;
    totalSalaries += oyakataSalary;

    const facilityUpkeep =
      (heya.facilities.training * 4000) +
      (heya.facilities.recovery * 4000) +
      (heya.facilities.nutrition * 8000);

    const koenkaiBands: Record<string, number> = {
      none: 0, weak: 200_000, moderate: 800_000, strong: 2_000_000, powerful: 5_000_000
    };
    const supporterIncome = koenkaiBands[heya.koenkaiBand] ?? 500_000;

    const totalExpenses = totalSalaries + facilityUpkeep;
    const net = supporterIncome - totalExpenses;
    heya.funds += net;

    const monthlyBurn = Math.max(1, totalExpenses);
    const runwayMonths = heya.funds / monthlyBurn;
    if (runwayMonths >= 12) heya.runwayBand = "secure";
    else if (runwayMonths >= 6) heya.runwayBand = "comfortable";
    else if (runwayMonths >= 3) heya.runwayBand = "tight";
    else if (runwayMonths >= 1) heya.runwayBand = "critical";
    else heya.runwayBand = "desperate";

    if (heya.id === world.playerHeyaId && heya.funds < 0) {
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

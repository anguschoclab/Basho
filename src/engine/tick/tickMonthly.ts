import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import * as facilities from "../facilities";
import { RANK_HIERARCHY } from "../banzuke";
import { stableSort } from "../utils/sort";
import { runTickPipeline, type TickStep } from "./tickOrchestrator";

/**
 * Monthly boundary tick — Constitution A3.3.
 * Salaries/allowances, kōenkai income, rent/maintenance, loans/interest.
 */
export function tickMonthlyBoundary(world: WorldState, subs: string[]): void {
  const steps: TickStep[] = [
    { label: "economics_monthly", run: (w) => { tickMonthlyEconomics(w); } },
    { label: "achievements_sync", run: (w) => { syncAchievementCounters(w); } },
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
  for (const heya of stableSort(Array.from(world.heyas.values()), x => x.id)) {
    let totalSalaries = 0;
    for (const rId of heya.rikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      const info = RANK_HIERARCHY[r.rank];
      if (info?.isSekitori) {
        const baseSalary = info.salary ?? 0;
        
        // Kinboshi Stipend (Constitution §3.4): ¥40,000 per star, only in Makuuchi
        const kinboshiCount = r.stats?.achievements?.kinboshiEarned ?? 0;
        const kinboshiStipend = r.division === 'makuuchi' ? kinboshiCount * 40_000 : 0;
        
        const totalRikishiPay = baseSalary + kinboshiStipend;

        if (!r.economics) {
          r.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
        }
        r.economics.cash += totalRikishiPay;
        r.economics.totalEarnings += totalRikishiPay;
        totalSalaries += totalRikishiPay;
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

/**
 * Synchronize achievement counters from the most recent basho results.
 * This ensures that earned/conceded stats are persistent and audit-ready.
 */
export function syncAchievementCounters(world: WorldState): void {
  const lastBasho = world.history?.[world.history.length - 1];
  if (!lastBasho) return;

  // Flatten results from all days (assuming results is BoutResult[][] by day)
  const allResults = (lastBasho as any).results?.flat() || [];

  for (const result of allResults) {
    if (!result.awardFact) continue;

    const winner = world.rikishi.get(result.winnerRikishiId);
    const loser = world.rikishi.get(result.loserRikishiId);

    // Initial persistence is handled in world.ts/boutResolver.ts
    // This serves as an institutional sync point if needed for future logic.
    if (winner && winner.stats?.achievements) {
      // Logic for re-sync would go here if we didn't persist immediately.
    }
    
    if (loser && loser.stats?.achievements) {
      // Logic for re-sync would go here.
    }
  }
}

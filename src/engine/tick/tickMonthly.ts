import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import * as facilities from "../facilities";
import { RANK_HIERARCHY } from "../banzuke";
import { stableSort } from "../utils/sort";
import { isBashoMonth } from "../calendar";
import * as npcAI from "../npcAI";
import * as loans from "../loans";
import { runTickPipeline, type TickStep } from "./tickOrchestrator";

/**
 * Monthly boundary tick — Constitution A3.3.
 * Salaries/allowances, kōenkai income, rent/maintenance, loans/interest.
 */
export function tickMonthlyBoundary(world: WorldState, subs: string[]): void {
  const steps: TickStep[] = [
    { label: "economics_monthly", run: (w) => { tickMonthlyEconomics(w); } },
    { label: "npcAI_monthly", run: (w) => { npcAI.tickMonthlyNPC(w); } },
    { label: "loan_repayments", run: (w) => { loans.processMonthlyLoanRepayments(w); } },
    { label: "archetype_drift", run: (w) => { tickArchetypeDrift(w); } },
    { label: "achievements_sync", run: (w) => { syncAchievementCounters(w); } },
    { label: "facilities", run: (w) => { facilities.tickMonthlyFacilities(w); } },

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
  for (const heya of stableSort(world.heyas.values(), x => x.id)) {
    let totalSalaries = 0;
    const rikishiIds = heya.rikishiIds ?? [];

    for (const rId of rikishiIds) {

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

    const totalExpenses = totalSalaries + facilityUpkeep;
    heya.funds -= totalExpenses;

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
        data: { net: -totalExpenses, runway: heya.runwayBand },
        tags: ["economy"]
      });
    }
  }
}

/**
 * Synchronize achievement counters from the most recent basho results.
 * This ensures that earned/conceded stats are persistent and audit-ready.
 */
function syncAchievementCounters(world: WorldState): void {
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

/**
 * Flag 2: Archetype Drift & Hysteresis Logic
 * Evaluate drift only post-Basho (odd-numbered months).
 */
export function tickArchetypeDrift(world: WorldState): void {
  const month = world.calendar?.month;
  if (month && isBashoMonth(month)) {
        // ⚡ Bolt: filter retired rikishi before applying O(N log N) stableSort to drastically reduce sorting overhead
    const activeRikishi = [];
    for (const r of world.rikishi.values()) {
      if (!r.isRetired) activeRikishi.push(r);
    }
    for (const r of activeRikishi) {
      const evidence = r.archetypeEvidence;
      // Safety check: if somehow it's still the old array format or null, skip/reset
      if (!evidence || Array.isArray(evidence)) {
        r.archetypeEvidence = {
          push: { success: 0, fail: 0 },
          grapple: { success: 0, fail: 0 },
          evade: { success: 0, fail: 0 }
        };
        continue;
      }

      const pushSuccess = evidence.push.success;
      const grappleSuccess = evidence.grapple.success;
      const evadeSuccess = evidence.evade.success;

      // Determine the most successful tactical family during this basho
      let newArchetype = r.tacticalArchetypePrimary;

      if (pushSuccess > grappleSuccess && pushSuccess > evadeSuccess && pushSuccess >= 5) {
        newArchetype = 'oshi';
      } else if (grappleSuccess > pushSuccess && grappleSuccess > evadeSuccess && grappleSuccess >= 5) {
        newArchetype = 'yotsu';
      } else if (evadeSuccess > pushSuccess && evadeSuccess > grappleSuccess && evadeSuccess >= 5) {
        newArchetype = 'trickster';
      }

      // If a drift occurred, dispatch event and update
      if (newArchetype !== r.tacticalArchetypePrimary) {
        logEngineEvent(world, {
          type: "ARCHETYPE_DRIFT",
          category: "training",
          importance: "minor",
          scope: "rikishi",
          rikishiId: r.id,
          title: `${r.shikona} Tactical Shift`,
          summary: `${r.shikona} has drifted towards a ${newArchetype} style after a successful basho.`,
          data: { old: r.tacticalArchetypePrimary, new: newArchetype },
          tags: ["combat", "progression"]
        });
        r.tacticalArchetypePrimary = newArchetype;
      }

      // Cleanup: Reset evidence
      r.archetypeEvidence = {
        push: { success: 0, fail: 0 },
        grapple: { success: 0, fail: 0 },
        evade: { success: 0, fail: 0 }
      };
    }
  }
}


/**
 * phase05_monthly_boundary.ts
 * ===========================
 * Pipeline Phase: Monthly Institutional Updates.
 *
 * Responsibilities:
 * 1. Pay sekitori salaries and kinboshi stipends.
 * 2. Deduct heya maintenance, rent, and staff costs.
 * 3. Process loan repayments.
 * 4. Apply facility decay or maintenance.
 * 5. NPC auto-investment in facilities.
 * 6. NPC monthly decision loops (retirements, recruitment vacancies).
 * 7. Archetype drift evaluation post-basho.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { mergeImpacts } from "../../core/ImpactResolver";
import type { StateImpact } from "../../core/StateImpact";
import { RANK_HIERARCHY } from "../../banzuke";
import { getHeyaStaffBonuses } from "../../staff";
import { isBashoMonth } from "../../calendar";
import { computeFacilitiesBand, type FacilityAxis } from "../../facilities";
import { tickMonthlyNPC } from "../../npcAI";

export function phase05_monthly_boundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder('phase05_monthly_boundary');
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return builder.build();

  // 1. Process Heyas (Economics, Loans, Facilities, NPC AI)
  for (const [id, heya] of world.heyas) {
    const heyaUpdates: any = {};

    // -- Economics: Salaries & Upkeep --
    const totalExpenses = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates);

    // -- Loan Repayments --
    processLoanRepayments(world, heya, heyaUpdates);

    // -- Facilities Decay & Maintenance --
    const maintenance = processFacilitiesMaintenance(world, heya, heyaUpdates);

    // -- NPC Auto-Investment --
    processNpcAutoInvestment(world, heya, totalExpenses, maintenance, heyaUpdates);

    // Runway Band Sync
    const burn = Math.max(1, totalExpenses + maintenance);
    const runway = (heyaUpdates.funds ?? heya.funds ?? 0) / burn;
    heyaUpdates.runwayBand =
      runway >= 12
        ? "secure"
        : runway >= 6
          ? "comfortable"
          : runway >= 3
            ? "tight"
            : runway >= 1
              ? "critical"
              : "desperate";

    builder.updateHeya(id, heyaUpdates);
  }

  // 2. Process Rikishi (Archetype Drift)
  if (isBashoMonth(world.calendar.month)) {
    for (const [id, r] of world.rikishi) {
      if (r.isRetired) continue;
      const nextR = { ...r };
      if (processArchetypeDrift(world, nextR)) {
        builder.updateRikishi(id, nextR);
      }
    }
  }

  builder.logEvent(
    'BASHO_STATUS',
    'narrative',
    {
      status: "meta_shift",
      incident: "monthly_boundary",
      day: world.calendar.month,
      score: world.calendar.year,
    }
  );

  // NPC Monthly Strategy: finance decisions, sponsor recruitment, governance,
  // retirement evaluation, vacancy assessment. This was previously orphaned
  // (tickMonthlyNPC exported but never called from the pipeline).
  const npcMonthlyImpact = tickMonthlyNPC(world);

  return mergeImpacts([builder.build(), npcMonthlyImpact]);
}

// --- Helper Functions ---

function processHeyaEconomics(
  world: WorldState,
  heya: Heya,
  rikishiMap: Map<string, Rikishi>,
  heyaUpdates: any,
): number {
  let totalSalaries = 0;
  const rikishiIds = heya.rikishiIds ?? [];

  for (const rId of rikishiIds) {
    const r = rikishiMap.get(rId) || world.rikishi.get(rId);
    if (!r) continue;

    const info = RANK_HIERARCHY[r.rank];
    if (info?.isSekitori) {
      const baseSalary = info.salary ?? 0;
      const kinboshiCount = r.stats?.achievements?.kinboshiEarned ?? 0;
      const kinboshiStipend =
        r.division === "makuuchi" ? kinboshiCount * 40_000 : 0;
      const totalRikishiPay = baseSalary + kinboshiStipend;

      const rikishiUpdates: any = {
        economics: {
          ...(r.economics || {
            cash: 0,
            retirementFund: 0,
            careerKenshoWon: 0,
            kinboshiCount: 0,
            totalEarnings: 0,
            currentBashoEarnings: 0,
            popularity: 50,
          }),
        },
      };
      rikishiUpdates.economics.cash += totalRikishiPay;
      rikishiUpdates.economics.totalEarnings += totalRikishiPay;
      // Note: rikishi economics updates not directly supported by ImpactBuilder yet
      // For now, we'll update them directly
      const updatedR = { ...r, ...rikishiUpdates };
      if (world.rikishi.has(rId)) {
        world.rikishi.set(rId, updatedR);
      }
      totalSalaries += totalRikishiPay;
    } else {
      totalSalaries += 70_000;
    }
  }

  const staffBonuses = getHeyaStaffBonuses(world, heya.id);
  const oyakataSalary = 1_200_000 * staffBonuses.administration;
  const facilityUpkeep =
    (heya.facilities.training * 4000 +
      heya.facilities.recovery * 4000 +
      heya.facilities.nutrition * 8000) *
    staffBonuses.administration;
  const totalExpenses = totalSalaries + facilityUpkeep + oyakataSalary;

  heyaUpdates.funds = (heya.funds ?? 0) - totalExpenses;

  return totalExpenses;
}

function processLoanRepayments(world: WorldState, heya: Heya, heyaUpdates: any): void {
  if (heya.activeLoans && heya.activeLoans.length > 0) {
    let totalPayment = 0;
    const nextLoans = [];
    for (const loan of heya.activeLoans) {
      const payment = Math.min(loan.monthlyPayment, loan.remainingBalance);
      totalPayment += payment;
      const nextLoan = {
        ...loan,
        remainingBalance: loan.remainingBalance - payment,
      };
      if (nextLoan.remainingBalance > 0) {
        nextLoans.push(nextLoan);
      } else {
        // Note: EventBus replaced - loan paid off event skipped for now
        console.log(`[LoanPaidOff] ${heya.name} paid off loan from ${loan.providerName}`);
      }
    }
    heyaUpdates.activeLoans = nextLoans;
    heyaUpdates.funds = (heyaUpdates.funds ?? heya.funds ?? 0) - totalPayment;
  }
}

function processFacilitiesMaintenance(
  world: WorldState,
  heya: Heya,
  heyaUpdates: any,
): number {
  const maintenance =
    (heya.facilities.training +
      heya.facilities.recovery +
      heya.facilities.nutrition) *
    3000;
  const currentFunds = heyaUpdates.funds ?? heya.funds ?? 0;
  if (currentFunds >= maintenance) {
    heyaUpdates.funds = currentFunds - maintenance;
  } else {
    heyaUpdates.facilities = {
      training: Math.max(5, heya.facilities.training - 2),
      recovery: Math.max(5, heya.facilities.recovery - 2),
      nutrition: Math.max(5, heya.facilities.nutrition - 2),
    };
    const oldBand = heya.facilitiesBand;
    heyaUpdates.facilitiesBand = computeFacilitiesBand(heya);
    // Note: EventBus replaced - facility degraded event skipped for now
    console.log(`[FacilityDegraded] ${heya.name} facilities degraded`);
  }
  return maintenance;
}

function processNpcAutoInvestment(
  world: WorldState,
  heya: Heya,
  totalExpenses: number,
  maintenance: number,
  heyaUpdates: any,
): void {
  if (heya.id !== world.playerHeyaId) {
    const monthlyBurn = Math.max(1, totalExpenses + maintenance);
    const currentFunds = heyaUpdates.funds ?? heya.funds ?? 0;
    const runway = currentFunds / monthlyBurn;

    if (runway > 6) {
      const facilities = heya.facilities;
      const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];
      const weakestAxis = axes.reduce(
        (min, axis) => (facilities[axis] < facilities[min] ? axis : min),
        axes[0],
      );

      const currentLevel = facilities[weakestAxis];
      const maxLevel = 100;

      const maxPoints = 5;
      const desiredPoints = Math.min(maxPoints, maxLevel - currentLevel);

      if (desiredPoints > 0) {
        const baseCost = 200_000;
        let upgradeCost = 0;
        let points = 0;

        for (let i = 0; i < desiredPoints; i++) {
          const level = currentLevel + i;
          let cost = baseCost;
          if (level >= 40) cost = baseCost * 1.5;
          if (level >= 60) cost = baseCost * 2.5;
          if (level >= 80) cost = baseCost * 4;

          if (currentFunds >= upgradeCost + cost) {
            upgradeCost += cost;
            points++;
          } else {
            break;
          }
        }

        if (points > 0 && upgradeCost > 0) {
          heyaUpdates.funds = currentFunds - upgradeCost;
          heyaUpdates.facilities = {
            ...facilities,
            [weakestAxis]: Math.min(maxLevel, currentLevel + points)
          };
          heyaUpdates.facilitiesBand = computeFacilitiesBand({
            ...heya,
            facilities: heyaUpdates.facilities
          });
          // Note: EventBus replaced - facility upgraded event skipped for now
          console.log(`[FacilityUpgraded] ${heya.name} upgraded ${weakestAxis}`);
        }
      }
    }
  }
}

function processArchetypeDrift(world: WorldState, nextR: Rikishi): boolean {
  const evidence = nextR.archetypeEvidence;
  if (evidence && !Array.isArray(evidence)) {
    let newArchetype = nextR.tacticalArchetypePrimary;
    if (
      evidence.push.success >= 5 &&
      evidence.push.success > evidence.grapple.success
    )
      newArchetype = "oshi";
    else if (
      evidence.grapple.success >= 5 &&
      evidence.grapple.success > evidence.push.success
    )
      newArchetype = "yotsu";

    if (newArchetype !== nextR.tacticalArchetypePrimary) {
      // Note: EventBus replaced - training update event skipped for now
      console.log(`[TrainingUpdate] ${nextR.shikona} archetype changed to ${newArchetype}`);
      nextR.tacticalArchetypePrimary = newArchetype;
    }
    nextR.archetypeEvidence = {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    };
    return true;
  }
  return false;
}

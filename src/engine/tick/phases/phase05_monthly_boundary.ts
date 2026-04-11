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
import { RANK_HIERARCHY } from "../../banzuke";
import { getHeyaStaffBonuses } from "../../staff";
import { EventBus } from "../../events";
import { isBashoMonth } from "../../calendar";
import { computeFacilitiesBand, type FacilityAxis } from "../../facilities";

export function phase05_monthly_boundary(world: WorldState): WorldState {
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return world;

  const nextHeyas = new Map(world.heyas);
  const nextRikishi = new Map(world.rikishi);

  // 1. Process Heyas (Economics, Loans, Facilities, NPC AI)
  for (const [id, heya] of world.heyas) {
    let nextHeya = { ...heya };

    // -- Economics: Salaries & Upkeep --
    const totalExpenses = processHeyaEconomics(world, nextHeya, nextRikishi);

    // -- Loan Repayments --
    processLoanRepayments(world, nextHeya);

    // -- Facilities Decay & Maintenance --
    const maintenance = processFacilitiesMaintenance(world, nextHeya);

    // -- NPC Auto-Investment --
    processNpcAutoInvestment(world, nextHeya, totalExpenses, maintenance);

    // Runway Band Sync
    const burn = Math.max(1, totalExpenses + maintenance);
    const runway = (nextHeya.funds ?? 0) / burn;
    nextHeya.runwayBand =
      runway >= 12
        ? "secure"
        : runway >= 6
          ? "comfortable"
          : runway >= 3
            ? "tight"
            : runway >= 1
              ? "critical"
              : "desperate";

    nextHeyas.set(id, nextHeya);
  }

  // 2. Process Rikishi (Archetype Drift)
  if (isBashoMonth(world.calendar.month)) {
    for (const [id, r] of nextRikishi) {
      if (r.isRetired) continue;
      const nextR = { ...r };
      if (processArchetypeDrift(world, nextR)) {
        nextRikishi.set(id, nextR);
      }
    }
  }

  EventBus.bashoStatus(world, {
    status: "meta_shift",
    incident: "monthly_boundary",
    day: world.calendar.month,
    score: world.calendar.year,
  });

  return {
    ...world,
    heyas: nextHeyas,
    rikishi: nextRikishi,
  };
}

// --- Helper Functions ---

function processHeyaEconomics(
  world: WorldState,
  nextHeya: Heya,
  nextRikishi: Map<string, Rikishi>,
): number {
  let totalSalaries = 0;
  const rikishiIds = nextHeya.rikishiIds ?? [];

  for (const rId of rikishiIds) {
    const r = nextRikishi.get(rId) || world.rikishi.get(rId);
    if (!r) continue;

    const info = RANK_HIERARCHY[r.rank];
    if (info?.isSekitori) {
      const baseSalary = info.salary ?? 0;
      const kinboshiCount = r.stats?.achievements?.kinboshiEarned ?? 0;
      const kinboshiStipend =
        r.division === "makuuchi" ? kinboshiCount * 40_000 : 0;
      const totalRikishiPay = baseSalary + kinboshiStipend;

      const nextR = {
        ...r,
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
      nextR.economics.cash += totalRikishiPay;
      nextR.economics.totalEarnings += totalRikishiPay;
      nextRikishi.set(rId, nextR);
      totalSalaries += totalRikishiPay;
    } else {
      totalSalaries += 70_000;
    }
  }

  const staffBonuses = getHeyaStaffBonuses(world, nextHeya.id);
  const oyakataSalary = 1_200_000 * staffBonuses.administration;
  const facilityUpkeep =
    (nextHeya.facilities.training * 4000 +
      nextHeya.facilities.recovery * 4000 +
      nextHeya.facilities.nutrition * 8000) *
    staffBonuses.administration;
  const totalExpenses = totalSalaries + facilityUpkeep + oyakataSalary;

  nextHeya.funds = (nextHeya.funds ?? 0) - totalExpenses;

  return totalExpenses;
}

function processLoanRepayments(world: WorldState, nextHeya: Heya): void {
  if (nextHeya.activeLoans && nextHeya.activeLoans.length > 0) {
    let totalPayment = 0;
    const nextLoans = [];
    for (const loan of nextHeya.activeLoans) {
      const payment = Math.min(loan.monthlyPayment, loan.remainingBalance);
      totalPayment += payment;
      const nextLoan = {
        ...loan,
        remainingBalance: loan.remainingBalance - payment,
      };
      if (nextLoan.remainingBalance > 0) {
        nextLoans.push(nextLoan);
      } else {
        EventBus.financialAlert(world, nextHeya.id, {
          incident: "loan_paid_off",
          status: loan.type,
          heya: loan.providerName,
          heyaname: nextHeya.name,
        });
      }
    }
    nextHeya.activeLoans = nextLoans;
    nextHeya.funds = (nextHeya.funds ?? 0) - totalPayment;
  }
}

function processFacilitiesMaintenance(
  world: WorldState,
  nextHeya: Heya,
): number {
  const maintenance =
    (nextHeya.facilities.training +
      nextHeya.facilities.recovery +
      nextHeya.facilities.nutrition) *
    3000;
  if ((nextHeya.funds ?? 0) >= maintenance) {
    nextHeya.funds = (nextHeya.funds ?? 0) - maintenance;
  } else {
    nextHeya.facilities = {
      training: Math.max(5, nextHeya.facilities.training - 2),
      recovery: Math.max(5, nextHeya.facilities.recovery - 2),
      nutrition: Math.max(5, nextHeya.facilities.nutrition - 2),
    };
    const oldBand = nextHeya.facilitiesBand;
    nextHeya.facilitiesBand = computeFacilitiesBand(nextHeya);
    if (nextHeya.facilitiesBand !== oldBand) {
      EventBus.facilityUpdate(
        world,
        nextHeya.id,
        {
          oldBand,
          newBand: nextHeya.facilitiesBand,
        },
        "DEGRADED",
      );
    }
  }
  return maintenance;
}

function processNpcAutoInvestment(
  world: WorldState,
  nextHeya: Heya,
  totalExpenses: number,
  maintenance: number,
): void {
  if (nextHeya.id !== world.playerHeyaId) {
    const monthlyBurn = Math.max(1, totalExpenses + maintenance);
    const runway = (nextHeya.funds ?? 0) / monthlyBurn;

    if (runway > 6) {
      const facilities = nextHeya.facilities;
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

          if ((nextHeya.funds ?? 0) >= upgradeCost + cost) {
            upgradeCost += cost;
            points++;
          } else {
            break;
          }
        }

        if (points > 0 && upgradeCost > 0) {
          nextHeya.funds = (nextHeya.funds ?? 0) - upgradeCost;
          facilities[weakestAxis] = Math.min(maxLevel, currentLevel + points);
          const oldBand = nextHeya.facilitiesBand;
          nextHeya.facilitiesBand = computeFacilitiesBand(nextHeya);

          EventBus.facilityUpdate(
            world,
            nextHeya.id,
            {
              axis: weakestAxis,
              oldLevel: currentLevel,
              newLevel: facilities[weakestAxis],
              cost: upgradeCost,
              band: nextHeya.facilitiesBand,
            },
            "UPGRADED",
          );
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
      EventBus.trainingUpdate(world, {
        rikishiId: nextR.id,
        status: newArchetype,
        reason: nextR.tacticalArchetypePrimary,
      });
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

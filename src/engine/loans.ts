// @ts-nocheck
// loans.ts
// Implementation of the Loans & Benefactors (Insolvency Rescue) system.
// Aligned with Basho Constitution A13 (12. Loans & Benefactors).

import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Loan, LoanType } from "./types/economy";
import { logEngineEvent } from "./events";
import { generateGovernanceHeadline } from "./media";
import { rngForWorld } from "./rng";
import { stableSort } from "./utils/sort";

/**
 * Check and issue loans for insolvent stables.
 * Triggered when funds drop below a critical threshold (e.g. -5,000,000).
 * Escalate from Emergency -> Supporter -> Benefactor.
 */
export function issueBailoutLoanIfNeeded(world: WorldState, heyaId: string): void {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  if (heya.funds >= -5_000_000) return; // Not critical enough for bailout yet

  // If they already have a benefactor loan, they might be beyond saving (forced closure/merger)
  if (heya.activeLoans?.some(l => l.type === "benefactor")) {
    // Escalate to terminal insolvency check (handled by world.ts merger/closure pressure)
    return;
  }

  const deficit = Math.abs(heya.funds);
  let loanType: LoanType = "emergency";
  let interestRate = 0;
  let providerName = "Sumo Association";
  let stringsAttached: string[] = [];

  const existingLoans = heya.activeLoans?.length || 0;
  const scandalScore = heya.scandalScore || 0;
  const rng = rngForWorld(world, `loan_${heyaId}_${world.year}_${world.week}`);

  // Escalate based on existing debt and scandal
  if (existingLoans === 0 && scandalScore < 30) {
    // 1. Emergency Loan (0%, short-term, restrictive)
    loanType = "emergency";
    interestRate = 0;
    stringsAttached = ["recruitment_ban"];
  } else if (existingLoans === 1 || (existingLoans === 0 && scandalScore >= 30 && scandalScore < 60)) {
    // 2. Supporter Loan (2-4%, medium-term, autonomy loss)
    loanType = "supporter";
    interestRate = 0.03; // 3%
    providerName = `${heya.name} Kōenkai`;
    stringsAttached = ["recruitment_ban", "facility_downgrade_risk"];
  } else {
    // 3. Benefactor Bailout (5-8%, long-term, governance leverage)
    loanType = "benefactor";
    interestRate = 0.06; // 6%

    // Attempt to find a high-tier sponsor to be the benefactor
    const kōenkai = world.sponsorPool?.koenkais.get(heya.id);
    let benefactorSponsor = null;
    if (kōenkai && kōenkai.members.length > 0) {
      // Find highest tier member
      let bestTier = -1;
      for (const m of kōenkai.members) {
        const s = world.sponsorPool?.sponsors.get(m.sponsorId);
        if (s && s.tier > bestTier) {
          bestTier = s.tier;
          benefactorSponsor = s;
        }
      }
    }

    if (benefactorSponsor) {
      providerName = benefactorSponsor.displayName;
    } else {
      providerName = "Anonymous Benefactor";
    }
    stringsAttached = ["foreign_slot_lock", "upgrade_lock", "merger_block"];
  }

  // Calculate loan amount (cover deficit + 2M buffer)
  const principal = deficit + 2_000_000;
  // Determine terms (Emergency: 12 months, Supporter: 24 months, Benefactor: 36 months)
  const months = loanType === "emergency" ? 12 : loanType === "supporter" ? 24 : 36;

  // Simple amortization (Principal + Interest) / months
  const totalInterest = principal * interestRate;
  const monthlyPayment = Math.ceil((principal + totalInterest) / months);

  const loan: Loan = {
    id: `loan_${heyaId}_${world.year}_${world.week}_${rng.int(0, 9999)}`,
    type: loanType,
    principal,
    interestRate,
    remainingBalance: principal + totalInterest,
    providerName,
    monthlyPayment,
    issuedAtYear: world.year,
    issuedAtMonth: world.calendar?.month ?? 1,
    stringsAttached
  };

  if (!heya.activeLoans) heya.activeLoans = [];
  heya.activeLoans.push(loan);
  heya.funds += principal;

  // Penalize prestige
  heya.reputation = Math.max(0, (heya.reputation || 50) - 10);

  if (loanType === "benefactor" || loanType === "supporter") {
    heya.scandalScore = Math.min(100, (heya.scandalScore || 0) + 10); // Governance scrutiny
  }

  logEngineEvent(world, {
    type: "LOAN_ISSUED",
    category: "economy",
    importance: loanType === "benefactor" ? "headline" : "major",
    scope: "heya",
    heyaId: heya.id,
    title: `${loanType === "emergency" ? "Emergency Loan" : loanType === "supporter" ? "Supporter Loan" : "Benefactor Bailout"} for ${heya.name}`,
    summary: `${providerName} provides a ¥${principal.toLocaleString()} loan to prevent ${heya.name}'s collapse. Strings attached: ${stringsAttached.join(", ")}.`,
    data: { loanAmount: principal, loanType, providerName, interestRate }
  });

  generateGovernanceHeadline({
    world,
    heyaId: heya.id,
    type: loanType === "emergency" ? "emergency_loan" : "scandal",
    severity: loanType === "benefactor" ? "critical" : "major",
    description: `${providerName} steps in with a ¥${principal.toLocaleString()} bailout for ${heya.name}, but with heavy stipulations.`
  });
}

/**
 * Process monthly loan repayments for all heyas.
 */
export function processMonthlyLoanRepayments(world: WorldState): void {
  for (const heya of stableSort(Array.from(world.heyas.values()), x => (x as any).id || String(x))) {
    if (!heya.activeLoans || heya.activeLoans.length === 0) continue;

    let totalPayment = 0;
    const remainingLoans: Loan[] = [];

    for (const loan of heya.activeLoans) {
      if (loan.remainingBalance <= 0) continue;

      const payment = Math.min(loan.monthlyPayment, loan.remainingBalance);
      totalPayment += payment;
      loan.remainingBalance -= payment;

      if (loan.remainingBalance > 0) {
        remainingLoans.push(loan);
      } else {
        // Loan paid off
        logEngineEvent(world, {
          type: "LOAN_PAID_OFF",
          category: "economy",
          importance: "notable",
          scope: "heya",
          heyaId: heya.id,
          title: `Loan paid off by ${heya.name}`,
          summary: `${heya.name} has successfully paid off their ${loan.type} loan from ${loan.providerName}.`,
          data: { loanId: loan.id }
        });
      }
    }

    heya.activeLoans = remainingLoans;

    if (totalPayment > 0) {
      heya.funds -= totalPayment;
      // If payment causes severe insolvency again, bailout logic will catch it next tick/review
    }
  }
}

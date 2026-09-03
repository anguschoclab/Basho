import type { Id } from "./types/common";
import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Loan, LoanType } from "./types/economy";
import { generateGovernanceHeadline } from "./systems/media/MediaService";
import { rngForWorld } from "./rng";
import type { SeededRNG } from "./rng";
import { stableSort } from "./utils/sort";
import { selectBenefactor } from "./systems/economy/SponsorshipService";
import { LOAN_ISSUANCE_THRESHOLD, FACTION_BAILOUT_AMOUNT } from "../constants/engine/economic";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { getHeya } from "./queries";

export interface LoanTerms {
  loanType: LoanType;
  interestRate: number;
  providerName: string;
  stringsAttached: string[];
  principal: number;
  months: number;
}

export function determineLoanTerms(
  world: WorldState,
  heya: Heya,
  _rng: SeededRNG,
  deficit: number
): LoanTerms {
  let loanType: LoanType;
  let interestRate: number;
  let providerName = "Sumo Association";
  let stringsAttached: string[];

  const existingLoans = heya.activeLoans?.length || 0;
  const scandalScore = heya.scandalScore || 0;

  // Escalate based on existing debt and scandal
  if (existingLoans === 0 && scandalScore < 30) {
    // 1. Emergency Loan (0%, short-term, restrictive)
    loanType = "emergency";
    interestRate = 0;
    stringsAttached = ["recruitment_ban"];
  } else if (
    existingLoans === 1 ||
    (existingLoans === 0 && scandalScore >= 30 && scandalScore < 60)
  ) {
    // 2. Supporter Loan (2-4%, medium-term, autonomy loss)
    loanType = "supporter";
    interestRate = 0.03; // 3%
    providerName = `${heya.name} Kōenkai`;
    stringsAttached = ["recruitment_ban", "facility_downgrade_risk"];
  } else {
    // 3. Benefactor Bailout (5-8%, long-term, governance leverage)
    loanType = "benefactor";
    interestRate = 0.06; // 6%

    // Attempt to find a high-tier sponsor to be the benefactor using authoritative service
    const pool = world.sponsorPool;
    const koenkai = pool?.koenkais.get(`koenkai_${heya.id}`);
    const benefactorSponsor = pool ? selectBenefactor(heya.id, pool, koenkai) : null;

    if (benefactorSponsor) {
      providerName = benefactorSponsor.displayName;
    } else {
      providerName = "Anonymous Benefactor";
    }
    stringsAttached = ["foreign_slot_lock", "upgrade_lock", "merger_block"];
  }

  // Calculate loan amount (cover deficit + 2M buffer)
  const principal = deficit + FACTION_BAILOUT_AMOUNT;
  // Determine terms (Emergency: 12 months, Supporter: 24 months, Benefactor: 36 months)
  const months = loanType === "emergency" ? 12 : loanType === "supporter" ? 24 : 36;

  return { loanType, interestRate, providerName, stringsAttached, principal, months };
}

export function createLoanObject(
  world: WorldState,
  _heyaId: Id,
  terms: LoanTerms,
  rng: SeededRNG
): Loan {
  // Simple amortization (Principal + Interest) / months
  const totalInterest = terms.principal * terms.interestRate;
  const monthlyPayment = Math.ceil((terms.principal + totalInterest) / terms.months);

  return {
    id: rng.uuid("LN"),
    type: terms.loanType,
    principal: terms.principal,
    interestRate: terms.interestRate,
    remainingBalance: terms.principal + totalInterest,
    providerName: terms.providerName,
    monthlyPayment,
    issuedAtYear: world.year,
    issuedAtMonth: world.calendar?.month ?? 1,
    stringsAttached: terms.stringsAttached,
  };
}

/**
 * Check and issue loans for insolvent stables.
 * Triggered when funds drop below a critical threshold (e.g. -5,000,000).
 * Escalate from Emergency -> Supporter -> Benefactor.
 * Returns StateImpact describing loan issuance instead of mutating state.
 */
export function issueBailoutLoanIfNeeded(world: WorldState, heyaId: Id): StateImpact {
  const builder = createImpactBuilder("bailoutLoan");
  const heya = getHeya(world, heyaId);
  if (!heya) {
    return builder.build();
  }

  if (heya.funds >= LOAN_ISSUANCE_THRESHOLD) return builder.build(); // Not critical enough for bailout yet

  // If they already have a benefactor loan, they might be beyond saving (forced closure/merger)
  if (heya.activeLoans?.some((l) => l.type === "benefactor")) {
    // Escalate to terminal insolvency check (handled by world.ts merger/closure pressure)
    return builder.build();
  }

  const deficit = Math.abs(heya.funds);
  const rng = rngForWorld(world, "economy", `loan_${heyaId}_${world.year}_${world.week}`);

  const terms = determineLoanTerms(world, heya, rng, deficit);
  const loan = createLoanObject(world, heyaId, terms, rng);

  const activeLoans = heya.activeLoans || [];
  const newActiveLoans = [...activeLoans, loan];
  const newFunds = heya.funds + terms.principal;

  // Penalize prestige
  const newReputation = Math.max(0, (heya.reputation ?? 50) - 10);

  let newScandalScore = heya.scandalScore ?? 0;
  if (terms.loanType === "benefactor" || terms.loanType === "supporter") {
    newScandalScore = Math.min(100, newScandalScore + 10); // Governance scrutiny
  }

  builder.updateHeya(heyaId, {
    activeLoans: newActiveLoans,
    funds: newFunds,
    reputation: newReputation,
    scandalScore: newScandalScore,
  });

  builder.logEvent(
    "FINANCIAL_ALERT",
    "economy",
    {
      incident: "loan_issued",
      status: terms.loanType,
      money: terms.principal,
      heyaname: heya.name,
      heya: terms.providerName,
      reason: terms.stringsAttached.join("|"),
    },
    { heyaId: heya.id, importance: terms.loanType === "benefactor" ? "major" : "notable" }
  );

  builder.merge(
    generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      templatePath:
        terms.loanType === "emergency"
          ? "institutional.governance.emergency_loan"
          : "institutional.governance.scandal",
      severity: terms.loanType === "benefactor" ? "main_event" : "national",
    })
  );

  return builder.build();
}

/**
 * Process monthly loan repayments for all heyas.
 * Returns StateImpact describing loan repayments instead of mutating state directly.
 */
export function processMonthlyLoanRepayments(world: WorldState): StateImpact {
  const builder = createImpactBuilder("processMonthlyLoanRepayments");

  for (const heya of stableSort(world.heyas.values(), (x) => x.id)) {
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
        builder.logEvent(
          "FINANCIAL_ALERT",
          "economy",
          {
            incident: "loan_paid_off",
            status: loan.type,
            heya: loan.providerName,
            heyaname: heya.name,
          },
          { heyaId: heya.id }
        );
      }
    }

    const updates: Partial<Heya> = {};

    if (totalPayment > 0 || heya.activeLoans.length !== remainingLoans.length) {
      updates.activeLoans = remainingLoans;
    }

    if (totalPayment > 0) {
      updates.funds = heya.funds - totalPayment;
    }

    if (Object.keys(updates).length > 0) {
      builder.updateHeya(heya.id, updates);
    }
  }

  return builder.build();
}

/**
 * Prepay a loan early by paying the remaining balance.
 * Returns StateImpact describing the prepayment instead of mutating state directly.
 */
export function prepayLoan(world: WorldState, heyaId: Id, loanId: string): StateImpact {
  const builder = createImpactBuilder("prepayLoan");
  const heya = getHeya(world, heyaId);
  if (!heya) {
    return builder.build();
  }

  if (!heya.activeLoans || heya.activeLoans.length === 0) {
    return builder.build();
  }

  const loanIndex = heya.activeLoans.findIndex((l) => l.id === loanId);
  if (loanIndex === -1) {
    return builder.build();
  }

  const loan = heya.activeLoans[loanIndex];
  const payoffAmount = loan.remainingBalance;

  if (heya.funds < payoffAmount) {
    return builder.build();
  }

  const newActiveLoans = heya.activeLoans.filter((l) => l.id !== loanId);
  const newFunds = heya.funds - payoffAmount;

  builder.updateHeya(heyaId, {
    activeLoans: newActiveLoans,
    funds: newFunds,
  });

  builder.logEvent(
    "FINANCIAL_ALERT",
    "economy",
    {
      incident: "loan_prepaid",
      status: loan.type,
      money: payoffAmount,
      heya: loan.providerName,
      heyaname: heya.name,
    },
    { heyaId: heya.id, importance: "notable" }
  );

  return builder.build();
}

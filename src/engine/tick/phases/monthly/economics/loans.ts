/**
 * loans.ts
 * ========
 * Monthly loan repayment processing.
 * Extracted from phase05_monthly_boundary.ts for modularity.
 */

import type { WorldState } from "../../../../types/world";
import type { Heya } from "../../../../types/heya";
import type { HeyaUpdates } from "../types";
import type { ImpactBuilder } from "../../../../core/ImpactBuilder";

export function processLoanRepayments(
  _world: WorldState,
  heya: Heya,
  heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): void {
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
    heyaUpdates.activeLoans = nextLoans;
    heyaUpdates.funds = (heyaUpdates.funds ?? heya.funds ?? 0) - totalPayment;
  }
}

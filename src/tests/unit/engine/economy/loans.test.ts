import { describe, it, expect, beforeEach } from "vitest";
import { processLoanRepayments } from "@/engine/tick/phases/monthly/economics/loans";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder, ImpactBuilder } from "@/engine/core/ImpactBuilder";

describe("processLoanRepayments", () => {
  let world: WorldState;
  let builder: ImpactBuilder;

  beforeEach(() => {
    world = MockFactory.createWorld();
    builder = createImpactBuilder("test");
  });

  it("should process loan repayments and deduct from funds", () => {
    const heya = MockFactory.createHeya("heya-1", {
      activeLoans: [
        {
          id: "loan-1",
          type: "supporter",
          providerName: "Bank",
          principal: 500,
          interestRate: 0.05,
          remainingBalance: 500,
          monthlyPayment: 100,
          issuedAtYear: 2026,
          issuedAtMonth: 1,
        },
      ],
    });
    heya.funds = 1000;

    const heyaUpdates: any = { funds: heya.funds };

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(900);
    expect(heyaUpdates.activeLoans).toBeDefined();
    expect(heyaUpdates.activeLoans?.length).toBe(1);
    expect(heyaUpdates.activeLoans?.[0]?.remainingBalance).toBe(400);
  });

  it("should log FINANCIAL_ALERT when loan is fully paid off and remove from active loans", () => {
    const heya = MockFactory.createHeya("heya-1", {
      name: "Test Heya",
      activeLoans: [
        {
          id: "loan-1",
          type: "supporter",
          providerName: "Bank",
          principal: 500,
          interestRate: 0.05,
          remainingBalance: 50,
          monthlyPayment: 100, // payment > balance
          issuedAtYear: 2026,
          issuedAtMonth: 1,
        },
      ],
    });
    heya.funds = 1000;

    const heyaUpdates: any = { funds: heya.funds };

    processLoanRepayments(world, heya, heyaUpdates, builder);

    // Only deducts 50
    expect(heyaUpdates.funds).toBe(950);
    // Loan is gone
    expect(heyaUpdates.activeLoans).toBeDefined();
    expect(heyaUpdates.activeLoans?.length).toBe(0);

    // Check event log
    const stateImpact = builder.build();
    expect(stateImpact.events).toBeDefined();
    const alertEvent = stateImpact.events?.find((e: any) => e.type === "FINANCIAL_ALERT");
    expect(alertEvent).toBeDefined();
    expect(alertEvent?.data.incident).toBe("loan_paid_off");
  });
});

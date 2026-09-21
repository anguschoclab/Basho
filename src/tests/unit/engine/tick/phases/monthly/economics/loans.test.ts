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

  it("does nothing if there are no active loans", () => {
    const heya = MockFactory.createHeya("h-1");
    heya.activeLoans = [];
    const heyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates).toEqual({});
    expect(builder.build().events?.length).toBeFalsy();
  });

  it("deducts monthly payments and retains loans with remaining balance", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 10000 });
    heya.activeLoans = [
      { id: "L1", type: "bank", providerName: "Bank A", remainingBalance: 1000, monthlyPayment: 200 },
      { id: "L2", type: "bank", providerName: "Bank B", remainingBalance: 500, monthlyPayment: 150 },
    ];
    const heyaUpdates: any = { funds: 10000 };

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(10000 - 350);
    expect(heyaUpdates.activeLoans).toHaveLength(2);
    expect(heyaUpdates.activeLoans[0].remainingBalance).toBe(800);
    expect(heyaUpdates.activeLoans[1].remainingBalance).toBe(350);
    expect(builder.build().events?.length).toBeFalsy();
  });

  it("pays off loan and triggers event when remaining balance is less than or equal to monthly payment", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 10000, name: "Test Heya" });
    heya.activeLoans = [
      { id: "L1", type: "bank", providerName: "Bank A", remainingBalance: 100, monthlyPayment: 200 },
    ];
    const heyaUpdates: any = { funds: 10000 };

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(10000 - 100);
    expect(heyaUpdates.activeLoans).toHaveLength(0);

    const events = builder.build().events;
    expect(events?.length).toBe(1);
    expect(events?.[0].type).toBe("FINANCIAL_ALERT");
    expect(events?.[0].data.incident).toBe("loan_paid_off");
  });

  it("uses heya.funds if heyaUpdates.funds is undefined", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 10000 });
    heya.activeLoans = [
      { id: "L1", type: "bank", providerName: "Bank A", remainingBalance: 500, monthlyPayment: 200 },
    ];
    const heyaUpdates: any = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(10000 - 200);
  });
});

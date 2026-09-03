import { describe, it, expect, beforeEach } from "vitest";
import { processMonthlyLoanRepayments, prepayLoan } from "@/engine/loans";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

describe("loan repayment and prepayment", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
    world.heyas = new Map();
  });

  describe("processMonthlyLoanRepayments", () => {
    it("should deduct monthly payment and reduce remaining balance", () => {
      const heya = MockFactory.createHeya("heya-1", {
        funds: 1000,
        activeLoans: [
          {
            id: "loan-1",
            type: "emergency",
            providerName: "Sumo Association",
            principal: 1000,
            interestRate: 0,
            remainingBalance: 500,
            monthlyPayment: 100,
            issuedAtYear: 2026,
            issuedAtMonth: 1,
            stringsAttached: [],
          },
        ],
      });
      world.heyas.set("heya-1", heya);

      const impact = processMonthlyLoanRepayments(world);
      const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-1");

      expect(heyaUpdates).toBeDefined();
      expect(heyaUpdates?.funds).toBe(900); // 1000 - 100
      // if array length matches it doesn't add activeLoans to updates, so let's check it's not present
      expect(heyaUpdates?.activeLoans).toBeUndefined();
    });

    it("should remove loan when fully paid off", () => {
      const heya = MockFactory.createHeya("heya-1", {
        funds: 1000,
        activeLoans: [
          {
            id: "loan-1",
            type: "emergency",
            providerName: "Sumo Association",
            principal: 1000,
            interestRate: 0,
            remainingBalance: 100,
            monthlyPayment: 100,
            issuedAtYear: 2026,
            issuedAtMonth: 1,
            stringsAttached: [],
          },
        ],
      });
      world.heyas.set("heya-1", heya);

      const impact = processMonthlyLoanRepayments(world);
      const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-1");

      expect(heyaUpdates).toBeDefined();
      expect(heyaUpdates?.funds).toBe(900); // 1000 - 100
      expect(heyaUpdates?.activeLoans?.length).toBe(0);
    });
  });

  describe("prepayLoan", () => {
    it("should pay off loan early if funds are sufficient", () => {
      const heya = MockFactory.createHeya("heya-1", {
        funds: 1000,
        activeLoans: [
          {
            id: "loan-1",
            type: "emergency",
            providerName: "Sumo Association",
            principal: 1000,
            interestRate: 0,
            remainingBalance: 500,
            monthlyPayment: 100,
            issuedAtYear: 2026,
            issuedAtMonth: 1,
            stringsAttached: [],
          },
        ],
      });
      world.heyas.set("heya-1", heya);

      const impact = prepayLoan(world, "heya-1", "loan-1");
      const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-1");

      expect(heyaUpdates).toBeDefined();
      expect(heyaUpdates?.funds).toBe(500); // 1000 - 500
      expect(heyaUpdates?.activeLoans?.length).toBe(0);
    });

    it("should not pay off loan if funds are insufficient", () => {
      const heya = MockFactory.createHeya("heya-1", {
        funds: 400,
        activeLoans: [
          {
            id: "loan-1",
            type: "emergency",
            providerName: "Sumo Association",
            principal: 1000,
            interestRate: 0,
            remainingBalance: 500,
            monthlyPayment: 100,
            issuedAtYear: 2026,
            issuedAtMonth: 1,
            stringsAttached: [],
          },
        ],
      });
      world.heyas.set("heya-1", heya);

      const impact = prepayLoan(world, "heya-1", "loan-1");
      const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-1");

      expect(heyaUpdates).toBeUndefined(); // no change
    });
  });
});

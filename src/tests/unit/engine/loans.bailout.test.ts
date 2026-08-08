import { describe, it, expect, beforeEach } from "vitest";
import { issueBailoutLoanIfNeeded } from "@/engine/loans";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import { FACTION_BAILOUT_AMOUNT, LOAN_ISSUANCE_THRESHOLD } from "@/constants/engine/economic";

describe("issueBailoutLoanIfNeeded", () => {
  let world: WorldState;

  beforeEach(() => {
    world = MockFactory.createWorld();
    world.heyas = new Map();
  });

  it("should issue an emergency loan when funds are critically low and no existing loans", () => {
    const heya = MockFactory.createHeya("heya-1", {
      funds: -6_000_000,
      reputation: 50,
      scandalScore: 0,
      activeLoans: [],
    });
    world.heyas.set("heya-1", heya);

    const impact = issueBailoutLoanIfNeeded(world, "heya-1");
    const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-1");

    expect(heyaUpdates).toBeDefined();
    expect(heyaUpdates?.activeLoans?.length).toBe(1);
    expect(heyaUpdates?.activeLoans?.[0].type).toBe("emergency");
    // Deficit is 6m, principal is deficit + FACTION_BAILOUT_AMOUNT (10m) = 16m.
    // New funds should be original + principal = -6m + 16m = 10m.
    expect(heyaUpdates?.funds).toBe(FACTION_BAILOUT_AMOUNT);
    expect(heyaUpdates?.reputation).toBe(40); // 50 - 10
  });

  it("should not issue a new loan if a benefactor loan already exists", () => {
    const heya = MockFactory.createHeya("heya-1", {
      funds: -16_000_000, // Very low
      activeLoans: [
        {
          id: "loan-1",
          type: "benefactor",
          providerName: "Rich Sponsor",
          principal: 10_000_000,
          interestRate: 0.06,
          remainingBalance: 5_000_000,
          monthlyPayment: 100,
          issuedAtYear: 2026,
          issuedAtMonth: 1,
          stringsAttached: [],
        }
      ],
    });
    world.heyas.set("heya-1", heya);

    const impact = issueBailoutLoanIfNeeded(world, "heya-1");
    const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-1");
    expect(heyaUpdates).toBeUndefined(); // Returns early, no updates
  });

  it("should not issue a loan if funds are above the threshold", () => {
    const heya = MockFactory.createHeya("heya-2", {
      funds: LOAN_ISSUANCE_THRESHOLD + 100, // Above threshold
      activeLoans: [],
    });
    world.heyas.set("heya-2", heya);

    const impact = issueBailoutLoanIfNeeded(world, "heya-2");
    const heyaUpdates = impact.entities?.heyaUpdates?.get("heya-2");

    expect(heyaUpdates).toBeUndefined(); // Returns early
  });
});

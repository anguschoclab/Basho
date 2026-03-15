import { describe, it, expect } from "vitest";
import { generateWorld } from "../worldgen";
import { issueBailoutLoanIfNeeded, processMonthlyLoanRepayments } from "../loans";
import { executeMerger, findMergerTarget } from "../mergers";
import { checkNaturalizations } from "../naturalization";
import type { Rikishi } from "../types/rikishi";
import type { Heya } from "../types/heya";

describe("Dormant Hooks Integration Tests", () => {

  it("Loans System: should issue a bailout loan when funds drop below -5M and repay it monthly", () => {
    const world = generateWorld("loans-test-1");
    const heyaIds = Array.from(world.heyas.keys());
    expect(heyaIds.length).toBeGreaterThan(0);
    const targetHeya = world.heyas.get(heyaIds[0])!;

    // Force severe insolvency
    targetHeya.funds = -6_000_000;

    // Issue the loan
    issueBailoutLoanIfNeeded(world, targetHeya.id);

    // Verify funds increased and loan exists
    expect(targetHeya.activeLoans).toBeDefined();
    expect(targetHeya.activeLoans!.length).toBe(1);
    expect(targetHeya.funds).toBeGreaterThan(0);

    const activeLoan = targetHeya.activeLoans![0];
    const initialBalance = activeLoan.remainingBalance;
    const initialFunds = targetHeya.funds;

    // Process monthly repayment
    processMonthlyLoanRepayments(world);

    // Verify repayment occurred
    expect(targetHeya.activeLoans![0].remainingBalance).toBeLessThan(initialBalance);
    expect(targetHeya.funds).toBeLessThan(initialFunds);
  });

  it("Mergers System: should merge an insolvent stable into another and transfer rikishi", () => {
    const world = generateWorld("mergers-test-1");
    const heyaIds = Array.from(world.heyas.keys());
    expect(heyaIds.length).toBeGreaterThan(1);

    const sourceHeyaId = heyaIds[0];
    const sourceHeya = world.heyas.get(sourceHeyaId)!;
    const initialRikishiCount = sourceHeya.rikishiIds.length;

    // Find target
    const targetHeyaId = findMergerTarget(world, sourceHeyaId);
    expect(targetHeyaId).toBeDefined();
    expect(targetHeyaId).not.toBeNull();

    const targetHeya = world.heyas.get(targetHeyaId!)!;
    const targetInitialRikishiCount = targetHeya.rikishiIds.length;

    // Execute merger
    executeMerger(world, sourceHeyaId, targetHeyaId!, "Test Merger");

    // Verify source is removed
    expect(world.heyas.has(sourceHeyaId)).toBe(false);
    expect(world.closedHeyas?.has(sourceHeyaId)).toBe(true);

    // Verify rikishi transferred
    expect(targetHeya.rikishiIds.length).toBe(initialRikishiCount + targetInitialRikishiCount);

    for (const rId of world.closedHeyas!.get(sourceHeyaId)!.rikishiIds) {
        expect(world.rikishi.get(rId)!.heyaId).toBe(targetHeyaId);
    }
  });

  it("Naturalization System: should allow highly successful foreign rikishi to naturalize", () => {
    const world = generateWorld("nat-test-1");
    const rikishiList = Array.from(world.rikishi.values());
    const foreignRikishi = rikishiList.filter(r => r.nationality !== "Japan");
    expect(foreignRikishi.length).toBeGreaterThan(0);

    const targetRikishi = foreignRikishi[0];

    // Force eligibility
    targetRikishi.careerWins = 500;

    // Since there's a 5% deterministic chance based on year and ID,
    // we'll loop through up to 100 years and run the check until naturalized.
    let naturalized = false;
    for (let i = 0; i < 100; i++) {
        world.year = 2025 + i;
        checkNaturalizations(world);
        if (targetRikishi.nationality === "Japan") {
            naturalized = true;
            break;
        }
    }

    expect(naturalized).toBe(true);
    expect(targetRikishi.nationality).toBe("Japan");
  });

});

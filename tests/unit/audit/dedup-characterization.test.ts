/**
 * dedup-characterization.test.ts
 *
 * Characterization pins for workstream W S (dead-parallel removal).
 * These pins document the behaviour of the *canonical* implementation in each
 * duplicate pair so that the merge can be proven safe. Where both variants are
 * still present they also assert equivalence, which is what makes the deletion
 * of the parallel implementation a no-op.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder, type ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { HeyaUpdates } from "@/engine/tick/phases/monthly/types";
import { processLoanRepayments } from "@/engine/tick/phases/monthly/economics/loans";
import { getDisplayHeatBand } from "@/components/rivalries/rivalryUtils.pure";
import { toRivalryHeatBand } from "@/engine/narrative/descriptorBands";
import { SPONSOR_RECRUITMENT_COSTS } from "@/constants/engine/economic";
import { baseTenure } from "@/engine/legacy/tenure";
import { RANK_JA } from "@/components/hof/hofMeta";
import { RANK_NAMES } from "@/constants/engine/rankDisplay";
import { getFlagForNationality } from "@/presenters/projections/globalCupProjections";
import { kihakuLabel } from "@/presenters/rikishi/transformers/kihaku";

// --- D1: loan repayment — canonical impl is monthly/economics/loans.ts ---

describe("D1 loan repayment characterization", () => {
  let world: WorldState;
  let builder: ImpactBuilder;

  beforeEach(() => {
    world = MockFactory.createWorld();
    builder = createImpactBuilder("test");
  });

  const loan = (over: Record<string, unknown>) => ({
    id: "L1",
    type: "emergency" as const,
    providerName: "Bank A",
    principal: 1000,
    interestRate: 0.1,
    remainingBalance: 500,
    monthlyPayment: 100,
    issuedAtYear: 2026,
    issuedAtMonth: 1,
    ...over,
  });

  it("live impl: partial payment persists updated remainingBalance", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 1000 });
    heya.activeLoans = [loan({})];
    const heyaUpdates: HeyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(900);
    expect(heyaUpdates.activeLoans).toHaveLength(1);
    expect(heyaUpdates.activeLoans?.[0].remainingBalance).toBe(400);
  });

  it("live impl: full payoff removes loan and emits FINANCIAL_ALERT", () => {
    const heya = MockFactory.createHeya("h-1", { funds: 1000 });
    heya.activeLoans = [loan({ remainingBalance: 100 })];
    const heyaUpdates: HeyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(900);
    expect(heyaUpdates.activeLoans).toHaveLength(0);
    const events = builder.build().events ?? [];
    expect(events.some((e) => e.type === "FINANCIAL_ALERT" && e.data?.incident === "loan_paid_off")).toBe(true);
  });

  it("live impl: stale non-positive balance is dropped WITH paid_off event and credits funds", () => {
    // Documents the known divergence vs the dead impl: Math.min(payment,
    // negative balance) yields a negative totalPayment -> funds INCREASE, and
    // the loan is treated as paid off (event emitted). Pinning current truth.
    const heya = MockFactory.createHeya("h-1", { funds: 1000 });
    heya.activeLoans = [loan({ remainingBalance: -50 })];
    const heyaUpdates: HeyaUpdates = {};

    processLoanRepayments(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.funds).toBe(1050);
    expect(heyaUpdates.activeLoans).toHaveLength(0);
    const events = builder.build().events ?? [];
    expect(events.some((e) => e.type === "FINANCIAL_ALERT" && e.data?.incident === "loan_paid_off")).toBe(true);
  });

});

// --- D4: heat band — canonical is toRivalryHeatBand (descriptorBands) ---

describe("D4 rivalry heat band characterization", () => {
  it("canonical band edges", () => {
    const expected: Array<[number, string]> = [
      [0, "dormant"], [19, "dormant"], [20, "simmering"], [39, "simmering"],
      [40, "heated"], [64, "heated"], [65, "fierce"], [84, "fierce"],
      [85, "legendary"], [100, "legendary"],
    ];
    for (const [heat, band] of expected) {
      expect(toRivalryHeatBand(heat)).toBe(band);
    }
  });

  it("getDisplayHeatBand ≡ toRivalryHeatBand across 0..100 (no prev = pure lookup)", () => {
    for (let heat = 0; heat <= 100; heat += 1) {
      expect(getDisplayHeatBand(heat)).toBe(toRivalryHeatBand(heat));
    }
  });
});

// --- D5: sponsor recruitment costs ---

describe("D5 sponsor recruitment costs", () => {
  it("canonical map covers T0–T5 with expected values", () => {
    expect(SPONSOR_RECRUITMENT_COSTS).toEqual({
      T0: 50_000, T1: 150_000, T2: 400_000, T3: 800_000, T4: 1_500_000, T5: 4_000_000,
    });
  });
});

// --- D6: tenure zero-shape ---

describe("D6 baseTenure zero-shape", () => {
  it("baseTenure(0) carries all ten counters at zero", () => {
    expect(baseTenure(0)).toEqual({
      startedYear: 0,
      bashoServed: 0,
      championships: 0,
      sekitoriProduced: 0,
      sanyakuProduced: 0,
      ozekiProduced: 0,
      yokozunaProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
      boardSeatsWon: 0,
    });
  });

  it("baseTenure stamps the given year", () => {
    expect(baseTenure(2026).startedYear).toBe(2026);
  });
});

// --- D7: nationality flags ---

describe("D7 nationality flag map", () => {
  it("canonical flag for all thirteen nationalities plus fallback", () => {
    const expected: Record<string, string> = {
      Japan: "🇯🇵", Mongolia: "🇲🇳", Estonia: "🇪🇪", Georgia: "🇬🇪",
      Bulgaria: "🇧🇬", Brazil: "🇧🇷", USA: "🇺🇸", Russia: "🇷🇺",
      Ukraine: "🇺🇦", China: "🇨🇳", Korea: "🇰🇷", Hungary: "🇭🇺", Czech: "🇨🇿",
    };
    for (const [nat, flag] of Object.entries(expected)) {
      expect(getFlagForNationality(nat)).toBe(flag);
    }
    expect(getFlagForNationality("Atlantis")).toBe("🏳️");
  });
});

// --- D8: RANK_JA derives from the display registry ---

describe("D8 RANK_JA vs display registry", () => {
  it("every RANK_JA key matches RANK_NAMES[rank].ja", () => {
    for (const [rank, ja] of Object.entries(RANK_JA)) {
      expect(RANK_NAMES[rank as keyof typeof RANK_NAMES]?.ja).toBe(ja);
    }
  });
});

// --- D11: kihaku label ladder ---

describe("D11 kihaku label ladder", () => {
  it("canonical labels at band edges", () => {
    const expected: Array<[number, string]> = [
      [0, "Broken Spirit"], [34, "Broken Spirit"], [35, "Faltering Will"],
      [49, "Faltering Will"], [50, "Steady Resolve"], [64, "Steady Resolve"],
      [65, "Fierce Determination"], [79, "Fierce Determination"],
      [80, "Blazing Spirit"], [100, "Blazing Spirit"],
    ];
    for (const [score, label] of expected) {
      expect(kihakuLabel(score)).toBe(label);
    }
  });
});

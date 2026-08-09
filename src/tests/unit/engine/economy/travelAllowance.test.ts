import { describe, it, expect } from "vitest";
import {
  distributeKoenkaiToSekitori,
  payTravelAllowance,
  deductTsukebitoCosts,
} from "@/engine/systems/economy/TravelAllowanceService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import {
  KOENKAI_INCOME_SPLIT,
  TRAVEL_ALLOWANCE_YEARLY,
  TSUKEBITO_COSTS_MONTHLY,
} from "@/constants/engine/economic";
import {
  KOENKAI_INCOME_MODERATE,
  MONTHLY_DIVISOR,
  TRAVEL_ALLOWANCE_CASH_SPLIT,
  TRAVEL_ALLOWANCE_RETIREMENT_SPLIT,
} from "@/constants/engine/economyExtended";

describe("distributeKoenkaiToSekitori", () => {
  it("distributes koenkai evenly among sekitori in a heya", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", division: "makuuchi" });
    const r2 = mockRikishi("r2", { heyaId: "h1", division: "makuuchi" });
    const r3 = mockRikishi("r3", { heyaId: "h1", division: "juryo" });
    const r4 = mockRikishi("r4", { heyaId: "h1", division: "makushita" });
    const r5 = mockRikishi("r5", { heyaId: "h1", division: "makushita" });

    const heya = makeMockHeya("h1", {
      koenkaiBand: "moderate",
      rikishiIds: ["r1", "r2", "r3", "r4", "r5"],
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
        ["r4", r4],
        ["r5", r5],
      ]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = distributeKoenkaiToSekitori(world);
    const updated = resolveImpacts(world, [impact]);

    const expectedPerSekitori =
      (KOENKAI_INCOME_MODERATE * KOENKAI_INCOME_SPLIT.sekitoriPortion) / 3;

    for (const id of ["r1", "r2", "r3"]) {
      const r = updated.rikishi.get(id)!;
      const cashGain = r.economics?.cash ?? 0;
      expect(cashGain).toBeCloseTo(expectedPerSekitori, 0);
    }

    for (const id of ["r4", "r5"]) {
      const r = updated.rikishi.get(id)!;
      expect(r.economics?.cash ?? 0).toBe(0);
    }
  });

  it("skips heyas with no sekitori", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", division: "makushita" });
    const heya = makeMockHeya("h1", {
      koenkaiBand: "moderate",
      rikishiIds: ["r1"],
    });

    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = distributeKoenkaiToSekitori(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics?.cash ?? 0).toBe(0);
  });

  it("skips heyas with zero koenkai income (none band)", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", division: "makuuchi" });
    const heya = makeMockHeya("h1", {
      koenkaiBand: "none",
      rikishiIds: ["r1"],
    });

    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = distributeKoenkaiToSekitori(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics?.cash ?? 0).toBe(0);
  });

  it("handles undefined rikishiIds gracefully", () => {
    const heya = makeMockHeya("h1", {
      koenkaiBand: "moderate",
      rikishiIds: undefined as any,
    });

    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
    });

    expect(() => {
      const impact = distributeKoenkaiToSekitori(world);
      resolveImpacts(world, [impact]);
    }).not.toThrow();
  });
});

// ── payTravelAllowance ─────────────────────────────────────────────────────

describe("payTravelAllowance", () => {
  it("pays yokozuna the correct monthly allowance with 70/30 split", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "yokozuna",
      economics: { cash: 0, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = payTravelAllowance(world);
    const updated = resolveImpacts(world, [impact]);

    const yearly = TRAVEL_ALLOWANCE_YEARLY.yokozuna;
    const monthly = yearly / MONTHLY_DIVISOR;
    const econ = updated.rikishi.get("r1")!.economics!;
    expect(econ.cash).toBeCloseTo(monthly * TRAVEL_ALLOWANCE_CASH_SPLIT, 0);
    expect(econ.retirementFund).toBeCloseTo(monthly * TRAVEL_ALLOWANCE_RETIREMENT_SPLIT, 0);
    expect(econ.totalEarnings).toBeCloseTo(monthly, 0);
  });

  it("pays juryo the correct monthly allowance", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "juryo",
      rank: "juryo",
      economics: { cash: 0, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = payTravelAllowance(world);
    const updated = resolveImpacts(world, [impact]);

    const monthly = TRAVEL_ALLOWANCE_YEARLY.juryo / MONTHLY_DIVISOR;
    expect(updated.rikishi.get("r1")!.economics!.cash).toBeCloseTo(
      monthly * TRAVEL_ALLOWANCE_CASH_SPLIT,
      0
    );
  });

  it("skips non-sekitori (makushita and below)", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makushita",
      rank: "makushita",
      economics: { cash: 0, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = payTravelAllowance(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics?.cash ?? 0).toBe(0);
  });

  it("handles unknown rank gracefully (allowance = 0)", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "invalid_rank" as any,
      economics: { cash: 0, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = payTravelAllowance(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics?.cash ?? 0).toBe(0);
  });

  it("initializes economics if missing", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "maegashira",
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    expect(() => {
      const impact = payTravelAllowance(world);
      resolveImpacts(world, [impact]);
    }).not.toThrow();
  });
});

// ── deductTsukebitoCosts ───────────────────────────────────────────────────

describe("deductTsukebitoCosts", () => {
  it("deducts correct tsukebito cost from yokozuna cash", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "yokozuna",
      economics: { cash: 1_000_000, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = deductTsukebitoCosts(world);
    const updated = resolveImpacts(world, [impact]);

    const expectedCash = 1_000_000 - TSUKEBITO_COSTS_MONTHLY.yokozuna;
    expect(updated.rikishi.get("r1")!.economics!.cash).toBe(expectedCash);
  });

  it("deducts correct tsukebito cost from juryo cash", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "juryo",
      rank: "juryo",
      economics: { cash: 500_000, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = deductTsukebitoCosts(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics!.cash).toBe(
      500_000 - TSUKEBITO_COSTS_MONTHLY.juryo
    );
  });

  it("skips non-sekitori", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makushita",
      rank: "makushita",
      economics: { cash: 500_000, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = deductTsukebitoCosts(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics!.cash).toBe(500_000);
  });

  it("floors cash at 0 when cost exceeds balance", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "yokozuna",
      economics: { cash: 100_000, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = deductTsukebitoCosts(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics!.cash).toBe(0);
  });

  it("handles unknown rank gracefully (cost = 0)", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "invalid_rank" as any,
      economics: { cash: 500_000, retirementFund: 0, totalEarnings: 0, popularity: 50 } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = deductTsukebitoCosts(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics!.cash).toBe(500_000);
  });
});

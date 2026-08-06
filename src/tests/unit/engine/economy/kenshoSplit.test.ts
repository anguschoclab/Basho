import { describe, it, expect } from "vitest";
import { onBoutResolvedEconomics } from "@/engine/economics";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { KENSHO_SPLIT, KENSHO_AMOUNT_PER_ENVELOPE } from "@/constants/engine/economic";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

 

function makeBoutContext(winner: Rikishi, loser: Rikishi, kenshoEnvelopes: number) {
  const match: MatchSchedule = {
    rikishiIdEast: winner.id,
    rikishiIdWest: loser.id,
    division: "makuuchi",
    day: 1,
  } as any;
  const result: BoutResult = {
    winner: "east",
    kenshoEnvelopes,
  } as any;
  return {
    match,
    result,
    east: winner,
    west: loser,
  };
}

// Helper to call onBoutResolvedEconomics with a bout context
function resolveKensho(
  world: WorldState,
  winner: Rikishi,
  loser: Rikishi,
  kenshoEnvelopes: number
) {
  return onBoutResolvedEconomics(world, makeBoutContext(winner, loser, kenshoEnvelopes));
}

describe("Kensho split — real JSA model", () => {
  it("winner gets ¥30K cash per envelope", () => {
    const winner = mockRikishi("w1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-1",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const loser = mockRikishi("l1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-2",
    });
    const heya = makeMockHeya("heya-1", { funds: 10_000_000, rikishiIds: ["w1"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["l1", loser],
      ]),
      heyas: new Map([["heya-1", heya]]),
    });

    const impact = resolveKensho(world, winner, loser, 1);
    const resolved = resolveImpacts(world, [impact]);
    const updatedWinner = resolved.rikishi.get("w1");
    expect(updatedWinner?.economics?.cash).toBe(KENSHO_SPLIT.cash);
  });

  it("winner gets ¥30K retirement per envelope", () => {
    const winner = mockRikishi("w1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-1",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const loser = mockRikishi("l1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-2",
    });
    const heya = makeMockHeya("heya-1", { funds: 10_000_000, rikishiIds: ["w1"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["l1", loser],
      ]),
      heyas: new Map([["heya-1", heya]]),
    });

    const impact = resolveKensho(world, winner, loser, 1);
    const resolved = resolveImpacts(world, [impact]);
    const updatedWinner = resolved.rikishi.get("w1");
    expect(updatedWinner?.economics?.retirementFund).toBe(KENSHO_SPLIT.retirement);
  });

  it("heya gets ¥0 from kensho", () => {
    const winner = mockRikishi("w1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-1",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const loser = mockRikishi("l1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-2",
    });
    const initialFunds = 10_000_000;
    const heya = makeMockHeya("heya-1", { funds: initialFunds, rikishiIds: ["w1"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["l1", loser],
      ]),
      heyas: new Map([["heya-1", heya]]),
    });

    const impact = resolveKensho(world, winner, loser, 3);
    const resolved = resolveImpacts(world, [impact]);
    const updatedHeya = resolved.heyas.get("heya-1");
    expect(updatedHeya?.funds).toBe(initialFunds);
  });

  it("JSA fee is ¥10K per envelope (not credited to anyone)", () => {
    expect(KENSHO_SPLIT.jsaFee).toBe(10_000);
    expect(KENSHO_SPLIT.cash + KENSHO_SPLIT.retirement + KENSHO_SPLIT.jsaFee).toBe(
      KENSHO_AMOUNT_PER_ENVELOPE
    );
  });

  it("2 envelopes → ¥60K cash + ¥60K retirement + ¥20K JSA fee", () => {
    const winner = mockRikishi("w1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-1",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const loser = mockRikishi("l1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-2",
    });
    const heya = makeMockHeya("heya-1", { funds: 10_000_000, rikishiIds: ["w1"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["l1", loser],
      ]),
      heyas: new Map([["heya-1", heya]]),
    });

    const impact = resolveKensho(world, winner, loser, 2);
    const resolved = resolveImpacts(world, [impact]);
    const updatedWinner = resolved.rikishi.get("w1");
    expect(updatedWinner?.economics?.cash).toBe(60_000);
    expect(updatedWinner?.economics?.retirementFund).toBe(60_000);
  });

  it("0 envelopes → no economic update", () => {
    const winner = mockRikishi("w1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-1",
      economics: {
        cash: 100_000,
        retirementFund: 50_000,
        careerKenshoWon: 5,
        kinboshiCount: 0,
        totalEarnings: 200_000,
        currentBashoEarnings: 10_000,
        popularity: 50,
      } as any,
    });
    const loser = mockRikishi("l1", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "heya-2",
    });
    const heya = makeMockHeya("heya-1", { funds: 10_000_000, rikishiIds: ["w1"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["l1", loser],
      ]),
      heyas: new Map([["heya-1", heya]]),
    });

    const impact = resolveKensho(world, winner, loser, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updatedWinner = resolved.rikishi.get("w1");
    expect(updatedWinner?.economics?.cash).toBe(100_000);
    expect(updatedWinner?.economics?.retirementFund).toBe(50_000);
  });

  it("non-makuuchi bout → no kensho", () => {
    const winner = mockRikishi("w1", {
      rank: "juryo",
      division: "juryo",
      heyaId: "heya-1",
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const loser = mockRikishi("l1", {
      rank: "juryo",
      division: "juryo",
      heyaId: "heya-2",
    });
    const heya = makeMockHeya("heya-1", { funds: 10_000_000, rikishiIds: ["w1"] });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["l1", loser],
      ]),
      heyas: new Map([["heya-1", heya]]),
    });

    const impact = resolveKensho(world, winner, loser, 5);
    const resolved = resolveImpacts(world, [impact]);
    const updatedWinner = resolved.rikishi.get("w1");
    expect(updatedWinner?.economics?.cash).toBe(0);
  });
});

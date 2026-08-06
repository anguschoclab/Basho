import { describe, it, expect } from "vitest";
import { payBashoTeate } from "@/engine/lifecycle/PrizeDistribution";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { NON_SEKITORI_BASHO_ALLOWANCE } from "@/constants/engine/economic";
import { makeMockWorld, mockRikishi } from "../utils";

 

describe("payBashoTeate — centralized allowances", () => {
  it("makushita receives ¥165K", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
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
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(
      NON_SEKITORI_BASHO_ALLOWANCE.makushita
    );
  });

  it("sandanme receives ¥110K", () => {
    const r = mockRikishi("r1", {
      rank: "sandanme",
      division: "sandanme",
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
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(NON_SEKITORI_BASHO_ALLOWANCE.sandanme);
  });

  it("jonidan receives ¥88K", () => {
    const r = mockRikishi("r1", {
      rank: "jonidan",
      division: "jonidan",
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
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(NON_SEKITORI_BASHO_ALLOWANCE.jonidan);
  });

  it("jonokuchi receives ¥77K", () => {
    const r = mockRikishi("r1", {
      rank: "jonokuchi",
      division: "jonokuchi",
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
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(
      NON_SEKITORI_BASHO_ALLOWANCE.jonokuchi
    );
  });

  it("sekitori (makuuchi/juryo) receives ¥0", () => {
    const makuuchi = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
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
    const juryo = mockRikishi("r2", {
      rank: "juryo",
      division: "juryo",
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
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", makuuchi],
        ["r2", juryo],
      ]),
    });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(0);
    expect(resolved.rikishi.get("r2")?.economics?.cash).toBe(0);
  });

  it("total earnings increase matches teate", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      economics: {
        cash: 50_000,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 200_000,
        currentBashoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(
      200_000 + NON_SEKITORI_BASHO_ALLOWANCE.makushita
    );
  });
});

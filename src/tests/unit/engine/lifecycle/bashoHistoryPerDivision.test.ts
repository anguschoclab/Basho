import { describe, it, expect } from "vitest";
import { recordBashoHistory } from "@/engine/lifecycle/BashoHistory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { SIMULATION_CONFIG } from "@/engine/core/SimulationConfig";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";

function makeEconomics() {
  return {
    cash: 0,
    retirementFund: 0,
    careerKenshoWon: 0,
    kinboshiCount: 0,
    totalEarnings: 0,
    currentBashoEarnings: 0,
    popularity: 50,
  } as any;
}

describe("recordBashoHistory — per-division yusho prizes", () => {
  it("makuuchi yusho winner gets ¥20M (50% cash, 50% retirement)", () => {
    const r = mockRikishi("r1", {
      rank: "yokozuna",
      division: "makuuchi",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(
      world,
      basho,
      "r1" as any,
      [],
      [],
      { shukunsho: undefined, kantosho: undefined, ginoSho: undefined } as any,
      14
    );
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    const expectedPrize = SIMULATION_CONFIG.prizes.yushoByDivision.makuuchi;
    expect(updated?.economics?.cash).toBe(expectedPrize * 0.5);
    expect(updated?.economics?.retirementFund).toBe(expectedPrize * 0.5);
    expect(updated?.economics?.totalEarnings).toBe(expectedPrize);
  });

  it("juryo yusho winner gets ¥3M", () => {
    const r = mockRikishi("r1", {
      rank: "juryo",
      division: "juryo",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(
      world,
      basho,
      "r1" as any,
      [],
      [],
      { shukunsho: undefined, kantosho: undefined, ginoSho: undefined } as any,
      13
    );
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    const expectedPrize = SIMULATION_CONFIG.prizes.yushoByDivision.juryo;
    expect(updated?.economics?.cash).toBe(expectedPrize * 0.5);
    expect(updated?.economics?.retirementFund).toBe(expectedPrize * 0.5);
    expect(updated?.economics?.totalEarnings).toBe(expectedPrize);
  });

  it("makushita yusho winner gets ¥700K", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(
      world,
      basho,
      "r1" as any,
      [],
      [],
      { shukunsho: undefined, kantosho: undefined, ginoSho: undefined } as any,
      7
    );
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    const expectedPrize = SIMULATION_CONFIG.prizes.yushoByDivision.makushita;
    expect(updated?.economics?.cash).toBe(expectedPrize * 0.5);
    expect(updated?.economics?.retirementFund).toBe(expectedPrize * 0.5);
    expect(updated?.economics?.totalEarnings).toBe(expectedPrize);
  });

  it("BashoResult.prizes.yushoAmount records actual per-division amount", () => {
    const r = mockRikishi("r1", {
      rank: "juryo",
      division: "juryo",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(
      world,
      basho,
      "r1" as any,
      [],
      [],
      { shukunsho: undefined, kantosho: undefined, ginoSho: undefined } as any,
      13
    );
    const resolved = resolveImpacts(world, [impact]);
    const history = resolved.history || [];
    const lastEntry = history[history.length - 1];
    expect(lastEntry?.prizes?.yushoAmount).toBe(SIMULATION_CONFIG.prizes.yushoByDivision.juryo);
  });

  it("falls back to flat yusho value for unknown division", () => {
    const r = mockRikishi("r1", {
      rank: "maegashira",
      division: undefined as any,
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(
      world,
      basho,
      "r1" as any,
      [],
      [],
      { shukunsho: undefined, kantosho: undefined, ginoSho: undefined } as any,
      14
    );
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(SIMULATION_CONFIG.prizes.yusho);
  });
});

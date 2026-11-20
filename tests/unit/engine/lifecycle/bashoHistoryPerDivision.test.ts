import { describe, it, expect } from "vitest";
import { recordBashoHistory } from "@/engine/lifecycle/BashoHistory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockBasho, mockRikishi } from "@tests/unit/engine/utils";

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

const NO_PRIZES = { shukunsho: undefined, kantosho: undefined, ginoSho: undefined } as any;

describe("recordBashoHistory — per-division yusho prizes (real JSA values)", () => {
  it("makuuchi yusho winner gets ¥10M (50% cash, 50% retirement)", () => {
    const r = mockRikishi("r1", {
      rank: "yokozuna",
      division: "makuuchi",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(world, basho, "r1" as any, [], [], NO_PRIZES, 14);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.cash).toBe(5_000_000);
    expect(updated?.economics?.retirementFund).toBe(5_000_000);
    expect(updated?.economics?.totalEarnings).toBe(10_000_000);
  });

  it("juryo yusho winner gets ¥2M", () => {
    const r = mockRikishi("r1", {
      rank: "juryo",
      division: "juryo",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(world, basho, "r1" as any, [], [], NO_PRIZES, 13);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.cash).toBe(1_000_000);
    expect(updated?.economics?.retirementFund).toBe(1_000_000);
    expect(updated?.economics?.totalEarnings).toBe(2_000_000);
  });

  it("makushita yusho winner gets ¥500K", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(world, basho, "r1" as any, [], [], NO_PRIZES, 7);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.cash).toBe(250_000);
    expect(updated?.economics?.retirementFund).toBe(250_000);
    expect(updated?.economics?.totalEarnings).toBe(500_000);
  });

  it("BashoResult.prizes.yushoAmount records actual per-division amount", () => {
    const r = mockRikishi("r1", {
      rank: "juryo",
      division: "juryo",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(world, basho, "r1" as any, [], [], NO_PRIZES, 13);
    const resolved = resolveImpacts(world, [impact]);
    const history = resolved.history || [];
    const lastEntry = history[history.length - 1];
    expect(lastEntry?.prizes?.yushoAmount).toBe(2_000_000);
  });

  it("falls back to flat yusho value for unknown division", () => {
    const r = mockRikishi("r1", {
      rank: "maegashira",
      division: undefined as any,
      economics: makeEconomics(),
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const basho = makeMockBasho();

    const impact = recordBashoHistory(world, basho, "r1" as any, [], [], NO_PRIZES, 14);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(10_000_000);
  });
});

describe("recordBashoHistory — jun-yusho is a label only (JSA: no prize, no points)", () => {
  function setup() {
    const winner = mockRikishi("w1", {
      rank: "yokozuna",
      division: "makuuchi",
      economics: makeEconomics(),
    });
    const runner = mockRikishi("r2", {
      rank: "ozeki",
      division: "makuuchi",
      economics: makeEconomics(),
    });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w1", winner],
        ["r2", runner],
      ]),
    });
    const impact = recordBashoHistory(
      world,
      makeMockBasho(),
      "w1" as any,
      ["w1", "r2"] as any,
      [],
      NO_PRIZES,
      14
    );
    return resolveImpacts(world, [impact]);
  }

  it("jun-yusho rikishi receive no cash, retirement credit, or earnings", () => {
    const resolved = setup();
    const updated = resolved.rikishi.get("r2");
    expect(updated?.economics?.cash).toBe(0);
    expect(updated?.economics?.retirementFund).toBe(0);
    expect(updated?.economics?.totalEarnings).toBe(0);
  });

  it("the jun-yusho label is still recorded in history and the award log", () => {
    const resolved = setup();
    const lastEntry = (resolved.history || [])[((resolved.history || []).length - 1) as number];
    expect(lastEntry?.junYusho).toEqual(["r2"]);
    const awardLog = resolved.awardLog || [];
    expect(awardLog.some((e) => e.type === "junYusho" && e.winnerId === "r2")).toBe(true);
  });

  it("result.prizes records no jun-yusho amount", () => {
    const resolved = setup();
    const lastEntry = (resolved.history || [])[((resolved.history || []).length - 1) as number];
    expect(
      (lastEntry?.prizes as Record<string, unknown> | undefined)?.junYushoAmount
    ).toBeUndefined();
  });
});

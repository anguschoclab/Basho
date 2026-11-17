import { describe, it, expect } from "vitest";
import {
  accumulateMochikyukinPoints,
  payMochikyukinBonuses,
} from "@/engine/economy/MochikyukinService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";

function makeSekitori(id: string, overrides: Partial<any> = {}) {
  return mockRikishi(id, {
    rank: "maegashira",
    division: "makuuchi",
    stats: {
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        mochikyukinPoints: 0,
      },
    } as any,
    ...overrides,
  });
}

describe("accumulateMochikyukinPoints — net-wins model (JSA: 0.5 × wins−losses)", () => {
  function accrue(
    world: ReturnType<typeof makeMockWorld>,
    id: string,
    results: {
      netWins: number;
      isYusho?: boolean;
      isJunYusho?: boolean;
      isZenshoYusho?: boolean;
      kinboshiEarned?: number;
    }
  ) {
    const impact = accumulateMochikyukinPoints(world, id, {
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
      ...results,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    return resolved.rikishi.get(id)?.stats?.achievements?.mochikyukinPoints;
  }

  it("8-7 record (netWins=1) → +0.5 points", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 1 })).toBe(0.5);
  });

  it("9-6 record (netWins=3) → +1.5 points", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 3 })).toBe(1.5);
  });

  it("10-5 record (netWins=5) → +2.5 points", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 5 })).toBe(2.5);
  });

  it("7-8 record (netWins=-1) → +0 points (negative clamped)", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: -1 })).toBe(0);
  });

  it("0-15 record (netWins=-15) → +0 points", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: -15 })).toBe(0);
  });

  it("yusho adds 30 points on top of net-win stars", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 5, isYusho: true })).toBe(32.5);
  });

  it("jun-yusho adds no points (JSA: runner-up is a label only)", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 3, isJunYusho: true })).toBe(1.5);
  });

  it("kinboshi adds 10 points each", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 2, kinboshiEarned: 3 })).toBe(31);
  });

  it("zensho-yusho (15-0) earns 50 points total — it replaces the yusho 30, not adds to it", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", makeSekitori("r1")]]) });
    expect(accrue(world, "r1", { netWins: 15, isYusho: true, isZenshoYusho: true })).toBe(57.5);
  });

  it("non-sekitori gets 0 points", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 0,
        },
      } as any,
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 5,
      isYusho: true,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(0);
  });
});

describe("payMochikyukinBonuses — rank floor", () => {
  it("yokozuna with 50 points pays at floor 150 → ¥600K", () => {
    const r = makeSekishi("r1", {
      rank: "yokozuna",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 50,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    const expectedPayout = 150 * 4_000; // yokozuna floor 150 pts × ¥4,000
    expect(updated?.economics?.cash).toBe(expectedPayout / 2);
    expect(updated?.economics?.retirementFund).toBe(expectedPayout / 2);
  });

  it("ozeki with 80 points pays at floor 100 → ¥400K", () => {
    const r = makeSekishi("r1", {
      rank: "ozeki",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 80,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    const expectedPayout = 100 * 4_000; // ozeki floor 100 pts × ¥4,000
    expect(updated?.economics?.totalEarnings).toBe(expectedPayout);
  });

  it("maegashira with 100 points pays at actual (above floor 60) → ¥400K", () => {
    const r = makeSekishi("r1", {
      rank: "maegashira",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 100,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(400_000); // 100 pts × ¥4,000
  });

  it("juryo with 30 points pays at floor 40 → ¥160K", () => {
    const r = makeSekishi("r1", {
      rank: "juryo",
      division: "juryo",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 30,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(160_000); // juryo floor 40 pts × ¥4,000
  });

  it("payout splits 50/50 cash/retirement", () => {
    const r = makeSekishi("r1", {
      rank: "maegashira",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 100,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.cash).toBe(updated?.economics?.retirementFund);
  });

  it("non-sekitori gets no payout", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 200,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.cash).toBe(0);
  });

  it("odd month → no payout", () => {
    const r = makeSekishi("r1", {
      rank: "maegashira",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 100,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 1);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.cash).toBe(0);
  });
});

// Helper alias to avoid typos
function makeSekishi(id: string, overrides: Partial<any> = {}) {
  return makeSekitori(id, overrides);
}

describe("accumulateMochikyukinPoints — cumulative accumulation", () => {
  it("points add to existing total across multiple basho", () => {
    const r = makeSekitori("r1", {
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 10,
        },
      } as any,
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });

    // First basho: +2.5 points (netWins 5 × 0.5)
    const impact1 = accumulateMochikyukinPoints(world, "r1", {
      netWins: 5,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved1 = resolveImpacts(world, [impact1]);
    const points1 = resolved1.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points1).toBe(12.5);

    // Second basho: +1.5 points (netWins 3 × 0.5) on top of updated total
    const impact2 = accumulateMochikyukinPoints(resolved1, "r1", {
      netWins: 3,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved2 = resolveImpacts(resolved1, [impact2]);
    const points2 = resolved2.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points2).toBe(14);
  });
});

describe("payMochikyukinBonuses — sanyaku rank floors (JSA makuuchi floor: 60)", () => {
  it("sekiwake with 50 points pays at floor 60", () => {
    const r = makeSekitori("r1", {
      rank: "sekiwake",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 50,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(240_000); // sekiwake floor 60 pts × ¥4,000
  });

  it("komusubi with 50 points pays at floor 60", () => {
    const r = makeSekitori("r1", {
      rank: "komusubi",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 50,
        },
      } as any,
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
    const impact = payMochikyukinBonuses(world, 0);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.totalEarnings).toBe(240_000); // komusubi floor 60 pts × ¥4,000
  });

  it("sets mochikyukinLastPayoutMonth after payout", () => {
    const r = makeSekitori("r1", {
      rank: "maegashira",
      stats: {
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 100,
        },
      } as any,
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashhoEarnings: 0,
        popularity: 50,
      } as any,
    });
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = payMochikyukinBonuses(world, 4);
    const resolved = resolveImpacts(world, [impact]);
    const updated = resolved.rikishi.get("r1");
    expect(updated?.economics?.mochikyukinLastPayoutMonth).toBe(4);
  });
});

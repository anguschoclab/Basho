import { describe, it, expect } from "vitest";
import {
  accumulateMochikyukinPoints,
  payMochikyukinBonuses,
} from "@/engine/systems/economy/MochikyukinService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  MOCHIKYUKIN_POINT_VALUE,
  MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN,
  MOCHIKYUKIN_POINTS_YUSHO,
  MOCHIKYUKIN_POINTS_KINBOSHI,
  MOCHIKYUKIN_POINTS_JUN_YUSHO,
  MOCHIKYUKIN_POINTS_ZENSHO_YUSHO,
  MOCHIKYUKIN_RANK_FLOORS,
} from "@/constants/engine/economic";
import { makeMockWorld, mockRikishi } from "../utils";

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

describe("accumulateMochikyukinPoints — per-kachi-nokori model", () => {
  it("8-7 record (kachiNokori=0) → +0 points", () => {
    const r = makeSekitori("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 1,
      kachiNokori: 0,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(0);
  });

  it("10-5 record (kachiNokori=2) → +1.0 points", () => {
    const r = makeSekitori("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 5,
      kachiNokori: 2,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(2 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN);
  });

  it("7-8 record (kachiNokori=0) → +0 points (negative clamped)", () => {
    const r = makeSekitori("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: -1,
      kachiNokori: 0,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(0);
  });

  it("yusho adds 30 points", () => {
    const r = makeSekishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 5,
      kachiNokori: 2,
      isYusho: true,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(2 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN + MOCHIKYUKIN_POINTS_YUSHO);
  });

  it("jun-yusho adds 5 points", () => {
    const r = makeSekishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 3,
      kachiNokori: 1,
      isYusho: false,
      isJunYusho: true,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(
      1 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN + MOCHIKYUKIN_POINTS_JUN_YUSHO
    );
  });

  it("kinboshi adds 10 points each", () => {
    const r = makeSekishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 2,
      kachiNokori: 1,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 3,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(
      1 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN + 3 * MOCHIKYUKIN_POINTS_KINBOSHI
    );
  });

  it("zensho-yusho (15-0) adds 50 points", () => {
    const r = makeSekishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r]]) });
    const impact = accumulateMochikyukinPoints(world, "r1", {
      netWins: 15,
      kachiNokori: 7,
      isYusho: true,
      isJunYusho: false,
      isZenshoYusho: true,
      kinboshiEarned: 0,
    } as any);
    const resolved = resolveImpacts(world, [impact]);
    const points = resolved.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points).toBe(
      7 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN +
        MOCHIKYUKIN_POINTS_YUSHO +
        MOCHIKYUKIN_POINTS_ZENSHO_YUSHO
    );
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
      kachiNokori: 5,
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
    const expectedPayout = Math.max(50, MOCHIKYUKIN_RANK_FLOORS.yokozuna) * MOCHIKYUKIN_POINT_VALUE;
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
    const expectedPayout = Math.max(80, MOCHIKYUKIN_RANK_FLOORS.ozeki) * MOCHIKYUKIN_POINT_VALUE;
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
    const expectedPayout = 100 * MOCHIKYUKIN_POINT_VALUE;
    expect(updated?.economics?.totalEarnings).toBe(expectedPayout);
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
    const expectedPayout = Math.max(30, MOCHIKYUKIN_RANK_FLOORS.juryo) * MOCHIKYUKIN_POINT_VALUE;
    expect(updated?.economics?.totalEarnings).toBe(expectedPayout);
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

    // First basho: +1.0 points (2 kachi-nokori)
    const impact1 = accumulateMochikyukinPoints(world, "r1", {
      netWins: 5,
      kachiNokori: 2,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved1 = resolveImpacts(world, [impact1]);
    const points1 = resolved1.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points1).toBe(10 + 2 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN);

    // Second basho: +0.5 points (1 kachi-nokori) on top of updated total
    const impact2 = accumulateMochikyukinPoints(resolved1, "r1", {
      netWins: 3,
      kachiNokori: 1,
      isYusho: false,
      isJunYusho: false,
      isZenshoYusho: false,
      kinboshiEarned: 0,
    } as any);
    const resolved2 = resolveImpacts(resolved1, [impact2]);
    const points2 = resolved2.rikishi.get("r1")?.stats?.achievements?.mochikyukinPoints;
    expect(points2).toBe(
      10 +
        2 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN +
        1 * MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN
    );
  });
});

describe("payMochikyukinBonuses — sanyaku rank floors", () => {
  it("sekiwake with 50 points pays at floor 80", () => {
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
    const expectedPayout = Math.max(50, MOCHIKYUKIN_RANK_FLOORS.sekiwake) * MOCHIKYUKIN_POINT_VALUE;
    expect(updated?.economics?.totalEarnings).toBe(expectedPayout);
  });

  it("komusubi with 50 points pays at floor 70", () => {
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
    const expectedPayout = Math.max(50, MOCHIKYUKIN_RANK_FLOORS.komusubi) * MOCHIKYUKIN_POINT_VALUE;
    expect(updated?.economics?.totalEarnings).toBe(expectedPayout);
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

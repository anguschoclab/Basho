import { describe, it, expect } from "vitest";
import {
  JSA_REVISION_YEAR,
  jsaSekitoriSalary,
  jsaYushoPrize,
  jsaSanshoPrize,
  jsaBashoTeate,
  jsaWinBonus,
  jsaKachikoshiBonus,
  jsaSanyakuBashoAllowance,
  jsaJungyoStipendMultiplier,
} from "@/constants/engine/jsaEra";
import { payBashoTeate, paySanyakuBashoAllowance } from "@/engine/lifecycle/PrizeDistribution";
import { announceJsaBulletins } from "@/engine/media/MediaEventService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { RikishiEconomics } from "@/engine/types/economy";

/**
 * Era-keyed JSA economics. The game starts 2026-01-01; the JSA's
 * 2026-07-30 board revision applies from Hatsu 2027 — so world.year <= 2026
 * uses the legacy schedule and world.year >= 2027 uses the revised one.
 * Sources: Hochi/Nikkansports 2026-07-30, JSA official site, ShuPre 2026-11.
 */

const econ = (cash = 0): RikishiEconomics =>
  ({
    cash,
    retirementFund: 0,
    careerKenshoWon: 0,
    kinboshiCount: 0,
    totalEarnings: cash,
    currentBashoEarnings: 0,
    popularity: 50,
  }) as RikishiEconomics;

describe("jsaSekitoriSalary — monthly salary by era", () => {
  const cases: Array<[string, number, number]> = [
    // rank, 2026 salary, 2027+ salary — real JSA figures
    ["yokozuna", 3_000_000, 3_300_000],
    ["ozeki", 2_500_000, 2_750_000],
    ["sekiwake", 1_800_000, 2_000_000],
    ["komusubi", 1_800_000, 2_000_000],
    ["maegashira", 1_400_000, 1_550_000],
    ["juryo", 1_100_000, 1_200_000],
  ];
  for (const [rank, y2026, y2027] of cases) {
    it(`${rank}: ¥${y2026} in 2026, ¥${y2027} from 2027`, () => {
      expect(jsaSekitoriSalary(rank as any, 2026)).toBe(y2026);
      expect(jsaSekitoriSalary(rank as any, JSA_REVISION_YEAR)).toBe(y2027);
      expect(jsaSekitoriSalary(rank as any, 2031)).toBe(y2027);
    });
  }
  it("non-sekitori ranks are unpaid in both eras", () => {
    for (const rank of ["makushita", "sandanme", "jonidan", "jonokuchi"] as const) {
      expect(jsaSekitoriSalary(rank, 2026)).toBe(0);
      expect(jsaSekitoriSalary(rank, 2027)).toBe(0);
    }
  });
});

describe("jsaYushoPrize — divisional yusho prize by era", () => {
  const cases: Array<[string, number, number]> = [
    ["makuuchi", 10_000_000, 20_000_000],
    ["juryo", 2_000_000, 3_000_000],
    ["makushita", 500_000, 700_000],
    ["sandanme", 300_000, 500_000],
    ["jonidan", 200_000, 300_000],
    ["jonokuchi", 100_000, 200_000],
  ];
  for (const [division, y2026, y2027] of cases) {
    it(`${division}: ¥${y2026} in 2026, ¥${y2027} from 2027`, () => {
      expect(jsaYushoPrize(division as any, 2026)).toBe(y2026);
      expect(jsaYushoPrize(division as any, 2027)).toBe(y2027);
    });
  }
});

describe("jsaSanshoPrize", () => {
  it("¥2,000,000 in 2026, ¥3,000,000 from 2027", () => {
    expect(jsaSanshoPrize(2026)).toBe(2_000_000);
    expect(jsaSanshoPrize(2027)).toBe(3_000_000);
  });
});

describe("jsaBashoTeate — non-sekitori tournament allowance by era", () => {
  const cases: Array<[string, number, number]> = [
    ["makushita", 165_000, 180_000],
    ["sandanme", 110_000, 120_000],
    ["jonidan", 88_000, 95_000],
    ["jonokuchi", 77_000, 82_000],
  ];
  for (const [division, y2026, y2027] of cases) {
    it(`${division}: ¥${y2026} in 2026, ¥${y2027} from 2027`, () => {
      expect(jsaBashoTeate(division as any, 2026)).toBe(y2026);
      expect(jsaBashoTeate(division as any, 2027)).toBe(y2027);
    });
  }
  it("sekitori get no teate", () => {
    expect(jsaBashoTeate("makuuchi" as any, 2027)).toBe(0);
    expect(jsaBashoTeate("juryo" as any, 2027)).toBe(0);
  });
});

describe("non-sekitori win / kachikoshi bonuses by era", () => {
  const cases: Array<[string, number, number, number, number]> = [
    // division, 2026 win, 2027+ win, 2026 kachikoshi, 2027+ kachikoshi
    ["makushita", 3_500, 4_000, 8_000, 10_000],
    ["sandanme", 3_000, 3_500, 6_500, 8_500],
    ["jonidan", 2_500, 3_000, 5_500, 7_500],
    ["jonokuchi", 2_500, 3_000, 5_500, 7_500],
  ];
  for (const [division, w26, w27, k26, k27] of cases) {
    it(`${division}: win ¥${w26}→¥${w27}, kachikoshi ¥${k26}→¥${k27}`, () => {
      expect(jsaWinBonus(division as any, 2026)).toBe(w26);
      expect(jsaWinBonus(division as any, 2027)).toBe(w27);
      expect(jsaKachikoshiBonus(division as any, 2026)).toBe(k26);
      expect(jsaKachikoshiBonus(division as any, 2027)).toBe(k27);
    });
  }
});

describe("payBashoTeate — teate + shoshi-kin + kachikoshi-kin (real JSA worked example)", () => {
  // The 2026-11 ShuPre worked example: a makushita rikishi going 6-1 earns
  // ¥226,000 under the legacy schedule and ¥254,000 under the revised one.
  const worldWith = (year: number): WorldState => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      currentBashoWins: 6,
      currentBashoLosses: 1,
      economics: econ(),
    });
    return makeMockWorld({ year, rikishi: new Map([["r1", r]]), activeRikishiIds: new Set(["r1"]) });
  };

  it("6-1 makushita earns ¥226,000 in 2026", () => {
    const world = worldWith(2026);
    const resolved = resolveImpacts(world, [payBashoTeate(world)]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(226_000);
  });

  it("6-1 makushita earns ¥254,000 in 2027", () => {
    const world = worldWith(2027);
    const resolved = resolveImpacts(world, [payBashoTeate(world)]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(254_000);
  });

  it("absence days count in the loss column for kachikoshi-kin (負け数には休場も含む)", () => {
    // 4-1 makushita whose last two days were missed after a withdrawal:
    // record 4-1-2 → losses for the formula = 1 + 2 absences → net 1 point.
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      currentBashoWins: 4,
      currentBashoLosses: 1,
      economics: econ(),
    });
    const world = makeMockWorld({ year: 2026, rikishi: new Map([["r1", r]]), activeRikishiIds: new Set(["r1"]) });
    const resolved = resolveImpacts(world, [payBashoTeate(world)]);
    // 165_000 + 4 × 3_500 + 1 × 8_000 = 187_000
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(187_000);
  });

  it("make-koshi pays no kachikoshi bonus", () => {
    const r = mockRikishi("r1", {
      rank: "jonidan",
      division: "jonidan",
      currentBashoWins: 3,
      currentBashoLosses: 4,
      economics: econ(),
    });
    const world = makeMockWorld({ year: 2026, rikishi: new Map([["r1", r]]), activeRikishiIds: new Set(["r1"]) });
    const resolved = resolveImpacts(world, [payBashoTeate(world)]);
    // 88_000 teate + 3 wins × 2_500, no kachikoshi-kin
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(95_500);
  });

  it("sekitori get nothing from the non-sekitori pipeline", () => {
    const r = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      currentBashoWins: 10,
      currentBashoLosses: 5,
      economics: econ(),
    });
    const world = makeMockWorld({ year: 2027, rikishi: new Map([["r1", r]]), activeRikishiIds: new Set(["r1"]) });
    const resolved = resolveImpacts(world, [payBashoTeate(world)]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(0);
  });
});

describe("jsaSanyakuBashoAllowance — honbasho special allowance", () => {
  // Full amount at 11+ contested days, 2/3 at 6-10, 1/3 at <=5, none at 0.
  it("yokozuna with 15 contested days gets ¥200,000", () => {
    expect(jsaSanyakuBashoAllowance("yokozuna", 15)).toBe(200_000);
  });
  it("ozeki with 15 contested days gets ¥150,000", () => {
    expect(jsaSanyakuBashoAllowance("ozeki", 15)).toBe(150_000);
  });
  it("sekiwake/komusubi with 15 contested days get ¥50,000", () => {
    expect(jsaSanyakuBashoAllowance("sekiwake", 15)).toBe(50_000);
    expect(jsaSanyakuBashoAllowance("komusubi", 15)).toBe(50_000);
  });
  it("pro-rates 2/3 at 6-10 contested days and 1/3 at <=5", () => {
    expect(jsaSanyakuBashoAllowance("yokozuna", 11)).toBe(200_000);
    expect(jsaSanyakuBashoAllowance("yokozuna", 10)).toBe(Math.round(200_000 * (2 / 3)));
    expect(jsaSanyakuBashoAllowance("yokozuna", 6)).toBe(Math.round(200_000 * (2 / 3)));
    expect(jsaSanyakuBashoAllowance("yokozuna", 5)).toBe(Math.round(200_000 / 3));
    expect(jsaSanyakuBashoAllowance("yokozuna", 0)).toBe(0);
  });
  it("maegashira and juryo get no special allowance", () => {
    expect(jsaSanyakuBashoAllowance("maegashira", 15)).toBe(0);
    expect(jsaSanyakuBashoAllowance("juryo", 15)).toBe(0);
  });
});

describe("paySanyakuBashoAllowance", () => {
  it("pays the full allowance to a yokozuna who contested all 15 days", () => {
    const r = mockRikishi("r1", {
      rank: "yokozuna",
      division: "makuuchi",
      currentBashoWins: 11,
      currentBashoLosses: 4,
      economics: econ(),
    });
    const world = makeMockWorld({ year: 2026, rikishi: new Map([["r1", r]]), activeRikishiIds: new Set(["r1"]) });
    const resolved = resolveImpacts(world, [paySanyakuBashoAllowance(world)]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(200_000);
  });

  it("pays nothing on full kyujo", () => {
    const r = mockRikishi("r1", {
      rank: "ozeki",
      division: "makuuchi",
      currentBashoWins: 0,
      currentBashoLosses: 0,
      economics: econ(),
    });
    const world = makeMockWorld({ year: 2026, rikishi: new Map([["r1", r]]), activeRikishiIds: new Set(["r1"]) });
    const resolved = resolveImpacts(world, [paySanyakuBashoAllowance(world)]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(0);
  });
});

describe("jsaJungyoStipendMultiplier", () => {
  it("0.3 in 2026, raised for the 2027 package (+30%, mid of the reported 20-50% range)", () => {
    expect(jsaJungyoStipendMultiplier(2026)).toBeCloseTo(0.3);
    expect(jsaJungyoStipendMultiplier(2027)).toBeCloseTo(0.39);
  });
});

describe("announceJsaBulletins — JSA rule-change news items", () => {
  const worldAt = (year: number, month: number): WorldState =>
    makeMockWorld({
      year,
      calendar: { currentWeek: 1, month, currentDay: 1 },
      mediaState: {
        version: "1.0.0",
        headlines: [],
        mediaHeat: {},
        heyaPressure: {},
        bashoStreaks: {},
        streakHeadlinesFired: {},
        promoWatchFired: {},
        retirementWatchFired: {},
        titleRaceDayFired: {},
        injuryWithdrawalFired: {},
        mediaHeatHistory: {},
        absenceAnnouncements: [],
      },
    });

  const headlinesOf = (w: WorldState, impact: ReturnType<typeof announceJsaBulletins>) =>
    resolveImpacts(w, [impact]).mediaState?.headlines ?? [];

  it("emits the pay-revision announcement entering August 2026", () => {
    const world = worldAt(2026, 8);
    const hs = headlinesOf(world, announceJsaBulletins(world));
    const h = hs.find((x) => x.tags?.includes("jsa_pay_revision_announced"));
    expect(h).toBeDefined();
    expect(h?.tier).toBe("national");
  });

  it("emits the Article-9 (topknot) bulletin entering October 2026", () => {
    const world = worldAt(2026, 10);
    const hs = headlinesOf(world, announceJsaBulletins(world));
    expect(hs.some((x) => x.tags?.includes("jsa_article9_revision"))).toBe(true);
  });

  it("emits the effective notice at the boundary rolling into January 2027", () => {
    // phase05 runs before phase06 increments world.year, so the boundary
    // into January 2027 still reads year 2026 in the monthly phase.
    const world = worldAt(2026, 1);
    const hs = headlinesOf(world, announceJsaBulletins(world));
    expect(hs.some((x) => x.tags?.includes("jsa_pay_revision_effective"))).toBe(true);
  });

  it("is silent in unrelated months and dedupes on replay", () => {
    const quiet = worldAt(2026, 3);
    expect(headlinesOf(quiet, announceJsaBulletins(quiet))).toHaveLength(0);

    const world = worldAt(2026, 8);
    const once = resolveImpacts(world, [announceJsaBulletins(world)]);
    const twice = resolveImpacts(once, [announceJsaBulletins(once)]);
    expect(
      (twice.mediaState?.headlines ?? []).filter((x) =>
        x.tags?.includes("jsa_pay_revision_announced")
      )
    ).toHaveLength(1);
  });
});

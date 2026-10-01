import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { phase01_week_candidate_pool } from "@/engine/tick/phases/phase01_week_candidate_pool";
import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import { phase01_week_health } from "@/engine/tick/phases/phase01_week_health";
import { purchaseMyoseki } from "@/engine/systems/governance/MyosekiTradingService";
import { tickWeekTalentPool } from "@/engine/systems/generation/TalentPoolMaintenance";
import { withdrawRikishi } from "@/engine/systems/health/HealthActions";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import {
  TRAVEL_ALLOWANCE_YEARLY,
  TSUKEBITO_COSTS_MONTHLY,
} from "@/constants/engine/economic";
import {
  MONTHLY_DIVISOR,
  TRAVEL_ALLOWANCE_CASH_SPLIT,
} from "@/constants/engine/economyExtended";
import type { WorldState } from "@/engine/types/world";
import type { TalentCandidate } from "@/engine/types/talent";

function baseEconomics(cash: number) {
  return {
    cash,
    retirementFund: 0,
    careerKenshoWon: 0,
    kinboshiCount: 0,
    totalEarnings: 0,
    currentBashoEarnings: 0,
    popularity: 50,
  };
}

describe("audit: stale-base snapshot merges", () => {
  it("phase05: sekitori keeps salary + travel allowance − tsukebito cost in one tick", () => {
    const rank = "maegashira";
    const salary = RANK_HIERARCHY[rank]?.salary ?? 0;
    const travelCash =
      ((TRAVEL_ALLOWANCE_YEARLY[rank as keyof typeof TRAVEL_ALLOWANCE_YEARLY] ?? 0) /
        MONTHLY_DIVISOR) *
      TRAVEL_ALLOWANCE_CASH_SPLIT;
    const tsukebitoCost =
      TSUKEBITO_COSTS_MONTHLY[rank as keyof typeof TSUKEBITO_COSTS_MONTHLY] ?? 0;
    expect(salary).toBeGreaterThan(0);
    expect(travelCash).toBeGreaterThan(0);

    const r = mockRikishi("r1", {
      heyaId: "h1",
      rank: rank as never,
      division: "makuuchi",
      economics: baseEconomics(1_000_000) as never,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", heya]]),
      playerHeyaId: "h1" as never,
      calendar: { month: 1, currentWeek: 5 } as never,
      transientContext: { boundaries: { monthBoundary: true } } as never,
    });

    const resolved = resolveImpacts(world, [phase05_monthly_boundary(world)]);
    const cash = resolved.rikishi.get("r1")!.economics!.cash;
    const expected =
      1_000_000 + salary + travelCash - tsukebitoCost;
    // Before the fix: only the last stale snapshot survives (e.g. base + 0 − tsukebitoCost).
    expect(cash).toBeCloseTo(expected, 2);
  });

  it("phase05: NPC myoseki purchase does not wipe the heya's monthly burn", () => {
    // A regular NPC heya with a marketplace stock it can afford.
    const heya = makeMockHeya("npc", { funds: 10_000_000, rikishiIds: [] });
    const world = makeMockWorld({
      heyas: new Map([["npc", heya]]),
      myosekiMarket: {
        stocks: {
          m1: {
            id: "m1",
            status: "available",
            askingPrice: 3_000_000,
            prestigeTier: "standard",
            ownerId: "old",
          },
        },
        history: [],
      } as never,
    });
    const market = world.myosekiMarket!;
    const impact = purchaseMyoseki(world, market, "m1" as never, "npc" as never, 10_000_000);
    const resolved = resolveImpacts(world, [impact]);
    // Stock transfers AND the buyer is debited — before the fix, NPCs paid nothing.
    expect(resolved.myosekiMarket!.stocks["m1"].ownerId).toBe("npc");
    expect(resolved.heyas.get("npc")!.funds).toBe(10_000_000 - 3_000_000);
  });

  it("phase01_week_candidate_pool preserves NPC interest suitors after the weekly tick", () => {
    const candidate: TalentCandidate = {
      candidateId: "c1" as never,
      availabilityState: "available",
      talentSeed: 95,
    } as never;
    const world = makeMockWorld({
      playerHeyaId: "player" as never,
      heyas: new Map([
        ["player", makeMockHeya("player", { reputation: 50 })],
        ["npc", makeMockHeya("npc", { reputation: 100 })],
      ]),
      week: 3,
      talentPool: {
        candidates: { c1: candidate },
        pools: {
          high_school: { candidatesVisible: ["c1"], candidatesHidden: [] },
          university: { candidatesVisible: [], candidatesHidden: [] },
          foreign: { candidatesVisible: [], candidatesHidden: [] },
        },
      } as never,
      candidatePool: {
        candidates: {},
        pools: {
          high_school: { candidatesVisible: [], candidatesHidden: [] },
          university: { candidatesVisible: [], candidatesHidden: [] },
          foreign: { candidatesVisible: [], candidatesHidden: [] },
        },
      } as never,
    });

    const resolved = resolveImpacts(world, [phase01_week_candidate_pool(world)]);
    const c = resolved.candidatePool!.candidates["c1"];
    // talentSeed 95 + rep 100 → probability >1 → guaranteed suitor.
    // Before the fix, tickWeekCandidatePool's stale snapshot erased them.
    expect(c?.competingSuitors?.length).toBeGreaterThan(0);
    expect(c?.competingSuitors?.[0]?.heyaId).toBe("npc");
  });

  it("phase01_week_welfare keeps generated headlines when media pressure is applied", () => {
    const heya = makeMockHeya("h1", {
      welfareState: {
        welfareRisk: 90,
        complianceState: "watch",
        weeksInState: 99,
        morale: 50,
      } as never,
    });
    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
      calendar: { currentWeek: 2 } as never,
      week: 2,
      mediaState: { headlines: [], heyaPressure: {}, mediaHeat: {} } as never,
    });

    const resolved = resolveImpacts(world, [phase01_week_welfare(world)]);
    const ms = resolved.mediaState!;
    // Before the fix, the final mediaState write rebuilt from input and
    // dropped the headline merged inside the transition handlers.
    expect(ms.headlines.length).toBeGreaterThan(0);
    expect(ms.heyaPressure["h1"]).toBeGreaterThan(0);
  });

  it("phase01_week_welfare does not mutate the input world's nested investigation", () => {
    const heya = makeMockHeya("h1", {
      welfareState: {
        welfareRisk: 10,
        complianceState: "investigation",
        weeksInState: 1,
        morale: 50,
        investigation: { openedWeek: 1, severity: "low", triggers: [], progress: 40 },
      } as never,
    });
    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
      calendar: { currentWeek: 2 } as never,
      week: 2,
      mediaState: { headlines: [], heyaPressure: {}, mediaHeat: {} } as never,
    });
    phase01_week_welfare(world);
    // The phase must not write into the live nested object.
    expect(heya.welfareState!.investigation!.progress).toBe(40);
  });

  it("phase01_week_health does not mutate the input world's injuryStatus on partial recovery", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: {
        type: "sprain",
        severity: "minor",
        weeksRemaining: 3,
        isInjured: true,
      } as never,
    });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: ["r1"] })]]),
      week: 4,
      calendar: { currentWeek: 4 } as never,
    });
    phase01_week_health(world);
    // Partial recovery ticks must not decrement the live nested object.
    expect(r.injuryStatus!.weeksRemaining).toBe(3);
    expect(r.injuryWeeksRemaining).toBe(3);
  });

  it("tickWeekTalentPool does not mutate the input world's pool arrays", () => {
    const world = makeMockWorld({
      week: 2,
      talentPool: {
        candidates: {},
        pools: {
          high_school: { candidatesVisible: [], candidatesHidden: ["a", "b", "c"] },
          university: { candidatesVisible: [], candidatesHidden: [] },
          foreign: { candidatesVisible: [], candidatesHidden: [] },
        },
      } as never,
    });
    tickWeekTalentPool(world);
    expect(world.talentPool!.pools.high_school.candidatesHidden).toEqual(["a", "b", "c"]);
    expect(world.talentPool!.pools.high_school.candidatesVisible).toEqual([]);
  });

  it("withdrawRikishi detects in-bout injuries via the week the injury occurred", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryWeeksRemaining: 2,
      currentInjury: { weekOccurred: 7, area: "knee" } as never,
    });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r]]),
      week: 7,
      currentBasho: { day: 9 } as never,
      cyclePhase: "active_basho",
    });
    const impact = withdrawRikishi(world, "r1");
    const ev = impact.events?.find((e) => e.type === "LIFECYCLE_EVENT");
    // weekOccurred 7 === world.week 7 → in-bout injury. The old code compared
    // weekOccurred against currentBasho.day (9) and reported false.
    expect((ev?.data as Record<string, unknown>)?.isInBoutInjury).toBe(true);
  });
});

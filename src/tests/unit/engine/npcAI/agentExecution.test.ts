import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { executeAgentDecisions } from "@/engine/npcAI/execution";
import { applyImpact } from "@/engine/core/ImpactResolver";
import type { AgentDecisions } from "@/engine/npcAI/types";
import type { WorldState } from "@/engine/types/world";

/**
 * WS4 contract tests — agent decisions must produce real world-state deltas,
 * not just log lines. Each flag maps to a measurable effect.
 */

function makeDecisions(overrides: Partial<AgentDecisions> = {}): AgentDecisions {
  return {
    finance: {
      shouldBuyMyoseki: false,
      shouldInvestInFacilities: false,
      shouldBuildReserves: false,
      riskLevel: "moderate",
    },
    governance: {
      shouldReduceScandal: false,
      shouldUsePoliticalFavor: false,
      shouldSabotageRival: false,
    },
    recruitment: { maxBid: 0, shouldBid: false, bidStrategy: "conservative" },
    rivalry: { escalateRivalry: false, deescalateRivalry: false, targetRivalForMatchmaking: [] },
    narrative: { shouldTriggerEvent: false, narrativeTone: "neutral" },
    ...overrides,
  };
}

interface WorldOpts {
  heyaOverrides?: Parameters<typeof MockFactory.createHeya>[1];
  oyakataOverrides?: Parameters<typeof MockFactory.createOyakata>[1];
  myosekiMarket?: WorldState["myosekiMarket"];
  rivalriesState?: WorldState["rivalriesState"];
}

function makeWorld(opts: WorldOpts = {}): { world: WorldState; oyakataId: string } {
  const oyakata = MockFactory.createOyakata("oya-a", { heyaId: "heya-a", ...opts.oyakataOverrides });
  const heya = MockFactory.createHeya("heya-a", {
    oyakataId: "oya-a",
    funds: 999_999_999,
    ...opts.heyaOverrides,
  });
  const world = MockFactory.createWorld({
    heyas: new Map([["heya-a", heya]]),
    oyakata: new Map([["oya-a", oyakata]]),
    myosekiMarket: opts.myosekiMarket,
    rivalriesState: opts.rivalriesState,
  });
  return { world, oyakataId: "oya-a" };
}

function makeMarket(askingPrice: number): WorldState["myosekiMarket"] {
  return {
    stocks: {
      "stock-1": {
        id: "stock-1",
        name: "Test-share",
        status: "available",
        askingPrice,
      } as never,
    },
    transactions: [],
  } as never;
}

describe("executeAgentDecisions — finance", () => {
  it("shouldBuyMyoseki → heya funds decrease and stock ownership transfers", () => {
    const { world } = makeWorld({ myosekiMarket: makeMarket(1_000_000) });
    const before = world.heyas.get("heya-a")!.funds;
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        finance: {
          shouldBuyMyoseki: true,
          shouldInvestInFacilities: false,
          shouldBuildReserves: false,
          riskLevel: "moderate",
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.heyas.get("heya-a")!.funds).toBeLessThan(before);
    expect(resolved.myosekiMarket?.stocks["stock-1"].status).toBe("held");
  });

  it("shouldBuyMyoseki with no affordable stock → no funds change", () => {
    const { world } = makeWorld({
      myosekiMarket: makeMarket(5),
      heyaOverrides: { funds: 1 },
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        finance: {
          shouldBuyMyoseki: true,
          shouldInvestInFacilities: false,
          shouldBuildReserves: false,
          riskLevel: "moderate",
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.heyas.get("heya-a")!.funds).toBe(1);
  });

  it("shouldInvestInFacilities → a facility level increases at a funds cost", () => {
    const { world } = makeWorld({
      heyaOverrides: { facilities: { training: 1, recovery: 1, nutrition: 1 } },
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        finance: {
          shouldBuyMyoseki: false,
          shouldInvestInFacilities: true,
          shouldBuildReserves: false,
          riskLevel: "moderate",
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const f = resolved.heyas.get("heya-a")!.facilities;
    expect(f.training + f.recovery + f.nutrition).toBe(4);
    expect(resolved.heyas.get("heya-a")!.funds).toBeLessThan(999_999_999);
  });

  it("discretionary spending is blocked when the runway band is critical or desperate", () => {
    for (const band of ["critical", "desperate"] as const) {
      const { world } = makeWorld({
        myosekiMarket: makeMarket(1_000_000),
        heyaOverrides: {
          funds: 50_000_000,
          runwayBand: band,
          facilities: { training: 1, recovery: 1, nutrition: 1 },
        },
      });
      const impact = executeAgentDecisions(
        world,
        "heya-a",
        makeDecisions({
          finance: {
            shouldBuyMyoseki: true,
            shouldInvestInFacilities: true,
            shouldBuildReserves: false,
            riskLevel: "aggressive",
          },
        }),
        world.oyakata.get("oya-a")!
      );
      const resolved = applyImpact(world, impact);
      const heya = resolved.heyas.get("heya-a")!;
      expect(heya.funds).toBe(50_000_000);
      const f = heya.facilities;
      expect(f.training + f.recovery + f.nutrition).toBe(3);
      expect(resolved.myosekiMarket?.stocks["stock-1"].status).toBe("available");
    }
  });

  it("a spend that would breach the operating reserve is skipped even when affordable", () => {
    // 21M funds can nominally afford the 20M facility upgrade, but it would
    // leave less than the operating reserve — the AI must decline it.
    const { world } = makeWorld({
      heyaOverrides: { funds: 21_000_000, facilities: { training: 1, recovery: 1, nutrition: 1 } },
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        finance: {
          shouldBuyMyoseki: false,
          shouldInvestInFacilities: true,
          shouldBuildReserves: false,
          riskLevel: "moderate",
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const heya = resolved.heyas.get("heya-a")!;
    expect(heya.funds).toBe(21_000_000);
    const f = heya.facilities;
    expect(f.training + f.recovery + f.nutrition).toBe(3);
  });

  it("a spend that preserves the operating reserve still executes", () => {
    const { world } = makeWorld({
      heyaOverrides: { funds: 30_000_000, facilities: { training: 1, recovery: 1, nutrition: 1 } },
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        finance: {
          shouldBuyMyoseki: false,
          shouldInvestInFacilities: true,
          shouldBuildReserves: false,
          riskLevel: "moderate",
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const heya = resolved.heyas.get("heya-a")!;
    const f = heya.facilities;
    expect(f.training + f.recovery + f.nutrition).toBe(4);
    expect(heya.funds).toBe(30_000_000 - 20_000_000);
  });
});

describe("executeAgentDecisions — governance", () => {
  it("shouldReduceScandal → scandalScore decreases at a capital or funds cost", () => {
    const { world } = makeWorld({
      heyaOverrides: { scandalScore: 40, politicalCapital: 0 },
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        governance: {
          shouldReduceScandal: true,
          shouldUsePoliticalFavor: false,
          shouldSabotageRival: false,
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const heya = resolved.heyas.get("heya-a")!;
    expect(heya.scandalScore).toBeLessThan(40);
    expect(heya.funds).toBeLessThan(999_999_999);
  });

  it("shouldUsePoliticalFavor → political capital is spent for a real effect", () => {
    const { world } = makeWorld({
      heyaOverrides: { politicalCapital: 50, scandalScore: 20 },
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        governance: {
          shouldReduceScandal: false,
          shouldUsePoliticalFavor: true,
          shouldSabotageRival: false,
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const heya = resolved.heyas.get("heya-a")!;
    expect(heya.politicalCapital).toBeLessThan(50);
    // The chosen favor must produce SOME effect beyond the capital spend.
    const effective =
      heya.scandalScore < 20 ||
      heya.funds !== 999_999_999 ||
      resolved.matchmakingOverride?.requesterId === "heya-a";
    expect(effective).toBe(true);
  });
});

describe("executeAgentDecisions — rivalry", () => {
  const rivalries = (heat: number): WorldState["rivalriesState"] => ({
    version: 1,
    pairs: {
      "r-east|r-west": {
        key: "r-east|r-west",
        aId: "r-east",
        bId: "r-west",
        heat,
        meetings: 4,
        lastMetWeek: 2,
        aWins: 2,
        bWins: 2,
        closeness: 60,
        spite: 30,
        tone: "grudge",
        triggers: {},
        sameHeya: false,
      },
    },
    heyaRivalryPairs: {
      "heya-a|heya-b": {
        id: "heya-a|heya-b",
        heyaAId: "heya-a",
        heyaBId: "heya-b",
        heat,
        aWins: 2,
        bWins: 2,
      },
    },
  } as never);

  function worldWithRikishi(heat: number): WorldState {
    const rEast = MockFactory.createRikishi("r-east", { heyaId: "heya-a" });
    const rWest = MockFactory.createRikishi("r-west", { heyaId: "heya-b" });
    const { world } = makeWorld({ rivalriesState: rivalries(heat) });
    return MockFactory.createWorld({
      ...world,
      rikishi: new Map([
        ["r-east", rEast],
        ["r-west", rWest],
      ]),
      heyas: new Map([
        ["heya-a", world.heyas.get("heya-a")!],
        ["heya-b", MockFactory.createHeya("heya-b", { rikishiIds: ["r-west"] })],
      ]),
      oyakata: world.oyakata,
      rivalriesState: rivalries(heat),
    });
  }

  it("escalateRivalry → heat increases on the heya's rivalry", () => {
    const world = worldWithRikishi(50);
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        rivalry: {
          escalateRivalry: true,
          deescalateRivalry: false,
          targetRivalForMatchmaking: [],
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const pair = resolved.rivalriesState?.heyaRivalryPairs?.["heya-a|heya-b"];
    expect(pair!.heat).toBeGreaterThan(50);
  });

  it("deescalateRivalry → heat decreases on the heya's rivalry", () => {
    const world = worldWithRikishi(50);
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        rivalry: {
          escalateRivalry: false,
          deescalateRivalry: true,
          targetRivalForMatchmaking: [],
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    const pair = resolved.rivalriesState?.heyaRivalryPairs?.["heya-a|heya-b"];
    expect(pair!.heat).toBeLessThan(50);
  });
});

describe("executeAgentDecisions — recruitment policy handoff", () => {
  it("shouldBid/maxBid/bidStrategy persist to world.npcBidPolicies", () => {
    const { world } = makeWorld();
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        recruitment: { maxBid: 3_000_000, shouldBid: true, bidStrategy: "aggressive" },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.npcBidPolicies?.["heya-a"]).toEqual({
      shouldBid: true,
      maxBid: 3_000_000,
      bidStrategy: "aggressive",
    });
  });
});

describe("executeAgentDecisions — narrative", () => {
  it("shouldTriggerEvent produces a BardEngine-rendered event for the heya", () => {
    const { world } = makeWorld();
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        narrative: {
          shouldTriggerEvent: true,
          eventType: "media_spotlight",
          narrativeTone: "neutral",
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const narrativeEvents = (impact.events ?? []).filter(
      (e) => e.category === "narrative" || e.type === "NARRATIVE_STRATEGY_SHIFT"
    );
    expect(narrativeEvents.length).toBeGreaterThan(0);
    expect(narrativeEvents[0].heyaId ?? narrativeEvents[0].data?.heyaId).toBe("heya-a");
  });
});

describe("executeAgentDecisions — cooldowns", () => {
  it("records lastExecutedAt on oyakata memory", () => {
    const { world } = makeWorld({ myosekiMarket: makeMarket(1_000_000) });
    const decisions = makeDecisions({
      finance: {
        shouldBuyMyoseki: true,
        shouldInvestInFacilities: false,
        shouldBuildReserves: false,
        riskLevel: "moderate",
      },
    });
    const impact = executeAgentDecisions(world, "heya-a", decisions, world.oyakata.get("oya-a")!);
    const resolved = applyImpact(world, impact);
    const mem = resolved.oyakata.get("oya-a")!.memory;
    expect(mem?.lastExecutedAt?.myoseki).toBeDefined();
  });

  it("a decision on cooldown does not re-execute", () => {
    const { world } = makeWorld({ myosekiMarket: makeMarket(1_000_000) });
    const oyakata = world.oyakata.get("oya-a")!;
    oyakata.memory = {
      ...oyakata.memory!,
      lastExecutedAt: { myoseki: world.week ?? world.calendar?.currentWeek ?? 0 },
    };
    const decisions = makeDecisions({
      finance: {
        shouldBuyMyoseki: true,
        shouldInvestInFacilities: false,
        shouldBuildReserves: false,
        riskLevel: "moderate",
      },
    });
    const impact = executeAgentDecisions(world, "heya-a", decisions, oyakata);
    const resolved = applyImpact(world, impact);
    // Cooldown active — funds untouched, stock still available.
    expect(resolved.heyas.get("heya-a")!.funds).toBe(999_999_999);
    expect(resolved.myosekiMarket?.stocks["stock-1"].status).toBe("available");
  });
});

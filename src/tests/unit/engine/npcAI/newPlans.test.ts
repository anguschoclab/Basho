import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import type { PerceptionSnapshot } from "@/engine/perception";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { applyPlanConstraints } from "@/engine/npcAI/TacticalCoordinator";
import type { AIContext } from "@/engine/ai/types";
import type { AgentDecisions } from "@/engine/npcAI/types";
import type { CoordinationInput } from "@/engine/npcAI/TacticalCoordinator";

/**
 * WS5 contract tests — new strategic plans (kadoban_survival, yusho_defense,
 * faction_ascension, talent_pipeline) must score in the right contexts and
 * their constraints must reach applyPlanConstraints.
 */

function basePerception(heyaId: string, over: Partial<PerceptionSnapshot> = {}): PerceptionSnapshot {
  return {
    heyaId,
    heyaName: "Test Beya",
    generatedAtWeek: 1,
    generatedAtYear: 2026,
    statureBand: "established",
    prestigeBand: "respected",
    runwayBand: "comfortable",
    koenkaiBand: "moderate",
    welfareRiskBand: "safe",
    complianceState: "compliant",
    governancePressureBand: "none",
    stableMediaHeatBand: "cold",
    rivalryPressureBand: "dormant",
    rosterStrengthBand: "competitive",
    rosterSize: 10,
    moraleBand: "content",
    rikishiPerceptions: [],
    alignmentScore: 50,
    styleBias: "neutral",
    ...over,
  } as PerceptionSnapshot;
}

function buildCtx(overrides: Partial<AIContext> = {}, perceptionOverrides = {}): AIContext {
  const world = overrides.world || makeMockWorld();
  const heyaId = overrides.heyaId || "h1";
  if (!world.heyas.get(heyaId)) world.heyas.set(heyaId, makeMockHeya(heyaId));
  const league = overrides.leaguePerception || buildLeaguePerception(world);
  return {
    world,
    heyaId,
    perception: basePerception(heyaId, perceptionOverrides),
    leaguePerception: league,
    oyakata: {
      id: "oy1",
      archetype: "traditionalist",
      traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
      mood: "content",
    },
    ...overrides,
  };
}

function emptyDecisions(): AgentDecisions {
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
    infrastructure: {
      shouldHireStaff: false,
      shouldBuildAcademy: false,
      shouldUpgradeAcademy: false,
    },
  };
}

function coordInput(agentDecisions: AgentDecisions): CoordinationInput {
  return {
    trainingProposal: {
      trainingIntensity: "balanced",
      trainingFocus: "neutral",
      recovery: "standard",
      reasoning: [],
    } as never,
    scoutingProposal: { priority: "passive", reason: "" } as never,
    personnelProposal: {
      individualProtects: [],
      individualDevelops: [],
      individualPushes: [],
      withdrawalIds: [],
      reasoning: [],
    } as never,
    financeResult: {
      shouldBuyMyoseki: false,
      shouldInvestInFacilities: false,
      shouldBuildReserves: false,
      riskLevel: "moderate",
      reasoning: [],
    } as never,
    governanceResult: {
      shouldReduceScandal: false,
      shouldUsePoliticalFavor: false,
      shouldSabotageRival: false,
      reasoning: [],
    } as never,
    recruitmentResult: {
      maxBid: 0,
      shouldBid: false,
      bidStrategy: "conservative",
      reasoning: [],
      confidence: 0,
    } as never,
    rivalryResult: {
      escalateRivalry: false,
      deescalateRivalry: false,
      targetRivalForMatchmaking: [],
      reasoning: [],
    } as never,
    agentDecisions,
  };
}

describe("kadoban_survival plan", () => {
  it("is selected when a heya ozeki is kadoban", () => {
    const world = makeMockWorld();
    const ozeki = mockRikishi("oz-1", { heyaId: "h1", rank: "ozeki" });
    world.rikishi.set("oz-1", ozeki);
    const heya = makeMockHeya("h1", { rikishiIds: ["oz-1"] });
    world.heyas.set("h1", heya);
    world.ozekiKadoban = { "oz-1": { isKadoban: true, consecutiveMakeKoshi: 1 } };

    const ctx = buildCtx({ world, heyaId: "h1" });
    const plan = createPlan(ctx);
    expect(plan).toBeDefined();
    expect(plan!.planId).toBe("kadoban_survival");
  });

  it("protect_rikishi constraint carries the kadoban rikishi into proposals", () => {
    const world = makeMockWorld();
    const ozeki = mockRikishi("oz-1", { heyaId: "h1", rank: "ozeki" });
    world.rikishi.set("oz-1", ozeki);
    world.heyas.set("h1", makeMockHeya("h1", { rikishiIds: ["oz-1"] }));
    world.ozekiKadoban = { "oz-1": { isKadoban: true, consecutiveMakeKoshi: 1 } };

    const ctx = buildCtx({ world, heyaId: "h1" });
    const plan = createPlan(ctx)!;
    expect(plan.planId).toBe("kadoban_survival");

    const decisions = emptyDecisions();
    const input = coordInput(decisions);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, ctx.perception!, reasoning);
    expect(input.personnelProposal.individualProtects).toContain("oz-1");
  });
});

describe("yusho_defense plan", () => {
  it("is selected when the heya holds the reigning yusho", () => {
    const world = makeMockWorld();
    const champ = mockRikishi("champ-1", { heyaId: "h1", rank: "yokozuna" });
    world.rikishi.set("champ-1", champ);
    world.heyas.set("h1", makeMockHeya("h1", { rikishiIds: ["champ-1"] }));
    world.history = [{ yusho: "champ-1" } as never];

    const ctx = buildCtx({ world, heyaId: "h1" }, { rosterStrengthBand: "dominant" });
    ctx.oyakata!.traits.ambition = 60;
    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("yusho_defense");
  });
});

describe("faction_ascension plan", () => {
  it("scores when the heya trails its ichimon leader with capital and ambition", () => {
    const world = makeMockWorld();
    const leader = makeMockHeya("h-leader", { ichimon: "Dewanoumi", politicalCapital: 90 });
    const self = makeMockHeya("h1", { ichimon: "Dewanoumi", politicalCapital: 55 });
    world.heyas.set("h-leader", leader);
    world.heyas.set("h1", self);

    const league = buildLeaguePerception(world);
    expect(league.ichimonLeaders?.["Dewanoumi"]?.heyaId).toBe("h-leader");

    const ctx = buildCtx({ world, heyaId: "h1", leaguePerception: league });
    ctx.oyakata!.traits.ambition = 85;
    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("faction_ascension");
  });

  it("does not outscore when the heya already leads its ichimon", () => {
    const world = makeMockWorld();
    world.heyas.set("h1", makeMockHeya("h1", { ichimon: "Dewanoumi", politicalCapital: 90 }));
    const league = buildLeaguePerception(world);
    const ctx = buildCtx({ world, heyaId: "h1", leaguePerception: league });
    ctx.oyakata!.traits.ambition = 85;
    const plan = createPlan(ctx);
    expect(plan!.planId).not.toBe("faction_ascension");
  });

  it("use_favors directive drives governance.shouldUsePoliticalFavor", () => {
    const world = makeMockWorld();
    world.heyas.set("h-leader", makeMockHeya("h-leader", { ichimon: "Dewanoumi", politicalCapital: 90 }));
    world.heyas.set("h1", makeMockHeya("h1", { ichimon: "Dewanoumi", politicalCapital: 55 }));
    const league = buildLeaguePerception(world);
    const ctx = buildCtx({ world, heyaId: "h1", leaguePerception: league });
    ctx.oyakata!.traits.ambition = 85;
    const plan = createPlan(ctx)!;
    expect(plan.planId).toBe("faction_ascension");

    const decisions = emptyDecisions();
    const input = coordInput(decisions);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, ctx.perception!, reasoning);
    expect(input.agentDecisions.governance.shouldUsePoliticalFavor).toBe(true);
  });
});

describe("talent_pipeline plan", () => {
  it("is selected for a weak roster with a top recruit visible", () => {
    const world = makeMockWorld();
    const league = {
      ...buildLeaguePerception(world),
      topRecruitAvailable: true,
    };
    const ctx = buildCtx(
      { world, heyaId: "h1", leaguePerception: league },
      { rosterStrengthBand: "weak", rosterSize: 6 }
    );
    ctx.oyakata!.archetype = "nurturer";
    ctx.oyakata!.traits.patience = 80;
    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("talent_pipeline");
  });

  it("invest_academy constraint reaches agentDecisions.infrastructure", () => {
    const world = makeMockWorld();
    const league = { ...buildLeaguePerception(world), topRecruitAvailable: true };
    const ctx = buildCtx(
      { world, heyaId: "h1", leaguePerception: league },
      { rosterStrengthBand: "weak", rosterSize: 6 }
    );
    ctx.oyakata!.archetype = "nurturer";
    ctx.oyakata!.traits.patience = 80;
    const plan = createPlan(ctx)!;
    expect(plan.planId).toBe("talent_pipeline");

    const decisions = emptyDecisions();
    const input = coordInput(decisions);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, ctx.perception!, reasoning);
    const infra = input.agentDecisions.infrastructure;
    expect(infra?.shouldBuildAcademy || infra?.shouldUpgradeAcademy).toBe(true);
  });
});

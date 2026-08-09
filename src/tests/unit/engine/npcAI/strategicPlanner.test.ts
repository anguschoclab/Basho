import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import type { PerceptionSnapshot } from "@/engine/perception";
import { createPlan, shouldReplan } from "@/engine/npcAI/StrategicPlanner";
import type { AIContext } from "@/engine/ai/types";

function buildCtx(
  overrides: Partial<AIContext> = {},
  perceptionOverrides: Partial<PerceptionSnapshot> = {}
): AIContext {
  const world = overrides.world || makeMockWorld();
  const heyaId = overrides.heyaId || "h1";
  const heya = makeMockHeya(heyaId);
  world.heyas.set(heyaId, heya);

  const basePerception: PerceptionSnapshot = {
    heyaId,
    heyaName: heya.name,
    generatedAtWeek: world.week,
    generatedAtYear: world.year,
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
    ...perceptionOverrides,
  };

  const league = overrides.leaguePerception || buildLeaguePerception(world);

  return {
    world,
    heyaId,
    perception: basePerception,
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

describe("createPlan", () => {
  it("selects yokozuna_push for a dominant roster with an ambition oyakata", () => {
    const ctx = buildCtx({}, { rosterStrengthBand: "dominant", runwayBand: "comfortable" });
    ctx.oyakata!.traits.ambition = 80;
    ctx.oyakata!.traits.risk = 70;

    const plan = createPlan(ctx);
    expect(plan).toBeDefined();
    expect(plan!.planId).toBe("yokozuna_push");
    expect(plan!.goals.some((g) => g.target === "win_yusho")).toBe(true);
    expect(plan!.constraints.some((c) => c.type === "min_reserve")).toBe(true);
  });

  it("selects financial_consolidation when runway is desperate", () => {
    const ctx = buildCtx({}, { runwayBand: "desperate" });
    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("financial_consolidation");
    expect(plan!.constraints.some((c) => c.type === "min_reserve" && c.value === 12)).toBe(true);
  });

  it("selects rebuilding for a weak roster", () => {
    const ctx = buildCtx({}, { rosterStrengthBand: "weak", rosterSize: 8 });
    ctx.oyakata!.archetype = "nurturer";
    ctx.oyakata!.traits.patience = 80;

    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("rebuilding");
    expect(
      plan!.constraints.some((c) => c.type === "max_intensity" && c.value === "balanced")
    ).toBe(true);
  });

  it("selects status_quo when no strong signal exists", () => {
    const ctx = buildCtx(
      {},
      {
        rosterStrengthBand: "competitive",
        runwayBand: "comfortable",
        rivalryPressureBand: "dormant",
        rosterSize: 14,
      }
    );
    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("status_quo");
  });

  it("selects rivalry_suppression when the heya is in a rivalry cluster", () => {
    const world = makeMockWorld();
    const heyaId = "h1";
    const heya = makeMockHeya(heyaId);
    const r1 = mockRikishi("r1", { heyaId });
    const r2 = mockRikishi("r2", { heyaId });
    world.heyas.set(heyaId, heya);
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    heya.rikishiIds = ["r1", "r2"];

    world.rivalriesState = {
      pairs: {
        "r1-x": { aId: "r1", bId: "x", key: "r1-x", heat: 65, tone: "heated" },
      },
    } as unknown as import("@/engine/rivalries").RivalriesState;

    const ctx = buildCtx({ world, heyaId }, { rivalryPressureBand: "fierce" });
    ctx.oyakata!.archetype = "tyrant";
    ctx.oyakata!.traits.ambition = 80;

    const plan = createPlan(ctx);
    expect(plan!.planId).toBe("rivalry_suppression");
  });

  it("produces a deterministic plan for the same inputs", () => {
    const ctx1 = buildCtx({}, { rosterStrengthBand: "dominant" });
    ctx1.oyakata!.traits.ambition = 80;
    const ctx2 = buildCtx({}, { rosterStrengthBand: "dominant" });
    ctx2.oyakata!.traits.ambition = 80;

    const plan1 = createPlan(ctx1);
    const plan2 = createPlan(ctx2);
    expect(plan1).toEqual(plan2);
  });
});

describe("shouldReplan", () => {
  it("returns true when no active plan exists", () => {
    const ctx = buildCtx();
    expect(shouldReplan(ctx, undefined)).toBe(true);
  });

  it("returns true when the plan is older than 8 weeks", () => {
    const world = makeMockWorld({ week: 10 });
    const ctx = buildCtx({ world });
    expect(shouldReplan(ctx, { planId: "status_quo", startedWeek: 1 })).toBe(true);
  });

  it("returns true when finances become desperate under a non-financial plan", () => {
    const ctx = buildCtx({}, { runwayBand: "desperate" });
    expect(shouldReplan(ctx, { planId: "yokozuna_push", startedWeek: 2 })).toBe(true);
  });

  it("returns false for a recent plan with stable signals", () => {
    const world = makeMockWorld({ week: 5 });
    const ctx = buildCtx({ world }, { runwayBand: "comfortable" });
    expect(shouldReplan(ctx, { planId: "yokozuna_push", startedWeek: 2 })).toBe(false);
  });
});

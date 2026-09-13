import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { createPlan } from "@/engine/npcAI/StrategicPlanner";
import { computeStallPenalty, planPrimaryMetricOrdinal } from "@/engine/npcAI/planOutcomes";
import type { AIContext, OyakataMemory } from "@/engine/ai/types";
import type { PerceptionSnapshot } from "@/engine/perception";

/**
 * WS2 contract tests — decision-history stall detection.
 *
 * A plan pursued week after week with no movement in its primary metric is
 * stalling; scoreWithMemory must decay it so NPCs don't run dead plans
 * forever. The primary metric is recorded on each decisionHistory entry as
 * `metricOrdinal` (higher = better).
 */

function memoryWithDecisions(
  entries: { week: number; planId?: string; metricOrdinal?: number }[]
): OyakataMemory {
  return {
    observations: [],
    coreDirectives: [],
    lastConsolidationTick: 0,
    planHistory: [],
    decisionHistory: entries.map((e) => ({
      week: e.week,
      year: 1,
      planId: e.planId,
      metricOrdinal: e.metricOrdinal,
      summary: "test",
    })),
    opponentModels: {},
  };
}

describe("computeStallPenalty", () => {
  it("returns 0 with no decision history", () => {
    const memory = memoryWithDecisions([]);
    expect(computeStallPenalty("rebuilding", memory)).toBe(0);
  });

  it("returns 0 when the same plan ran for fewer than 4 weeks", () => {
    const memory = memoryWithDecisions([
      { week: 1, planId: "rebuilding", metricOrdinal: 2 },
      { week: 2, planId: "rebuilding", metricOrdinal: 2 },
      { week: 3, planId: "rebuilding", metricOrdinal: 2 },
    ]);
    expect(computeStallPenalty("rebuilding", memory)).toBe(0);
  });

  it("returns 0 when the primary metric is still improving", () => {
    const memory = memoryWithDecisions([
      { week: 1, planId: "rebuilding", metricOrdinal: 1 },
      { week: 2, planId: "rebuilding", metricOrdinal: 1 },
      { week: 3, planId: "rebuilding", metricOrdinal: 2 },
      { week: 4, planId: "rebuilding", metricOrdinal: 2 },
      { week: 5, planId: "rebuilding", metricOrdinal: 3 },
    ]);
    expect(computeStallPenalty("rebuilding", memory)).toBe(0);
  });

  it("penalizes a flat or regressing metric across a long same-plan run", () => {
    const memory = memoryWithDecisions([
      { week: 1, planId: "rebuilding", metricOrdinal: 2 },
      { week: 2, planId: "rebuilding", metricOrdinal: 2 },
      { week: 3, planId: "rebuilding", metricOrdinal: 2 },
      { week: 4, planId: "rebuilding", metricOrdinal: 2 },
      { week: 5, planId: "rebuilding", metricOrdinal: 2 },
    ]);
    expect(computeStallPenalty("rebuilding", memory)).toBeGreaterThan(0);
  });

  it("only counts the trailing run — an intervening plan resets the clock", () => {
    const memory = memoryWithDecisions([
      { week: 1, planId: "rebuilding", metricOrdinal: 1 },
      { week: 2, planId: "rebuilding", metricOrdinal: 1 },
      { week: 3, planId: "status_quo", metricOrdinal: 1 },
      { week: 4, planId: "rebuilding", metricOrdinal: 1 },
      { week: 5, planId: "rebuilding", metricOrdinal: 1 },
    ]);
    expect(computeStallPenalty("rebuilding", memory)).toBe(0);
  });
});

describe("planPrimaryMetricOrdinal", () => {
  it("maps each plan to a real world metric", () => {
    const heya = MockFactory.createHeya("heya-a", {
      rikishiIds: ["r0", "r1"],
      runwayBand: "critical",
    });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-a", heya]]),
      rikishi: new Map([
        ["r0", MockFactory.createRikishi("r0", { heyaId: "heya-a", rank: "ozeki" })],
        ["r1", MockFactory.createRikishi("r1", { heyaId: "heya-a", rank: "jonokuchi" })],
      ]),
    });
    expect(planPrimaryMetricOrdinal(world, "heya-a", "financial_consolidation")).toBe(1);
    expect(planPrimaryMetricOrdinal(world, "heya-a", "rebuilding")).toBe(1);
    expect(planPrimaryMetricOrdinal(world, "heya-a", "recruitment_blitz")).toBe(2);
    expect(planPrimaryMetricOrdinal(world, "heya-a", "rivalry_suppression")).toBe(100);
    expect(typeof planPrimaryMetricOrdinal(world, "heya-a", "yokozuna_push")).toBe("number");
  });
});

describe("createPlan stall decay", () => {
  function buildCtx(memory: OyakataMemory): AIContext {
    const world = MockFactory.createWorld({ week: 20 });
    const heya = MockFactory.createHeya("h1");
    world.heyas.set("h1", heya);
    const perception: PerceptionSnapshot = {
      heyaId: "h1",
      heyaName: "h1",
      generatedAtWeek: 20,
      generatedAtYear: 1,
      statureBand: "established",
      prestigeBand: "respected",
      runwayBand: "tight",
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
    };
    return {
      world,
      heyaId: "h1",
      perception,
      leaguePerception: {
        generatedAtWeek: 20,
        generatedAtYear: 1,
        divisionPressures: {},
        yushoRace: { leaders: [], isClinched: false },
        financiallyFragileHeyas: [],
        rivalryClusters: [],
        topRecruitAvailable: false,
      },
      oyakata: {
        id: "oy1",
        archetype: "traditionalist",
        traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
      },
      memory,
    };
  }

  it("a long flat run under a plan lowers its selection score", () => {
    const fresh = createPlan(buildCtx(memoryWithDecisions([])));
    const stalled = createPlan(
      buildCtx(
        memoryWithDecisions(
          Array.from({ length: 8 }, (_, i) => ({
            week: i + 1,
            planId: "financial_consolidation",
            metricOrdinal: 2,
          }))
        )
      )
    );
    const scoreOf = (reasoning: string[]) =>
      Number(reasoning[0].match(/score (\d+)/)?.[1] ?? 0);
    expect(scoreOf(stalled!.reasoning)).toBeLessThan(scoreOf(fresh!.reasoning));
  });
});

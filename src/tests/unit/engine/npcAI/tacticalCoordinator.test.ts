import { describe, it, expect } from "vitest";
import { applyPlanConstraints, coordinateDecision } from "@/engine/npcAI/TacticalCoordinator";
import type { AIPlan } from "@/engine/ai/types";
import type { PerceptionSnapshot } from "@/engine/perception";
import type { TrainingWorkerResult } from "@/engine/npcAIWorkers";
import type {
  FinanceAgentResult,
  GovernanceAgentResult,
  RecruitmentAgentResult,
  RivalryAgentResult,
} from "@/engine/agents";
import type { PersonnelWorkerResult } from "@/engine/npcAIWorkers";
import type { AgentDecisions } from "@/engine/npcAI/types";

function makePlan(overrides: Partial<AIPlan> = {}): AIPlan {
  return {
    heyaId: "h1",
    archetype: "traditionalist",
    planId: "financial_consolidation",
    goals: [{ domain: "finance", target: "reach_12_month_runway", priority: 10 }],
    constraints: [
      { domain: "finance", type: "min_reserve", value: 12 },
      { domain: "training", type: "max_intensity", value: "balanced" },
    ],
    estimatedWeeks: 12,
    startedWeek: 1,
    reasoning: ["Test plan"],
    ...overrides,
  };
}

function makeInput(): Parameters<typeof applyPlanConstraints>[1] {
  const trainingProposal: TrainingWorkerResult = {
    trainingIntensity: "punishing",
    trainingFocus: "power",
    recovery: "low",
    reasoning: [],
  };
  const scoutingProposal = { priority: "passive" as const, reason: "" };
  const personnelProposal: PersonnelWorkerResult = {
    protectIds: [],
    individualProtects: [],
    individualDevelops: [],
    individualPushes: [],
    withdrawalIds: [],
    reasoning: [],
  };
  const financeResult: FinanceAgentResult = {
    riskLevel: "aggressive",
    shouldBuyMyoseki: true,
    shouldInvestInFacilities: true,
    shouldBuildReserves: false,
    reserveTarget: 0,
    reasoning: [],
  };
  const governanceResult: GovernanceAgentResult = {
    shouldReduceScandal: false,
    shouldUsePoliticalFavor: false,
    shouldSabotageRival: false,
    reasoning: [],
  };
  const recruitmentResult: RecruitmentAgentResult = {
    maxBid: 0,
    shouldBid: false,
    bidStrategy: "conservative",
    reasoning: [],
    confidence: 0,
  };
  const rivalryResult: RivalryAgentResult = {
    escalateRivalry: true,
    escalateStrategy: "aggressive",
    deescalateRivalry: false,
    targetRivalForMatchmaking: [],
    reasoning: [],
  };
  const agentDecisions: AgentDecisions = {
    finance: { ...financeResult },
    governance: { ...governanceResult },
    recruitment: { ...recruitmentResult },
    rivalry: {
      escalateRivalry: true,
      deescalateRivalry: false,
      targetRivalForMatchmaking: [],
    },
    narrative: { shouldTriggerEvent: false, eventType: undefined, narrativeTone: "neutral" },
  };
  return {
    trainingProposal,
    scoutingProposal,
    personnelProposal,
    financeResult,
    governanceResult,
    recruitmentResult,
    rivalryResult,
    agentDecisions,
  };
}

function makePerception(
  runwayBand: PerceptionSnapshot["runwayBand"] = "critical"
): PerceptionSnapshot {
  return {
    runwayBand,
  } as unknown as PerceptionSnapshot;
}

describe("applyPlanConstraints", () => {
  it("caps training intensity at the plan's max_intensity", () => {
    const input = makeInput();
    const plan = makePlan();
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, makePerception(), reasoning);
    expect(input.trainingProposal.trainingIntensity).toBe("balanced");
    expect(reasoning.some((r) => r.includes("Capped training intensity"))).toBe(true);
  });

  it("does not lower intensity below the cap", () => {
    const input = makeInput();
    input.trainingProposal.trainingIntensity = "conservative";
    const plan = makePlan();
    applyPlanConstraints(plan, input, makePerception(), []);
    expect(input.trainingProposal.trainingIntensity).toBe("conservative");
  });

  it("forces conservative reserves when runway is below min_reserve", () => {
    const input = makeInput();
    const plan = makePlan();
    applyPlanConstraints(plan, input, makePerception("critical"), []);
    expect(input.financeResult.riskLevel).toBe("conservative");
    expect(input.financeResult.shouldBuildReserves).toBe(true);
    expect(input.financeResult.shouldBuyMyoseki).toBe(false);
    expect(input.financeResult.shouldInvestInFacilities).toBe(false);
  });

  it("de-escalates rivalry when avoid_rival is true", () => {
    const input = makeInput();
    const plan = makePlan({
      constraints: [{ domain: "rivalry", type: "avoid_rival", value: true }],
    });
    applyPlanConstraints(plan, input, makePerception("comfortable"), []);
    expect(input.rivalryResult.escalateRivalry).toBe(false);
    expect(input.rivalryResult.deescalateRivalry).toBe(true);
    expect(input.agentDecisions.rivalry.escalateRivalry).toBe(false);
  });

  it("boosts scouting and bidding for recruitment_blitz", () => {
    const input = makeInput();
    input.scoutingProposal.priority = "passive";
    input.recruitmentResult.shouldBid = false;
    const plan = makePlan({
      planId: "recruitment_blitz",
      constraints: [],
    });
    applyPlanConstraints(plan, input, makePerception("comfortable"), []);
    expect(input.scoutingProposal.priority).toBe("active");
    expect(input.recruitmentResult.shouldBid).toBe(true);
    expect(input.agentDecisions.recruitment.shouldBid).toBe(true);
  });
});

describe("coordinateDecision", () => {
  it("caps an existing decision's intensity", () => {
    const decision = {
      trainingIntensity: "punishing",
      reasoning: [],
    } as unknown as import("@/engine/npcAI/types").NPCWeeklyDecision;
    const plan = makePlan();
    coordinateDecision(plan, decision, makePerception());
    expect(decision.trainingIntensity).toBe("balanced");
  });
});

import { describe, it, expect } from "vitest";
import { applyPlanConstraints, type CoordinationInput } from "@/engine/npcAI/TacticalCoordinator";
import type { AIPlan } from "@/engine/ai/types";

describe("applyPlanConstraints", () => {
  function makeInput(): CoordinationInput {
    return {
      trainingProposal: {
        trainingIntensity: "punishing",
        trainingFocus: "power",
        recovery: "normal",
        reasoning: [],
      },
      scoutingProposal: { priority: "passive", reason: "" },
      personnelProposal: {
        protectIds: [],
        individualProtects: [],
        individualDevelops: [],
        individualPushes: ["r1"],
        withdrawalIds: [],
        reasoning: [],
      },
      financeResult: {
        riskLevel: "aggressive",
        shouldBuildReserves: false,
        shouldBuyMyoseki: true,
        shouldInvestInFacilities: true,
        reserveTarget: 0,
        reasoning: [],
      },
      governanceResult: {
        shouldReduceScandal: false,
        shouldUsePoliticalFavor: false,
        shouldSabotageRival: false,
        reasoning: [],
      },
      recruitmentResult: { shouldBid: false, maxBid: 0, reasoning: [] },
      rivalryResult: {
        escalateRivalry: true,
        deescalateRivalry: false,
        escalateStrategy: "media",
        reasoning: [],
      },
      agentDecisions: {
        training: { trainingIntensity: "punishing", recoveryEmphasis: "normal" },
        scouting: { priority: "passive" },
        personnel: { individualPushes: ["r1"], individualProtects: [] },
        finance: { riskLevel: "aggressive" },
        recruitment: { shouldBid: false, maxBid: 0 },
        rivalry: { escalateRivalry: true, deescalateRivalry: false, escalateStrategy: "media" },
      },
    } as unknown as CoordinationInput;
  }

  function makePlan(constraints: AIPlan["constraints"]): AIPlan {
    return {
      heyaId: "h1",
      archetype: "traditionalist",
      planId: "test-plan",
      goals: [],
      constraints,
      estimatedWeeks: 4,
      startedWeek: 1,
      reasoning: [],
    };
  }

  function makePerception(runwayBand: string) {
    return { runwayBand } as any;
  }

  it("caps training intensity with max_intensity", () => {
    const input = makeInput();
    const plan = makePlan([{ domain: "training", type: "max_intensity", value: "balanced" }]);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, makePerception("comfortable"), reasoning);
    expect(input.trainingProposal.trainingIntensity).toBe("balanced");
    expect(reasoning.some((r) => r.includes("Capped training intensity"))).toBe(true);
  });

  it("forces conservative finance when runway is below min_reserve target", () => {
    const input = makeInput();
    const plan = makePlan([{ domain: "finance", type: "min_reserve", value: 6 }]);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, makePerception("critical"), reasoning);
    expect(input.financeResult.riskLevel).toBe("conservative");
    expect(input.financeResult.shouldBuildReserves).toBe(true);
    expect(input.financeResult.shouldBuyMyoseki).toBe(false);
    expect(reasoning.some((r) => r.includes("Forced conservative reserves"))).toBe(true);
  });

  it("avoids rivalry escalation with avoid_rival", () => {
    const input = makeInput();
    const plan = makePlan([{ domain: "rivalry", type: "avoid_rival", value: true }]);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, makePerception("comfortable"), reasoning);
    expect(input.rivalryResult.escalateRivalry).toBe(false);
    expect(input.rivalryResult.deescalateRivalry).toBe(true);
    expect(input.agentDecisions.rivalry.escalateRivalry).toBe(false);
    expect(reasoning.some((r) => r.includes("Avoiding rivalry escalation"))).toBe(true);
  });

  it("protects specified rikishi", () => {
    const input = makeInput();
    const plan = makePlan([{ domain: "recruitment", type: "protect_rikishi", value: ["r1"] }]);
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, makePerception("comfortable"), reasoning);
    expect(input.personnelProposal.individualProtects).toContain("r1");
    expect(input.personnelProposal.individualPushes).not.toContain("r1");
    expect(reasoning.some((r) => r.includes("protected development list"))).toBe(true);
  });

  it("boosts scouting and recruitment when active plan is recruitment_blitz", () => {
    const input = makeInput();
    const plan: AIPlan = {
      ...makePlan([]),
      planId: "recruitment_blitz",
      goals: [{ domain: "recruitment", target: "sign_2_sekitori", priority: 9 }],
    };
    const reasoning: string[] = [];
    applyPlanConstraints(plan, input, makePerception("comfortable"), reasoning);
    expect(input.scoutingProposal.priority).toBe("active");
    expect(input.recruitmentResult.shouldBid).toBe(true);
    expect(input.agentDecisions.recruitment.shouldBid).toBe(true);
  });
});

/**
 * TacticalCoordinator.ts
 * ======================
 * Reconciles a strategic plan with the proposals produced by operational AI
 * workers. It adjusts training intensity, financial risk posture, and rivalry
 * stance to keep weekly decisions aligned with the active multi-week plan.
 */

import type { AIPlan } from "../ai/types";
import type { PerceptionSnapshot } from "../perception";
import type { TrainingIntensity } from "../types/training";
import type {
  TrainingWorkerResult,
  ScoutingWorkerResult,
  PersonnelWorkerResult,
} from "../npcAIWorkers";
import type { FinanceAgentResult } from "../agents/FinanceAgent";
import type { GovernanceAgentResult } from "../agents/GovernanceAgent";
import type { RecruitmentAgentResult } from "../agents/RecruitmentAgent";
import type { RivalryAgentResult } from "../agents/RivalryAgent";
import type { AgentDecisions, NPCWeeklyDecision } from "./types";

export interface CoordinationInput {
  trainingProposal: TrainingWorkerResult;
  scoutingProposal: ScoutingWorkerResult;
  personnelProposal: PersonnelWorkerResult;
  financeResult: FinanceAgentResult;
  governanceResult: GovernanceAgentResult;
  recruitmentResult: RecruitmentAgentResult;
  rivalryResult: RivalryAgentResult;
  agentDecisions: AgentDecisions;
}

const INTENSITY_ORDER: Record<TrainingIntensity, number> = {
  conservative: 1,
  balanced: 2,
  intensive: 3,
  punishing: 4,
};

function enforceMaxIntensity(
  proposal: TrainingWorkerResult,
  allowed: TrainingIntensity,
  reasoning: string[]
): void {
  const currentOrder = INTENSITY_ORDER[proposal.trainingIntensity];
  const allowedOrder = INTENSITY_ORDER[allowed];
  if (currentOrder > allowedOrder) {
    proposal.trainingIntensity = allowed;
    reasoning.push(
      `[Plan Constraint] Capped training intensity at '${allowed}' per active plan.`
    );
  }
}

function enforceMinReserve(
  finance: FinanceAgentResult,
  perception: PerceptionSnapshot,
  months: number,
  reasoning: string[]
): void {
  const runwayBands: Record<string, number> = {
    desperate: 0,
    critical: 3,
    tight: 6,
    comfortable: 12,
    secure: 24,
  };
  const currentMonths = runwayBands[perception.runwayBand] ?? 12;
  if (currentMonths < months && finance.riskLevel !== "conservative") {
    finance.riskLevel = "conservative";
    finance.shouldBuildReserves = true;
    finance.shouldBuyMyoseki = false;
    finance.shouldInvestInFacilities = false;
    reasoning.push(
      `[Plan Constraint] Forced conservative reserves: runway ${currentMonths}m < target ${months}m.`
    );
  }
}

function avoidRivalEscalation(
  rivalry: RivalryAgentResult,
  agentDecisions: AgentDecisions,
  reasoning: string[]
): void {
  if (rivalry.escalateRivalry) {
    rivalry.escalateRivalry = false;
    rivalry.deescalateRivalry = true;
    agentDecisions.rivalry.escalateRivalry = false;
    agentDecisions.rivalry.deescalateRivalry = true;
    reasoning.push(`[Plan Constraint] Avoiding rivalry escalation per active plan.`);
  }
}

function protectRikishi(
  personnel: PersonnelWorkerResult,
  value: unknown,
  reasoning: string[]
): void {
  const ids = Array.isArray(value) ? (value as string[]) : [];
  if (ids.length === 0) return;
  const protectedSet = new Set(personnel.individualProtects);
  for (const id of ids) {
    if (!protectedSet.has(id)) {
      personnel.individualProtects.push(id);
      protectedSet.add(id);
      personnel.individualPushes = personnel.individualPushes.filter((pid) => pid !== id);
    }
  }
  reasoning.push(
    `[Plan Constraint] Added ${ids.length} rikishi to protected development list.`
  );
}

function boostRecruitment(
  scouting: ScoutingWorkerResult,
  recruitment: RecruitmentAgentResult,
  agentDecisions: AgentDecisions,
  reasoning: string[]
): void {
  const priorityOrder = { none: 0, passive: 1, active: 2, aggressive: 3 };
  if (priorityOrder[scouting.priority] < priorityOrder["active"]) {
    scouting.priority = "active";
    reasoning.push(`[Plan Directive] Raised scouting priority to active for recruitment push.`);
  }
  if (!recruitment.shouldBid) {
    recruitment.shouldBid = true;
    agentDecisions.recruitment.shouldBid = true;
    reasoning.push(`[Plan Directive] Recruitment blitz authorized bidding.`);
  }
}

/** Apply all constraints from the active plan to worker proposals. */
export function applyPlanConstraints(
  plan: AIPlan,
  input: CoordinationInput,
  perception: PerceptionSnapshot,
  reasoning: string[]
): void {
  reasoning.push(`[Strategic Plan] Active plan: ${plan.planId}`);

  for (const constraint of plan.constraints) {
    switch (constraint.type) {
      case "max_intensity":
        enforceMaxIntensity(
          input.trainingProposal,
          constraint.value as TrainingIntensity,
          reasoning
        );
        break;
      case "min_reserve":
        enforceMinReserve(
          input.financeResult,
          perception,
          Number(constraint.value),
          reasoning
        );
        break;
      case "avoid_rival":
        if (constraint.value === true) {
          avoidRivalEscalation(input.rivalryResult, input.agentDecisions, reasoning);
        }
        break;
      case "protect_rikishi":
        protectRikishi(input.personnelProposal, constraint.value, reasoning);
        break;
    }
  }

  // Plan-specific directives that are not expressed as hard constraints.
  if (plan.planId === "recruitment_blitz") {
    boostRecruitment(
      input.scoutingProposal,
      input.recruitmentResult,
      input.agentDecisions,
      reasoning
    );
  }

  // Rebuild derived agent decisions from the coordinated results.
  input.agentDecisions.finance.riskLevel = input.financeResult.riskLevel;
  input.agentDecisions.finance.shouldBuyMyoseki = input.financeResult.shouldBuyMyoseki;
  input.agentDecisions.finance.shouldInvestInFacilities = input.financeResult.shouldInvestInFacilities;
  input.agentDecisions.finance.shouldBuildReserves = input.financeResult.shouldBuildReserves;
  input.agentDecisions.recruitment.shouldBid = input.recruitmentResult.shouldBid;
  input.agentDecisions.recruitment.maxBid = input.recruitmentResult.maxBid;
  input.agentDecisions.recruitment.bidStrategy = input.recruitmentResult.bidStrategy;
  input.agentDecisions.rivalry.escalateRivalry = input.rivalryResult.escalateRivalry;
  input.agentDecisions.rivalry.deescalateRivalry = input.rivalryResult.deescalateRivalry;
}

/** Convenience wrapper around an existing NPCWeeklyDecision. */
export function coordinateDecision(
  plan: AIPlan,
  decision: NPCWeeklyDecision,
  _perception: PerceptionSnapshot
): void {
  // The decision is already immutable once built; this helper exists for tests
  // that need to verify constraint application without re-running all workers.
  const reasoning = decision.reasoning;
  reasoning.push(`[Strategic Plan] Active plan: ${plan.planId}`);

  for (const constraint of plan.constraints) {
    if (constraint.type === "max_intensity") {
      const allowed = constraint.value as TrainingIntensity;
      if (INTENSITY_ORDER[decision.trainingIntensity] > INTENSITY_ORDER[allowed]) {
        decision.trainingIntensity = allowed;
        reasoning.push(`[Plan Constraint] Capped training intensity at '${allowed}'.`);
      }
    }
  }
}

import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { NPCWeeklyDecision } from "@/engine/npc/npcTypes";
import type { AIPlan } from "@/engine/npc/types";
import { coordinateDecision } from "@/engine/npc/TacticalCoordinator";
import { buildWeeklyContext } from "@/engine/npc/weekly/context";
import { runWeeklyWorkers } from "@/engine/npc/weekly/workers";
import { runAgentLayer, buildWeeklyImpact } from "@/engine/npc/weekly/agents";
import { applyPromotionAwareness, applyInjuryRiskReduction } from "@/engine/npc/weekly/postPasses";

export function makeNPCWeeklyDecision(
  world: WorldState,
  heyaId: Id,
  plan?: AIPlan
): NPCWeeklyDecision {
  const ctx = buildWeeklyContext(world, heyaId);
  const { persona, perception, reasoning } = ctx;

  const proposals = runWeeklyWorkers(world, heyaId, ctx);
  const { trainingProposal, scoutingProposal, personnelProposal } = proposals;

  const agentDecisions = runAgentLayer(world, heyaId, ctx, proposals, plan);

  if (persona.mood === "furious" && trainingProposal.trainingIntensity !== "punishing") {
    trainingProposal.trainingIntensity = "punishing";
    reasoning.push(
      "[Lead Review] Oyakata overrides: Ignoring worker caution, imposing punishing intensity due to fury."
    );
  }

  const impact = buildWeeklyImpact(world, heyaId, ctx, proposals, agentDecisions);

  const decision: NPCWeeklyDecision = {
    heyaId,
    archetype: persona.archetype,
    trainingIntensity: trainingProposal.trainingIntensity,
    trainingFocus: trainingProposal.trainingFocus,
    recovery: trainingProposal.recovery,
    scoutingPriority: scoutingProposal.priority,
    individualProtects: personnelProposal.individualProtects,
    individualDevelops: personnelProposal.individualDevelops,
    individualPushes: personnelProposal.individualPushes,
    reasoning,
    mood: persona.mood,
    impact,
    agentDecisions,
  };

  applyPromotionAwareness(world, heyaId, decision);
  applyInjuryRiskReduction(world, heyaId, decision);

  // The post-passes above can raise intensity (e.g., Ozeki yokozuna-run push)
  // past the plan's max_intensity cap — re-clamp so plan constraints hold.
  if (plan) {
    coordinateDecision(plan, decision, perception);
  }

  return decision;
}

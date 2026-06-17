/**
 * LoopDecisionEngine.ts
 * Generates pending decisions based on world state, blocking progression until resolved.
 */

import type { WorldState } from "../types/world";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { rngFromSeed } from "../rng";

export interface LoopDecision {
  id: string;
  type: string;
  description: string;
  deadlineWeek: number;
  options: Array<{ id: string; label: string; impact: string }>;
  required: boolean;
}

// Deterministic ID: a decision of a given type/seed within a (year, week) is unique.
function makeId(prefix: string, seed: string, world: WorldState): string {
  return `${prefix}-${seed}-y${world.year ?? 0}-w${world.week ?? 0}`;
}

/**
 * Evaluate world state and return any new pending decisions as a StateImpact.
 * Non-blocking decisions are appended; blocking decisions set `world.pendingCrisis`.
 */
export function evaluatePendingDecisions(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluatePendingDecisions");
  const currentWeek = world.week ?? 1;
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;

  const existing = world.pendingDecisions ?? [];
  const newDecisions: LoopDecision[] = [];

  // Decision 1: Pre-basho readiness (BLOCKING)
  if (world.cyclePhase === "pre_basho" && playerHeya) {
    const atRisk = (playerHeya.rikishiIds ?? []).filter((id) => {
      const r = world.rikishi.get(id);
      return !!r && (((r.fatigue ?? 0) > 60) || r.injured === true);
    });
    if (atRisk.length > 0 && !existing.some((d) => d.type === "pre_basho_readiness")) {
      newDecisions.push({
        id: makeId("prebasho", world.seed, world),
        type: "pre_basho_readiness",
        description: `${atRisk.length} wrestler(s) enter the basho fatigued or injured. Rest them or push for rank?`,
        deadlineWeek: currentWeek + 1,
        required: true,
        options: [
          { id: "rest", label: "Rest At-Risk Wrestlers", impact: "Lower injury risk; some lost conditioning (-momentum)." },
          { id: "push", label: "Push For Rank", impact: "Keep conditioning; accept the injury risk." },
        ],
      });
    }
  }

  // Decision 2: Insolvency response (BLOCKING)
  if (playerHeya && (playerHeya.runwayBand === "critical" || playerHeya.runwayBand === "desperate")
      && !existing.some((d) => d.type === "insolvency_response")) {
    newDecisions.push({
      id: makeId("insolvency", world.seed, world),
      type: "insolvency_response",
      description: `Stable finances are ${playerHeya.runwayBand}. Choose a response:`,
      deadlineWeek: currentWeek + 1,
      required: true,
      options: [
        { id: "loan", label: "Take Emergency Loan", impact: "Cash now; monthly debt repayments." },
        { id: "austerity", label: "Austerity Diet", impact: "Cut costs; raises welfare risk." },
      ],
    });
  }

  // Decision 3: Weekly training emphasis (QUEUE)
  if (world.cyclePhase === "interim" && playerHeya && world.trainingState?.get(playerHeya.id)
      && !existing.some((d) => d.type === "weekly_training_emphasis")) {
    newDecisions.push({
      id: makeId("training", world.seed, world),
      type: "weekly_training_emphasis",
      description: "Set this week's training emphasis:",
      deadlineWeek: currentWeek + 1,
      required: false,
      options: [
        { id: "intensive", label: "Intensive", impact: "Faster gains; more fatigue and injury risk." },
        { id: "conservative", label: "Conservative", impact: "Slower gains; safer." },
      ],
    });
  }

  // Decision 4: Welfare diet (QUEUE)
  if (playerHeya && (playerHeya.welfareState?.welfareRisk ?? 0) > 60
      && !existing.some((d) => d.type === "welfare_diet")) {
    newDecisions.push({
      id: makeId("welfare", world.seed, world),
      type: "welfare_diet",
      description: `Welfare risk is high (${playerHeya.welfareState?.welfareRisk}). Adjust the diet?`,
      deadlineWeek: currentWeek + 1,
      required: false,
      options: [
        { id: "premium", label: "Premium Diet", impact: "Lowers welfare risk; higher cost." },
        { id: "maintenance", label: "Maintenance Diet", impact: "Cheaper; risk persists." },
      ],
    });
  }

  // Append new decisions to existing
  if (newDecisions.length > 0) {
    builder.updateWorldField("pendingDecisions", [...existing, ...newDecisions]);
  }

  // If any blocking (required) decision exists, set a pending crisis so Dashboard blocks
  const blocking = [...existing, ...newDecisions].filter((d) => d.required);
  if (blocking.length > 0 && !world.pendingCrisis) {
    const first = blocking[0];
    builder.updateWorldField("pendingCrisis", {
      id: first.id,
      type: "loop_decision",
      title: first.description,
      description: first.description,
      options: first.options.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.impact,
        impactGenerator: () => createImpactBuilder("loopDecision").build(),
      })),
    } as never);
  }

  return builder.build();
}

/**
 * Resolve a loop decision by ID with a chosen option.
 * Returns StateImpact that updates the world accordingly.
 */
export function resolveLoopDecision(
  world: WorldState,
  decisionId: string,
  optionId: string
): StateImpact {
  const builder = createImpactBuilder("resolveLoopDecision");
  const decisions = world.pendingDecisions ?? [];
  const decision = decisions.find((d) => d.id === decisionId);

  if (!decision) return builder.build();

  // Remove the resolved decision
  const remaining = decisions.filter((d) => d.id !== decisionId);
  builder.updateWorldField("pendingDecisions", remaining);

  // Clear pendingCrisis if this was the blocking decision
  if (world.pendingCrisis?.id === decisionId) {
    builder.updateWorldField("pendingCrisis", undefined as never);
  }

  // Apply option-specific effects (simplified)
  if (decision.type === "training_regime") {
    // Deterministic regime flag consumed by phase01_week_training.
    builder.updateWorldField("transientContext", {
      ...world.transientContext,
      trainingRegime: optionId, // "power_focus" | "technique_focus" | "balanced"
    } as never);
  }

  if (decision.type === "recruit_or_develop") {
    if (optionId === "train_current") {
      // Apply +5% growth buff to all player rikishi (stored in transientContext)
      builder.updateWorldField("transientContext", {
        ...world.transientContext,
        trainingGrowthBuff: 1.05,
      } as never);
    } else if (optionId === "scout_youth" || optionId === "recruit_veteran") {
      // Flag a recruitment intent the recruitment phase can act on next tick.
      builder.updateWorldField("transientContext", {
        ...world.transientContext,
        recruitmentIntent: optionId,
      } as never);
    }
  }

  if (decision.type === "ozeki_promotion" && optionId === "petition") {
    // 80% success chance
    const rng = rngFromSeed(`loop_ozeki_${world.seed}_${decisionId}`, "loop", "petition");
    const success = rng.next() < 0.8;
    if (success) {
      // Find the rikishi and promote
      const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
      if (heya) {
        for (const rid of heya.rikishiIds ?? []) {
          const r = world.rikishi.get(rid);
          if (r && r.rank === "sekiwake") {
            builder.updateRikishi(rid, { rank: "ozeki" as never });
            break;
          }
        }
      }
    } else {
      // Denied: -5 mental to the candidate
      const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
      if (heya) {
        for (const rid of heya.rikishiIds ?? []) {
          const r = world.rikishi.get(rid);
          if (r && r.rank === "sekiwake") {
            builder.updateRikishi(rid, {
              stats: { ...r.stats, mental: Math.max(0, r.stats.mental - 5) },
            });
            break;
          }
        }
      }
    }
  }

  return builder.build();
}

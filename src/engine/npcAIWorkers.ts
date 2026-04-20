/**
 * npcAIWorkers.ts
 * =================
 * Worker logic for NPC AI decision making.
 */

import type { WorldState } from "./types/world";
import type { Id } from "./types/common";
import { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "./types/training";
import { getRikishi } from "./queries";
import {
  decideTrainingIntensity,
  decideTrainingFocus,
  decideRecovery,
  decideScoutingPriority,
  identifyProtects,
  type TrainingIntensityResult,
  type TrainingFocusResult,
  type RecoveryResult,
  type ScoutingPriorityResult,
  type ProtectResult,
} from "./strategy/NPCStrategyService";
import { PerceptionSnapshot, RikishiPerception } from "./perception";
import { OyakataStyleProfile, RecruitmentPhilosophy } from "./oyakataStylePreferences";
import { OyakataMood } from "./types/oyakata";
import { Style } from "./types/combat";

export interface TrainingWorkerContext {
  perception: PerceptionSnapshot;
  riskAppetite: number;
  welfareDiscipline: number;
  mood: OyakataMood;
  complianceCap?: TrainingIntensity;
  philosophy?: RecruitmentPhilosophy;
  styleBias?: Style | "neutral";
  tradition: number;
}

export interface TrainingWorkerResult {
  trainingIntensity: TrainingIntensity;
  trainingFocus: TrainingFocus;
  recovery: RecoveryEmphasis;
  reasoning: string[];
}

export interface ScoutingWorkerContext {
  runwayBand: string;
  rosterSize: number;
  rosterStrengthBand: string;
  ambition: number;
  hasSleeperScout: boolean;
}

export interface ScoutingWorkerResult {
  priority: "none" | "passive" | "active" | "aggressive";
  reason: string;
}

export interface PersonnelWorkerContext {
  rikishiPerceptions: RikishiPerception[];
  welfareDiscipline: number;
  styleProfile?: OyakataStyleProfile;
  world: WorldState;
}

export interface PersonnelWorkerResult {
  protectIds: Id[];
  individualProtects: Id[];
  individualDevelops: Id[];
  individualPushes: Id[];
  withdrawalIds: Id[];
  reasoning: string[];
}

/**
 * Worker: Training Sub-Agent
 */
export function spawnTrainingWorker(ctx: TrainingWorkerContext): TrainingWorkerResult {
  const intensity: TrainingIntensityResult = decideTrainingIntensity(
    ctx.perception,
    ctx.riskAppetite,
    ctx.welfareDiscipline,
    ctx.mood,
    ctx.complianceCap,
    ctx.philosophy
  );
  const focus: TrainingFocusResult = decideTrainingFocus(
    ctx.perception,
    ctx.styleBias,
    ctx.tradition,
    ctx.philosophy
  );
  const recovery: RecoveryResult = decideRecovery(ctx.perception, ctx.welfareDiscipline);

  return {
    trainingIntensity: intensity.intensity,
    trainingFocus: focus.focus,
    recovery: recovery.recovery,
    reasoning: [
      `[Training Worker] ${intensity.reason}`,
      `[Focus Worker] ${focus.reason}`,
      `[Recovery Worker] ${recovery.reason}`,
    ],
  };
}

/**
 * Worker: Scouting Sub-Agent
 */
export function spawnScoutingWorker(ctx: ScoutingWorkerContext): ScoutingWorkerResult {
  const decision: ScoutingPriorityResult = decideScoutingPriority(
    {
      runwayBand: ctx.runwayBand,
      rosterSize: ctx.rosterSize,
      rosterStrengthBand: ctx.rosterStrengthBand,
    },
    ctx.ambition,
    ctx.hasSleeperScout
  );
  return {
    priority: decision.priority,
    reason: `[Scouting Worker] ${decision.reason}`,
  };
}

/**
 * Worker: Personnel Sub-Agent
 */
export function spawnPersonnelWorker(ctx: PersonnelWorkerContext): PersonnelWorkerResult {
  const reasoning: string[] = [];
  const protectDecision: ProtectResult = identifyProtects(ctx, ctx.welfareDiscipline);
  if (protectDecision.protectIds.length > 0) {
    reasoning.push(`[Personnel Worker] ${protectDecision.reason}`);
  }

  // Withdrawal decisions for injured rikishi
  const withdrawalIds: Id[] = [];
  for (const rp of ctx.rikishiPerceptions) {
    const rikishi = getRikishi(ctx.world, rp.rikishiId);
    if (!rikishi) continue;

    // Check if rikishi should be withdrawn (kyujo)
    if (rikishi.injured && !rikishi.isKyujo) {
      const severity = rikishi.injuryStatus?.severity;
      const weeksRemaining = rikishi.injuryWeeksRemaining;

      // Withdraw if injury is serious and recovery time is long
      if (severity === "serious" && weeksRemaining > 2) {
        withdrawalIds.push(rikishi.id);
        reasoning.push(
          `[Withdrawal Worker] Withdrawing ${rikishi.shikona} due to ${severity} injury (${weeksRemaining} weeks remaining)`
        );
      }
    }
  }

  const individualDevelops: Id[] = [];
  const individualPushes: Id[] = [];
  const protectedSet = new Set(protectDecision.protectIds);

  if (ctx.styleProfile && ctx.rikishiPerceptions.length > 0) {
    for (const rp of ctx.rikishiPerceptions) {
      if (protectedSet.has(rp.rikishiId)) continue;
      const rikishi = getRikishi(ctx.world, rp.rikishiId);
      if (!rikishi) continue;

      const matchesStyle =
        ctx.styleProfile.preferredStyle === "any" ||
        rikishi.style === ctx.styleProfile.preferredStyle;
      const matchesArchetype =
        rikishi.archetype &&
        (ctx.styleProfile.preferredArchetypes as string[]).includes(rikishi.archetype);

      if (matchesArchetype && matchesStyle) {
        if (
          (rp.healthBand === "peak" || rp.healthBand === "good") &&
          (ctx.styleProfile.philosophy === "style_purist" ||
            ctx.styleProfile.philosophy === "size_matters")
        ) {
          individualPushes.push(rp.rikishiId);
        } else if (rp.healthBand === "peak" || rp.healthBand === "good") {
          individualDevelops.push(rp.rikishiId);
        }
      } else if (matchesArchetype || matchesStyle) {
        individualDevelops.push(rp.rikishiId);
      }
    }
    individualPushes.splice(3);
    individualDevelops.splice(5);

    if (individualPushes.length > 0) {
      reasoning.push(`[Personnel Worker] Philosophy push: ${individualPushes.length} wrestlers`);
    }
  }

  return {
    protectIds: protectDecision.protectIds,
    individualProtects: protectDecision.protectIds,
    individualDevelops,
    individualPushes,
    withdrawalIds,
    reasoning,
  };
}

/**
 * Helper: Isolated perception view
 */
export function rpPerception(p: PerceptionSnapshot) {
  return {
    rikishiPerceptions: p.rikishiPerceptions,
    welfareRiskBand: p.welfareRiskBand,
    rosterSize: p.rosterSize,
    moraleBand: p.moraleBand,
    rosterStrengthBand: p.rosterStrengthBand,
  };
}

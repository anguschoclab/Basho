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
import { destr } from "destr";
import { OyakataStyleProfile, RecruitmentPhilosophy } from "./oyakataStylePreferences";
import { OyakataMood } from "./types/oyakata";
import { Style } from "./types/combat";
import { RNGRegistry } from "./core/RNGRegistry";

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
  pendingExhibitions?: any[]; // To avoid circular import, use any or imported type
  riskTolerance?: number; // oyakata.traits.risk (0-100)
}

export interface GlobalWorkerContext {
  heyaId: Id;
  ambition: number;
  riskAppetite: number;
  perception: PerceptionSnapshot;
  pendingExhibitions: any[];
  world: WorldState;
}

export interface GlobalWorkerResult {
  acceptedExhibitionId?: string;
  rikishiId?: string;
  reasoning: string[];
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

      const isSerious = severity === "serious" && weeksRemaining > 2;
      const isModerate = severity === "moderate" && weeksRemaining > 1;
      const riskTolerance = ctx.riskTolerance ?? 50;

      // Serious injuries always withdraw; moderate is probabilistic based on oyakata risk tolerance
      const withdrawRng = RNGRegistry.getSystemRNG(
        ctx.world,
        "npcPersonnel",
        `withdraw::${rikishi.id}::${ctx.world.week}`
      );
      if (isSerious || (isModerate && withdrawRng.next() > riskTolerance / 100)) {
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
 * Worker: Global Sub-Agent (World Circuit)
 */
export function spawnGlobalWorker(ctx: GlobalWorkerContext): GlobalWorkerResult {
  const reasoning: string[] = [];
  const invitations = ctx.pendingExhibitions.filter((i) => i.heyaId === ctx.heyaId);

  if (invitations.length === 0) {
    return { reasoning };
  }

  // Pick the best invitation based on prestige AND style alignment (Style Drift)
  const sortedInvitations = invitations.sort((a, b) => {
    let scoreA = a.prestige;
    let scoreB = b.prestige;

    // Style Drift awareness: prefer regions that match our styleBias
    if (ctx.styleBias && ctx.styleBias !== "neutral") {
      if (a.dominantStyle === ctx.styleBias) scoreA += 20;
      if (b.dominantStyle === ctx.styleBias) scoreB += 20;
    }

    return scoreB - scoreA;
  });

  const invitation = sortedInvitations[0];

  // Evaluate if we have a suitable rikishi
  const candidates = ctx.perception.rikishiPerceptions
    .map((rp) => getRikishi(ctx.world, rp.rikishiId))
    .filter((r) => r && !r.isRetired && !r.injured && !r.isKyujo);

  if (candidates.length === 0) {
    reasoning.push(`[Global Worker] No healthy rikishi available for exhibition.`);
    return { reasoning };
  }

  // NPC accepts if ambition is high enough relative to prestige,
  // or if they have a rikishi who meets the rank requirement.
  const bestRikishi = candidates.sort((a, b) => (b.power || 0) - (a.power || 0))[0];

  let rankMet = true;
  if (invitation.requiresRank) {
    const ranks = [
      "jonokuchi",
      "jonidan",
      "sandanme",
      "makushita",
      "juryo",
      "maegashira",
      "komusubi",
      "sekiwake",
      "ozeki",
      "yokozuna",
    ];
    const reqIdx = ranks.indexOf(invitation.requiresRank.toLowerCase());
    const hasIdx = ranks.indexOf((bestRikishi.rank || "maegashira").toLowerCase());
    rankMet = hasIdx >= reqIdx;
  }

  if (rankMet && (ctx.ambition > 40 || invitation.prestige > 50)) {
    reasoning.push(
      `[Global Worker] Accepting ${invitation.region} exhibition for ${bestRikishi.shikona} (Style Match: ${invitation.dominantStyle === ctx.styleBias})`
    );
    return {
      acceptedExhibitionId: invitation.id,
      rikishiId: bestRikishi.id,
      reasoning,
    };
  }

  reasoning.push(
    `[Global Worker] Declined exhibitions due to lack of suitable candidates or low priority.`
  );
  return { reasoning };
}

/**
 * Helper: Isolated perception view
 */
export function rpPerception(p: PerceptionSnapshot) {
  // Deep clone or filter to ensure absolute isolation from WorldState
  return destr(
    JSON.stringify({
      rikishiPerceptions: p.rikishiPerceptions,
      welfareRiskBand: p.welfareRiskBand,
      rosterSize: p.rosterSize,
      moraleBand: p.moraleBand,
      rosterStrengthBand: p.rosterStrengthBand,
      runwayBand: p.runwayBand,
    })
  );
}

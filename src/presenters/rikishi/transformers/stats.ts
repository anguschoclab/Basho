/**
 * Stats Transformer
 * =================
 * Transforms rikishi stats, bands, and perceived stats.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import { SeededRNG } from "@/engine/core/rng";
import { NarrativeService } from "@/engine/narrative/NarrativeService";
import { getCareerPhase } from "@/engine/training/TrainingMath";
import type {
  RikishiStatusDTO,
  RikishiBandsDTO,
  RikishiPerceivedStatsDTO,
  RikishiDescriptorDTO,
} from "@/presenters/rikishi/types";
import { toRikishiDescriptor } from "@/engine/narrative/descriptorBands";
import { calculateInjurySummary } from "@/presenters/rikishi/transformers/injury";

/**
 * Transform status fields (injury, condition, etc.)
 */
export function toStatusDTO(r: Rikishi, rng: SeededRNG, world?: WorldState): RikishiStatusDTO {
  const heya = world?.heyas.get(r.heyaId);
  const focus = world?.trainingState
    ?.get(r.heyaId)
    ?.focusSlots?.find((f) => f.rikishiId === r.id)?.focusType;
  return {
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary: calculateInjurySummary(rng, r),
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
    councilWarnings: r.councilWarnings ?? 0,
    loyaltyBand: r.agency?.loyaltyBand,
    diet: r.diet ?? heya?.welfareState?.activeDiet,
    effortLevel: r.effortLevel,
    trainingFocus: focus,
  };
}

/**
 * Transform stat bands.
 */
export function toBandsDTO(r: Rikishi, rng: SeededRNG, world?: WorldState): RikishiBandsDTO {
  const age = world ? world.year - r.birthYear : 0;
  return {
    powerBand: NarrativeService.getStatLabelForValue(rng, r.stats.power),
    techniqueBand: NarrativeService.getStatLabelForValue(rng, r.stats.technique),
    speedBand: NarrativeService.getStatLabelForValue(rng, r.stats.speed),
    balanceBand: NarrativeService.getStatLabelForValue(rng, r.stats.balance),
    momentum: r.momentum,
    careerPhase: getCareerPhase(r.stats.experience),
    ageBand: NarrativeService.getAgeBand(age),
    weightBand: NarrativeService.getWeightBand(r.weight ?? 0),
    heightBand: NarrativeService.getHeightBand(r.height ?? 0),
  };
}

/**
 * Transform perceived stats (UI labels).
 */
export function toPerceivedStatsDTO(r: Rikishi, rng: SeededRNG): RikishiPerceivedStatsDTO {
  return {
    strength: NarrativeService.getStatLabelForValue(rng, r.stats?.power),
    technique: NarrativeService.getStatLabelForValue(rng, r.stats?.technique),
    speed: NarrativeService.getStatLabelForValue(rng, r.stats?.speed),
    stamina: NarrativeService.getStatLabelForValue(rng, r.stats?.stamina),
    mental: NarrativeService.getStatLabelForValue(rng, r.stats?.mental),
    adaptability: NarrativeService.getStatLabelForValue(rng, r.stats?.adaptability),
    balance: NarrativeService.getStatLabelForValue(rng, r.stats?.balance),
  };
}

/** Alias for backward compatibility with monolith */
export const calculatePerceivedStats = toPerceivedStatsDTO;

/**
 * Transform descriptors and potential bands.
 */
export function toDescriptorDTO(
  r: Rikishi,
  rng: SeededRNG,
  world?: WorldState
): RikishiDescriptorDTO {
  const age = world ? world.year - r.birthYear : 0;
  return {
    descriptor: toRikishiDescriptor(rng, r, r.descriptor),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed ?? 50),
    // Engine condition/motivation are 0-100; the descriptor bands are 0-1.
    conditionDescriptor: NarrativeService.getConditionDescriptor(rng, (r.condition ?? 50) / 100)
      .label,
    moraleDescriptor: NarrativeService.getMoraleDescriptor(rng, (r.motivation ?? 50) / 100).label,
    potentialDescriptor: NarrativeService.getPotentialDescriptor(rng, r.talentSeed ?? 50).label,
    ageDescriptor: NarrativeService.getAgeLabel(rng, NarrativeService.getAgeBand(age)),
    weightDescriptor: NarrativeService.getWeightLabel(
      rng,
      NarrativeService.getWeightBand(r.weight ?? 0)
    ),
    heightDescriptor: NarrativeService.getHeightLabel(
      rng,
      NarrativeService.getHeightBand(r.height ?? 0)
    ),
  };
}

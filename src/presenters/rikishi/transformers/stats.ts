/**
 * Stats Transformer
 * =================
 * Transforms rikishi stats, bands, and perceived stats.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { WorldState } from "../../../engine/types/world";
import { SeededRNG } from "../../../engine/rng";
import { NarrativeService } from "../../../engine/systems/narrative/NarrativeService";
import { getCareerPhase } from "../../../engine/systems/training/TrainingMath";
import type {
  RikishiStatusDTO,
  RikishiBandsDTO,
  RikishiPerceivedStatsDTO,
  RikishiDescriptorDTO,
} from "../types";
import { toRikishiDescriptor } from "../../../engine/descriptorBands";
import { calculateInjurySummary } from "./injury";

/**
 * Transform status fields (injury, condition, etc.)
 */
export function toStatusDTO(r: Rikishi, rng: SeededRNG): RikishiStatusDTO {
  return {
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary: calculateInjurySummary(rng, r),
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
    councilWarnings: r.councilWarnings ?? 0,
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
export function toDescriptorDTO(r: Rikishi, rng: SeededRNG, world?: WorldState): RikishiDescriptorDTO {
  const age = world ? world.year - r.birthYear : 0;
  return {
    descriptor: toRikishiDescriptor(rng, r, r.descriptor),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed ?? 50),
    conditionDescriptor: NarrativeService.getConditionDescriptor(rng, r.condition ?? 0.5).label,
    moraleDescriptor: NarrativeService.getMoraleDescriptor(rng, r.motivation ?? 0.5).label,
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

/**
 * src/engine/systems/training/TrainingMath.ts
 * ===========================================
 * Pure simulation math for Rikishi development.
 * 
 * Contains deterministic algorithms for:
 * 1. Talent Ceilings
 * 2. Diminishing Returns
 * 3. Fatigue & Growth Vectors
 * 
 * Goal: Decouple business rules from state management.
 */

import type { Rikishi, RikishiStats } from "../../types/rikishi";
import type { Heya } from "../../types/heya";
import type { WorldState, ActiveModifiers } from "../../types/world";
import type {
  TrainingProfile,
  IndividualFocus,
} from "../../types/training";
import type { RikishiArchetype } from "../../types/combat";
import { 
  INTENSITY_MULTIPLIERS, 
  RECOVERY_MULTIPLIERS, 
  FOCUS_BIAS_MATRIX, 
  ARCHETYPE_AFFINITY, 
  INDIVIDUAL_FOCUS_MODES, 
  PHASE_EFFECTS,
  STAT_CEILING_KEYS,
  type TrainingAttribute
} from "./TrainingConstants";

/**
 * Derives the stat ceiling for a given attribute from talentSeed.
 * talentSeed 0-100 maps to a ceiling of ~45-99.
 */
export function getStatCeiling(talentSeed: number, statKey: keyof RikishiStats): number {
  const baseCeiling = 45 + (talentSeed / 100) * 54;
  const idx = STAT_CEILING_KEYS.indexOf(statKey);
  const offset = idx >= 0 ? ((idx * 7) % 5) - 2 : 0; 
  return Math.min(99, Math.max(30, Math.round(baseCeiling + offset)));
}

/**
 * cubic diminishing returns for smooth capping.
 */
export function diminishingReturnsMult(currentStat: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  const ratio = Math.min(currentStat / ceiling, 1);
  return Math.max(0, 1 - ratio * ratio * ratio);
}

/**
 * Determine career phase based on experience.
 */
export function getCareerPhase(experience: number): keyof typeof PHASE_EFFECTS {
  if (experience < 30) return "rookie";
  if (experience < 70) return "prime";
  if (experience < 90) return "veteran";
  return "twilight";
}

/**
 * Logic for daily/weekly fatigue shifts.
 */
export function calculateFatigueDelta(
  profile: TrainingProfile, 
  focus: IndividualFocus | undefined,
): number {
  const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].fatigue;
  const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].fatigue : 1.0;
  const recoveryMult = RECOVERY_MULTIPLIERS[profile.recovery].fatigueDecay;
  
  const BASE_FATIGUE_GAIN = 10;
  const BASE_RECOVERY = 8;

  const gain = BASE_FATIGUE_GAIN * intensityMult * focusModeMult;
  const decay = BASE_RECOVERY * recoveryMult;

  return Math.floor(gain - decay);
}

/**
 * Authoritative growth vector calculation per Basho Constitution.
 */
export function calculateGrowthVector(
  profile: TrainingProfile,
  focus: IndividualFocus | undefined,
  rikishi: Rikishi,
  heya?: Heya,
  world?: WorldState
): Record<TrainingAttribute, number> {

  const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].growth;
  const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].growth : 1.0;
  const bias = FOCUS_BIAS_MATRIX[profile.focus];

  const phase = getCareerPhase(rikishi.experience);
  const phaseMult = PHASE_EFFECTS[phase].growthMult;

  // Stability check for heya facilities
  const trainingFacility = heya?.facilities?.training ?? 50;
  const facilityGrowthMult = 0.85 + (Math.min(100, Math.max(0, trainingFacility)) / 100) * 0.35;

  const nutritionFacility = heya?.facilities?.nutrition ?? 50;
  const nutritionMult = 0.92 + (Math.min(100, Math.max(0, nutritionFacility)) / 100) * 0.16;

  const BASE_GROWTH = 0.5; 

  // Ichimon / Degeiko Political Bonus
  let degeikoMult = 1.0;
  if (heya && heya.ichimon && world?.factions) {
    const faction = world.factions[heya.ichimon] as any;
    if (faction) {
        // Simple dominant faction check (simplified for performance)
        if (faction.influence >= 80) degeikoMult = 1.10;
    }
  }

  const totalMult = intensityMult * focusModeMult * phaseMult * facilityGrowthMult * degeikoMult * BASE_GROWTH;

  const talentSeed = rikishi.talentSeed ?? 50;
  const archetype = rikishi.derivedArchetype as RikishiArchetype;
  const affinity = archetype ? ARCHETYPE_AFFINITY[archetype] : null;

  const growth: Record<TrainingAttribute, number> = {
    strength: 0, speed: 0, technique: 0, balance: 0,
    weight: 0, stamina: 0, mental: 0, adaptability: 0
  };

  const applyCapped = (stat: keyof RikishiStats, rawMult: number, currentVal: number) => {
    const ceiling = getStatCeiling(talentSeed, stat);
    const drMult = diminishingReturnsMult(currentVal, ceiling);
    const affinityMult = (affinity && (affinity as any)[stat]) || 1.0;
    return totalMult * rawMult * drMult * affinityMult;
  };

  growth.strength = applyCapped('strength', bias.strength, rikishi.stats?.strength || 50) * nutritionMult;
  growth.speed = applyCapped('speed', bias.speed, rikishi.stats?.speed || 50);
  growth.technique = applyCapped('technique', bias.technique, rikishi.stats?.technique || 50);
  growth.balance = applyCapped('balance', bias.balance, rikishi.stats?.balance || 50);
  growth.stamina = applyCapped('stamina', 0.5, rikishi.stats?.stamina || 50) * nutritionMult;
  growth.mental = applyCapped('mental', 0.2, rikishi.stats?.mental || 50);
  growth.adaptability = applyCapped('adaptability', 0.2, rikishi.stats?.adaptability || 50);

  return growth;
}

/**
 * Pipeline-friendly entry point: calculates weekly training gains for a
 * rikishi given an explicit `ActiveModifiers` context from phase02_context.
 *
 * Unlike `calculateGrowthVector`, this function does NOT require a Heya or
 * WorldState reference — the modifier values have already been pre-computed and
 * stored in `activeModifiers`. This satisfies the Anti-Monolith mandate: phase
 * controllers pass modifiers; math functions never reach into world state.
 *
 * @param rikishi        The rikishi to compute gains for.
 * @param activeModifiers Pre-calculated modifier bundle from transientContext.
 * @param profile        The heya's active training profile.
 * @param focus          Optional individual focus slot for this rikishi.
 */
export function calculateGains(
  rikishi: Rikishi,
  activeModifiers: ActiveModifiers,
  profile: TrainingProfile,
  focus?: IndividualFocus,
): Record<TrainingAttribute, number> {
  // Derive base growth without facility/world references
  const base = calculateGrowthVector(profile, focus, rikishi);

  const mult = activeModifiers.trainingMultiplier;
  const result = {} as Record<TrainingAttribute, number>;
  for (const key of Object.keys(base) as TrainingAttribute[]) {
    result[key] = base[key] * mult;
  }
  return result;
}

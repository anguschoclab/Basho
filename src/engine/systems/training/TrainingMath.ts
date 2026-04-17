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
import type { TrainingProfile, IndividualFocus } from "../../types/training";
import type { CombatArchetype } from "../../types/combat";
import {
  INTENSITY_MULTIPLIERS,
  RECOVERY_MULTIPLIERS,
  FOCUS_BIAS_MATRIX,
  ARCHETYPE_AFFINITY,
  INDIVIDUAL_FOCUS_MODES,
  PHASE_EFFECTS,
  STAT_CEILING_KEYS,
  type TrainingAttribute,
} from "./TrainingConstants";
import { ATTRIBUTE_PEAK, STAT_GROUP } from "../../constants/DevelopmentCurves";

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
  focus: IndividualFocus | undefined
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Faction structure is dynamic
    const faction = world.factions[heya.ichimon] as any;
    if (faction) {
      if (faction.influence >= 80) degeikoMult = 1.1;
    }
  }

  // Phase 3 Polish: Stable Rivalry Penalty (Boiling Point)
  // If we have "Bad Blood" with high-ranking stables, training efficacy drops
  if (world?.stableRelations && heya) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stable relations are dynamic
    const relations = world.stableRelations as Record<string, any>;
    for (const [key, record] of Object.entries(relations)) {
      if (key.includes(heya.id) && record.tone === "bad_blood") {
        degeikoMult *= 0.5; // -50% joint training penalty for feud instability
        break;
      }
    }
  }

  // Adaptability multiplier: faster learners absorb training more efficiently
  // range: adaptability=0 → 0.8x, adaptability=50 → 1.0x, adaptability=100 → 1.2x
  const adaptabilityMult = 0.8 + (rikishi.adaptability ?? 50) * 0.004;

  const totalMult =
    intensityMult *
    focusModeMult *
    phaseMult *
    facilityGrowthMult *
    degeikoMult *
    adaptabilityMult *
    BASE_GROWTH;

  const talentSeed = rikishi.talentSeed ?? 50;
  const archetype = rikishi.combatProfile?.archetype as CombatArchetype;
  const affinity = archetype ? ARCHETYPE_AFFINITY[archetype] : null;

  const growth: Record<TrainingAttribute, number> = {
    strength: 0,
    speed: 0,
    technique: 0,
    balance: 0,
    weight: 0,
    stamina: 0,
    mental: 0,
    adaptability: 0,
  };

  // Use PA (potential) as ceiling when present; fall back to talentSeed for legacy/unrolled rikishi.
  const potential = rikishi.potential;
  const resolveCeiling = (stat: keyof RikishiStats): number => {
    if (potential?.stats && stat in potential.stats) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic stat access
      const pa = (potential.stats as any)[stat] as number;
      return Math.round(pa * potential.ceilingFraction);
    }
    return getStatCeiling(talentSeed, stat);
  };

  const applyCapped = (stat: keyof RikishiStats, rawMult: number, currentVal: number) => {
    const ceiling = resolveCeiling(stat);
    const drMult = diminishingReturnsMult(currentVal, ceiling);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic affinity access
    const affinityMult = (affinity && (affinity as any)[stat]) || 1.0;
    return totalMult * rawMult * drMult * affinityMult;
  };

  growth.strength =
    applyCapped("strength", bias.strength, rikishi.stats?.strength || 50) * nutritionMult;
  growth.speed = applyCapped("speed", bias.speed, rikishi.stats?.speed || 50);
  growth.technique = applyCapped("technique", bias.technique, rikishi.stats?.technique || 50);
  growth.balance = applyCapped("balance", bias.balance, rikishi.stats?.balance || 50);
  growth.stamina = applyCapped("stamina", 0.5, rikishi.stats?.stamina || 50) * nutritionMult;
  growth.mental = applyCapped("mental", 0.2, rikishi.stats?.mental || 50);
  growth.adaptability = applyCapped("adaptability", 0.2, rikishi.stats?.adaptability || 50);

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
  focus?: IndividualFocus
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

/**
 * Weekly age-decline deltas (negative numbers) for physical/technical/mental stats.
 * Applied past each attribute group's peak age, scaled by each group's `declinePerYear`.
 * Returns empty/zero deltas for pre-peak rikishi.
 */
export function calculateAgeDecay(
  rikishi: Rikishi,
  currentYear: number
): Record<keyof typeof STAT_GROUP, number> {
  const zero = {
    strength: 0,
    speed: 0,
    stamina: 0,
    technique: 0,
    balance: 0,
    adaptability: 0,
    mental: 0,
  };
  if (!rikishi.birthYear) return zero;
  const age = currentYear - rikishi.birthYear;

  const peakOffset = rikishi.potential?.peakAgeOffset ?? 0;
  const out = { ...zero } as Record<keyof typeof STAT_GROUP, number>;

  (Object.keys(STAT_GROUP) as Array<keyof typeof STAT_GROUP>).forEach((key) => {
    const group = STAT_GROUP[key];
    const cfg = ATTRIBUTE_PEAK[group];
    const effectivePeak = cfg.peakAge + peakOffset;
    if (age <= effectivePeak) return;
    // Convert annual decline into weekly delta applied to the current stat value.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property access
    const current = (rikishi as any)[key] ?? (rikishi.stats as any)?.[key] ?? 50;
    const yearly = current * cfg.declinePerYear;
    out[key] = -yearly / 52;
  });

  return out;
}

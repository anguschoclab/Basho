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
  STAT_CEILING_BASE,
  STAT_CEILING_RANGE,
  MAX_STAT_CEILING,
  MIN_STAT_CEILING,
  STAT_CEILING_OFFSET_MULTIPLIER,
  STAT_CEILING_OFFSET_DIVISOR,
  STAT_CEILING_OFFSET_SUBTRACT,
  ROOKIE_EXPERIENCE_THRESHOLD,
  PRIME_EXPERIENCE_THRESHOLD,
  VETERAN_EXPERIENCE_THRESHOLD,
  BASE_GROWTH,
  DEGEIKO_PENALTY_MULTIPLIER,
  type TrainingAttribute,
} from "../../../constants/engine/training";
import { ATTRIBUTE_PEAK, STAT_GROUP, maturityFactor } from "../../../constants/engine/development";

/**
 * Derives the stat ceiling for a given attribute from talentSeed.
 * talentSeed 0-100 maps to a ceiling of ~45-99.
 */
export function getStatCeiling(talentSeed: number, statKey: keyof RikishiStats): number {
  const baseCeiling = STAT_CEILING_BASE + (talentSeed / 100) * STAT_CEILING_RANGE;
  const idx = STAT_CEILING_KEYS.indexOf(statKey);
  const offset = idx >= 0 ? ((idx * STAT_CEILING_OFFSET_MULTIPLIER) % STAT_CEILING_OFFSET_DIVISOR) - STAT_CEILING_OFFSET_SUBTRACT : 0;
  return Math.min(MAX_STAT_CEILING, Math.max(MIN_STAT_CEILING, Math.round(baseCeiling + offset)));
}

/**
 * Returns the effective stat ceiling, factoring in talentSeed, PA, and age-based maturity.
 */
export function getEffectiveCeiling(
  rikishi: Rikishi,
  stat: keyof RikishiStats,
  world?: WorldState
): number {
  const talentSeed = rikishi.talentSeed ?? 50;
  const potential = rikishi.potential;
  const age = world?.year && rikishi.birthYear ? world.year - rikishi.birthYear : 25;

  let baseCeiling = 0;
  if (potential?.stats && stat in potential.stats) {
    const pa = potential.stats[stat] ?? 0;
    baseCeiling = pa * (potential.ceilingFraction ?? 1.0);
  } else {
    baseCeiling = getStatCeiling(talentSeed, stat);
  }

  const group = STAT_GROUP[stat as keyof typeof STAT_GROUP];
  if (group) {
    const mFactor = maturityFactor({
      age,
      group,
      developmentSpeed: potential?.developmentSpeed ?? 1.0,
      peakAgeOffset: potential?.peakAgeOffset ?? 0,
    });
    return Math.round(baseCeiling * mFactor);
  }

  return Math.round(baseCeiling);
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
  if (experience < ROOKIE_EXPERIENCE_THRESHOLD) return "rookie";
  if (experience < PRIME_EXPERIENCE_THRESHOLD) return "prime";
  if (experience < VETERAN_EXPERIENCE_THRESHOLD) return "veteran";
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

  const BASE_GROWTH_VALUE = BASE_GROWTH;
  let degeikoMult = 1.0;
  if (heya && heya.ichimon) {
    // Basic political influence bonus
    if (world?.factions) {
      const faction = world.factions[heya.ichimon];
      if (faction && faction.influence >= 80) degeikoMult *= 1.1;
    }

    // --- Ichimon Traditions ---
    // Real-world inspired specific training specialties for each clan
    const ICHIMON_GROWTH_BONUSES: Partial<Record<IchimonName, number>> = {
      Dewanoumi: 1.05,
      Isegahama: 1.05,
      Nishonoseki: 1.05,
      Tokitsukaze: 1.05,
      Takasago: 1.05, // Fixed name to match IchimonName type
    };
    const bonus = ICHIMON_GROWTH_BONUSES[heya.ichimon];
    if (bonus) degeikoMult *= bonus;
  }

  // Phase 3 Polish: Stable Rivalry Penalty (Boiling Point)
  // If we have "Bad Blood" with high-ranking stables, training efficacy drops
  if (world?.stableRelations && heya) {
    for (const [key, record] of Object.entries(world.stableRelations)) {
      if (key.includes(heya.id) && record.tone === "bad_blood") {
        degeikoMult *= DEGEIKO_PENALTY_MULTIPLIER;
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
    BASE_GROWTH_VALUE;

  const talentSeed = rikishi.talentSeed ?? 50;
  const archetype = rikishi.combatProfile?.archetype as CombatArchetype;
  const affinity = archetype ? ARCHETYPE_AFFINITY[archetype] : null;

  // Phase 5 Depth: Training Philosophy Drift (Style Drift)
  // Numeric accumulators for cultural influence provide subtle stat gain multipliers
  const philosophy = heya?.trainingPhilosophy;
  const styleDriftMults = {
    strength: 1.0 + (philosophy?.powerBias || 0),
    speed: 1.0 + (philosophy?.speedBias || 0),
    technique: 1.0 + (philosophy?.techniqueBias || 0),
    balance: 1.0,
    stamina: 1.0,
    mental: 1.0,
  };

  // Add Ichimon-specific stat bonuses
  const ICHIMON_STAT_BONUSES: Record<string, Partial<typeof styleDriftMults>> = {
    Dewanoumi: { strength: 0.05 },
    Isegahama: { technique: 0.05, balance: 0.05 },
    Nishonoseki: { speed: 0.05 },
    Tokitsukaze: { stamina: 0.1 },
    Takasago: { mental: 0.1 },
  };

  const statBonus = heya?.ichimon ? ICHIMON_STAT_BONUSES[heya.ichimon] : undefined;
  if (statBonus) {
    Object.assign(styleDriftMults, {
      strength: styleDriftMults.strength + (statBonus.strength || 0),
      speed: styleDriftMults.speed + (statBonus.speed || 0),
      technique: styleDriftMults.technique + (statBonus.technique || 0),
      balance: styleDriftMults.balance + (statBonus.balance || 0),
      stamina: styleDriftMults.stamina + (statBonus.stamina || 0),
      mental: styleDriftMults.mental + (statBonus.mental || 0),
    });
  }

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
  const resolveCeiling = (stat: keyof RikishiStats): number => {
    return getEffectiveCeiling(rikishi, stat, world);
  };

  const applyCapped = (stat: keyof RikishiStats, rawMult: number, currentVal: number) => {
    const ceiling = resolveCeiling(stat);
    const drMult = diminishingReturnsMult(currentVal, ceiling);
    const affinityMult = (affinity?.[stat] as number | undefined) ?? 1.0;
    return totalMult * rawMult * drMult * affinityMult;
  };

  growth.strength =
    applyCapped("strength", bias.strength, rikishi.stats?.strength || 50) *
    nutritionMult *
    styleDriftMults.strength;
  growth.speed =
    applyCapped("speed", bias.speed, rikishi.stats?.speed || 50) * styleDriftMults.speed;
  growth.technique =
    applyCapped("technique", bias.technique, rikishi.stats?.technique || 50) *
    styleDriftMults.technique;
  growth.balance =
    applyCapped("balance", bias.balance, rikishi.stats?.balance || 50) * styleDriftMults.balance;
  growth.stamina =
    applyCapped("stamina", 0.5, rikishi.stats?.stamina || 50) *
    nutritionMult *
    styleDriftMults.stamina;
  growth.mental = applyCapped("mental", 0.2, rikishi.stats?.mental || 50) * styleDriftMults.mental;
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
    const rikishiVal = rikishi[key as keyof Rikishi];
    const current =
      (typeof rikishiVal === "number" ? rikishiVal : undefined) ??
      rikishi.stats?.[key as keyof RikishiStats] ??
      50;
    const yearly = current * cfg.declinePerYear;
    out[key] = -yearly / 52;
  });

  return out;
}

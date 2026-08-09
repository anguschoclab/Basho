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
import type { WorldState, ActiveModifiers, StyleDriftMults } from "../../types/world";
import type { IchimonName } from "../../types/economy";
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
import {
  TRAINING_MULTIPLIERS,
  NUTRITION_MULTIPLIERS,
  MORALE_BOOST_MULTIPLIER,
  FINANCIAL_PENALTY_MULTIPLIER,
} from "../../../constants/engine/multipliers";
import { DEFAULT_FACILITY_LEVEL } from "../../../constants/engine/rikishi";
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
import { clamp } from "../../utils/math";
import { ATTRIBUTE_PEAK, STAT_GROUP, maturityFactor } from "../../../constants/engine/development";

/** Extracted training modifiers from heya/world context. */
export interface TrainingModifiers {
  facilityGrowthMult: number;
  nutritionMult: number;
  degeikoMult: number;
  styleDriftMults: StyleDriftMults;
}

/**
 * Derives the stat ceiling for a given attribute from talentSeed.
 * talentSeed 0-100 maps to a ceiling of ~45-99.
 */
export function getStatCeiling(talentSeed: number, statKey: keyof RikishiStats): number {
  const baseCeiling = STAT_CEILING_BASE + (talentSeed / 100) * STAT_CEILING_RANGE;
  const idx = STAT_CEILING_KEYS.indexOf(statKey);
  const offset =
    idx >= 0
      ? ((idx * STAT_CEILING_OFFSET_MULTIPLIER) % STAT_CEILING_OFFSET_DIVISOR) -
        STAT_CEILING_OFFSET_SUBTRACT
      : 0;
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
    const pa = (potential.stats[stat] as number) ?? 0;
    baseCeiling = pa * (potential.ceilingFraction ?? 1.0);
  } else {
    baseCeiling = getStatCeiling(talentSeed, stat);
  }

  const group = stat in STAT_GROUP ? STAT_GROUP[stat as keyof typeof STAT_GROUP] : undefined;
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
 * Quadratic diminishing returns for smooth capping.
 * Softer than cubic so mid-career growth remains meaningful.
 */
export function diminishingReturnsMult(currentStat: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  const ratio = Math.min(currentStat / ceiling, 1);
  return Math.max(0, 1 - ratio * ratio);
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
/**
 * Clamp every training-profile field to a valid key. A profile can arrive with a
 * missing OR explicitly-`undefined` field (e.g. a partial trainingState persisted by a
 * nested-field update — object spread keeps `intensity: undefined`, which then indexes
 * INTENSITY_MULTIPLIERS as undefined and crashes the tick). Normalizing here, where the
 * authoritative key-maps live, guarantees the training math never throws.
 */
export function normalizeTrainingProfile(profile: TrainingProfile): TrainingProfile {
  const p = (profile ?? {}) as Partial<TrainingProfile>;
  return {
    intensity: p.intensity && INTENSITY_MULTIPLIERS[p.intensity] ? p.intensity : "balanced",
    focus: p.focus && FOCUS_BIAS_MATRIX[p.focus] ? p.focus : "neutral",
    recovery: p.recovery && RECOVERY_MULTIPLIERS[p.recovery] ? p.recovery : "normal",
    styleBias:
      p.styleBias === "oshi" || p.styleBias === "yotsu" || p.styleBias === "neutral"
        ? p.styleBias
        : "neutral",
  };
}

export function calculateFatigueDelta(
  profile: TrainingProfile,
  focus: IndividualFocus | undefined
): number {
  profile = normalizeTrainingProfile(profile);
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
 * Extract heya/world-dependent training modifiers as a pure function.
 * Consolidates facility, nutrition, degeiko (ichimon/faction/rivalry), and style drift
 * (philosophy/ichimon stat bonuses) logic into one place.
 */
export function extractTrainingModifiers(heya?: Heya, world?: WorldState): TrainingModifiers {
  const trainingFacility = heya?.facilities?.training ?? DEFAULT_FACILITY_LEVEL;
  const facilityGrowthMult =
    TRAINING_MULTIPLIERS.BASE +
    (clamp(trainingFacility, 0, 100) / 100) * TRAINING_MULTIPLIERS.RANGE;

  const nutritionFacility = heya?.facilities?.nutrition ?? DEFAULT_FACILITY_LEVEL;
  const nutritionMult =
    NUTRITION_MULTIPLIERS.BASE +
    (clamp(nutritionFacility, 0, 100) / 100) * NUTRITION_MULTIPLIERS.RANGE;

  let degeikoMult = 1.0;
  if (heya && heya.ichimon) {
    if (world?.factions) {
      const faction = world.factions[heya.ichimon];
      if (faction && faction.influence >= 80) degeikoMult *= 1.1;
    }

    const ICHIMON_GROWTH_BONUSES: Partial<Record<IchimonName, number>> = {
      Dewanoumi: 1.05,
      Isegahama: 1.05,
      Nishonoseki: 1.05,
      Tokitsukaze: 1.05,
      Takasago: 1.05,
    };
    const bonus = ICHIMON_GROWTH_BONUSES[heya.ichimon];
    if (bonus) degeikoMult *= bonus;
  }

  if (world?.rivalriesState?.heyaRivalryPairs && heya) {
    for (const pair of Object.values(world.rivalriesState.heyaRivalryPairs)) {
      if ((pair.heyaAId === heya.id || pair.heyaBId === heya.id) && pair.heat >= 80) {
        degeikoMult *= DEGEIKO_PENALTY_MULTIPLIER;
        break;
      }
    }
  }

  const philosophy = heya?.trainingPhilosophy;
  const styleDriftMults: StyleDriftMults = {
    power: 1.0 + (philosophy?.powerBias || 0),
    speed: 1.0 + (philosophy?.speedBias || 0),
    technique: 1.0 + (philosophy?.techniqueBias || 0),
    balance: 1.0,
    stamina: 1.0,
    mental: 1.0,
  };

  const ICHIMON_STAT_BONUSES: Record<string, Partial<StyleDriftMults>> = {
    Dewanoumi: { power: 0.05 },
    Isegahama: { technique: 0.05, balance: 0.05 },
    Nishonoseki: { speed: 0.05 },
    Tokitsukaze: { stamina: 0.1 },
    Takasago: { mental: 0.1 },
  };

  const statBonus = heya?.ichimon ? ICHIMON_STAT_BONUSES[heya.ichimon] : undefined;
  if (statBonus) {
    styleDriftMults.power += statBonus.power || 0;
    styleDriftMults.speed += statBonus.speed || 0;
    styleDriftMults.technique += statBonus.technique || 0;
    styleDriftMults.balance += statBonus.balance || 0;
    styleDriftMults.stamina += statBonus.stamina || 0;
    styleDriftMults.mental += statBonus.mental || 0;
  }

  return { facilityGrowthMult, nutritionMult, degeikoMult, styleDriftMults };
}

/**
 * Core growth calculation using pre-extracted modifiers. No heya/world access.
 * Anti-Monolith: all context-dependent values are passed in via `modifiers`.
 */
export function calculateGrowthWithModifiers(
  profile: TrainingProfile,
  focus: IndividualFocus | undefined,
  rikishi: Rikishi,
  modifiers: TrainingModifiers,
  currentYear: number
): Record<TrainingAttribute, number> {
  profile = normalizeTrainingProfile(profile);
  const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].growth;
  const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].growth : 1.0;
  const bias = FOCUS_BIAS_MATRIX[profile.focus];

  const phase = getCareerPhase(rikishi.stats.experience);
  const phaseMult = PHASE_EFFECTS[phase].growthMult;

  const { facilityGrowthMult, nutritionMult, degeikoMult, styleDriftMults } = modifiers;

  const BASE_GROWTH_VALUE = BASE_GROWTH;

  const adaptabilityMult = 0.8 + (rikishi.stats.adaptability ?? 50) * 0.004;

  const totalMult =
    intensityMult *
    focusModeMult *
    phaseMult *
    facilityGrowthMult *
    degeikoMult *
    adaptabilityMult *
    BASE_GROWTH_VALUE;

  const archetype = rikishi.combatProfile?.archetype as CombatArchetype;
  const affinity = archetype ? ARCHETYPE_AFFINITY[archetype] : null;

  const growth: Record<TrainingAttribute, number> = {
    power: 0,
    speed: 0,
    technique: 0,
    balance: 0,
    weight: 0,
    stamina: 0,
    mental: 0,
    adaptability: 0,
    aggression: 0,
    experience: 0,
  };

  const worldRef = { year: currentYear } as WorldState;
  const resolveCeiling = (stat: keyof RikishiStats): number => {
    return getEffectiveCeiling(rikishi, stat, worldRef);
  };

  const applyCapped = (stat: keyof RikishiStats, rawMult: number, currentVal: number) => {
    const ceiling = resolveCeiling(stat);
    const drMult = diminishingReturnsMult(currentVal, ceiling);
    const affinityMult = (affinity?.[stat] as number | undefined) ?? 1.0;
    return totalMult * rawMult * drMult * affinityMult;
  };

  growth.power =
    applyCapped("power", bias.power, rikishi.stats?.power ?? 50) *
    nutritionMult *
    styleDriftMults.power;
  growth.speed =
    applyCapped("speed", bias.speed, rikishi.stats?.speed ?? 50) * styleDriftMults.speed;
  growth.technique =
    applyCapped("technique", bias.technique, rikishi.stats?.technique ?? 50) *
    styleDriftMults.technique;
  growth.balance =
    applyCapped("balance", bias.balance, rikishi.stats?.balance ?? 50) * styleDriftMults.balance;
  growth.stamina =
    applyCapped("stamina", 0.5, rikishi.stats?.stamina ?? 50) *
    nutritionMult *
    styleDriftMults.stamina;
  growth.mental = applyCapped("mental", 0.2, rikishi.stats?.mental ?? 50) * styleDriftMults.mental;
  growth.adaptability = applyCapped("adaptability", 0.2, rikishi.stats?.adaptability ?? 50);

  return growth;
}

/**
 * Backward-compatible wrapper: extracts modifiers from heya/world, calls core.
 */
export function calculateGrowthVector(
  profile: TrainingProfile,
  focus: IndividualFocus | undefined,
  rikishi: Rikishi,
  heya?: Heya,
  world?: WorldState
): Record<TrainingAttribute, number> {
  const modifiers = extractTrainingModifiers(heya, world);
  return calculateGrowthWithModifiers(
    profile,
    focus,
    rikishi,
    modifiers,
    world?.year ?? DEFAULT_START_YEAR
  );
}

/**
 * Pipeline-friendly entry point: calculates weekly training gains for a
 * rikishi given an explicit `ActiveModifiers` context from phase02_context.
 *
 * Uses the raw modifier components (facilityGrowthMult, nutritionMult, degeikoMult,
 * styleDriftMults) from `activeModifiers` to drive the core growth function,
 * then applies morale boost and financial penalty as a separate context multiplier.
 *
 * @param rikishi        The rikishi to compute gains for.
 * @param activeModifiers Pre-calculated modifier bundle from transientContext.
 * @param profile        The heya's active training profile.
 * @param focus          Optional individual focus slot for this rikishi.
 * @param currentYear    The current simulation year for age-based ceiling calculation.
 */
export function calculateGains(
  rikishi: Rikishi,
  activeModifiers: ActiveModifiers,
  profile: TrainingProfile,
  focus: IndividualFocus | undefined,
  currentYear: number
): Record<TrainingAttribute, number> {
  const modifiers: TrainingModifiers = {
    facilityGrowthMult: activeModifiers.facilityGrowthMult,
    nutritionMult: activeModifiers.nutritionMult,
    degeikoMult: activeModifiers.degeikoMult,
    styleDriftMults: activeModifiers.styleDriftMults,
  };

  const base = calculateGrowthWithModifiers(profile, focus, rikishi, modifiers, currentYear);

  let contextMult = 1.0;
  if (activeModifiers.moraleBoost) contextMult += MORALE_BOOST_MULTIPLIER;
  if (activeModifiers.financialPenalty) contextMult *= FINANCIAL_PENALTY_MULTIPLIER;

  const result = {} as Record<TrainingAttribute, number>;
  for (const key of Object.keys(base) as TrainingAttribute[]) {
    result[key] = base[key] * contextMult;
  }
  return result;
}

/**
 * Reconstructs a display-friendly training multiplier from raw ActiveModifiers components.
 * Used by the UI to show the effective training multiplier including morale/penalty.
 */
export function computeDisplayTrainingMultiplier(am: ActiveModifiers): number {
  let mult = am.facilityGrowthMult;
  if (am.moraleBoost) mult += MORALE_BOOST_MULTIPLIER;
  if (am.financialPenalty) mult *= FINANCIAL_PENALTY_MULTIPLIER;
  return mult;
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
    power: 0,
    speed: 0,
    stamina: 0,
    technique: 0,
    balance: 0,
    adaptability: 0,
    mental: 0,
    aggression: 0,
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
    const current = (rikishi.stats?.[key] as number) ?? 50;
    const yearly = current * cfg.declinePerYear;
    out[key] = -yearly / 52;
  });

  return out;
}

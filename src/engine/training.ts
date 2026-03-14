/**
 * File Name: src/engine/training.ts
 * Status: CANONICAL / IMPLEMENTATION-GRADE
 * * Implements System B (Rikishi Development) from the Basho Constitution.
 * * Key Features:
 * - Deterministic Weekly Tick (10-step algorithm)
 * - Beya-Wide Training Profiles (Intensity, Focus, Style, Recovery)
 * - Individual Focus Slots (Develop, Push, Protect, Rebuild)
 * - Fatigue Accumulation & Injury Risk
 * - Attribute Evolution (Buffered -> Consolidated)
 */

import type { Rikishi, RikishiStats } from "./types/rikishi";
import type { WorldState } from "./types/world";
import type { Id } from "./types/common";
import type { TrainingProfile, BeyaTrainingState, IndividualFocus, TrainingIntensity, TrainingFocus, RecoveryEmphasis, IndividualFocusType } from "./types/training";
import type { Heya } from "./types/heya";
import { rngFromSeed } from './rng';
import { EventBus } from './events';

// Re-export types for UI consumption
export type { TrainingIntensity, TrainingFocus, RecoveryEmphasis, BeyaTrainingState, TrainingProfile } from './types';

// ============================================================================
// CONSTANTS (From Canon v1.3 - Rikishi Development)
// ============================================================================

// 1. INTENSITY EFFECTS
export const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, { growth: number; fatigue: number; injuryRisk: number }> = {
  conservative: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.80 },
  balanced:     { growth: 1.00, fatigue: 1.00, injuryRisk: 1.00 },
  intensive:    { growth: 1.20, fatigue: 1.25, injuryRisk: 1.15 },
  punishing:    { growth: 1.35, fatigue: 1.50, injuryRisk: 1.35 },
};

// Aliases for UI
export const INTENSITY_EFFECTS = INTENSITY_MULTIPLIERS;

// 2. RECOVERY EMPHASIS EFFECTS
export const RECOVERY_MULTIPLIERS: Record<RecoveryEmphasis, { fatigueDecay: number; injuryRecovery: number }> = {
  low:    { fatigueDecay: 0.80, injuryRecovery: 0.85 },
  normal: { fatigueDecay: 1.00, injuryRecovery: 1.00 },
  high:   { fatigueDecay: 1.25, injuryRecovery: 1.20 },
};

export const RECOVERY_EFFECTS = RECOVERY_MULTIPLIERS;

// 3. FOCUS BIAS MATRIX (From Canon Table 4.3)
export const FOCUS_BIAS_MATRIX: Record<TrainingFocus, Record<keyof RikishiStats, number>> = {
  power:     { strength: 1.30, speed: 0.85, technique: 0.95, balance: 0.95, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  speed:     { strength: 0.85, speed: 1.30, technique: 0.95, balance: 0.95, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  technique: { strength: 0.90, speed: 0.90, technique: 1.35, balance: 1.10, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  balance:   { strength: 0.90, speed: 0.95, technique: 1.10, balance: 1.35, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  neutral:   { strength: 1.00, speed: 1.00, technique: 1.00, balance: 1.00, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
};

export const FOCUS_EFFECTS = FOCUS_BIAS_MATRIX;

// 4. INDIVIDUAL FOCUS MODES (From Canon Table 5.2)
const INDIVIDUAL_FOCUS_MODES: Record<IndividualFocusType, { growth: number; fatigue: number; injuryRisk: number }> = {
  develop: { growth: 1.25, fatigue: 1.10, injuryRisk: 1.05 },
  push:    { growth: 1.35, fatigue: 1.20, injuryRisk: 1.20 },
  protect: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.70 },
  rebuild: { growth: 1.10, fatigue: 0.90, injuryRisk: 0.85 },
};

export const PHASE_EFFECTS = {
  rookie: { injurySensitivity: 0.8, growthMult: 1.25 },
  prime: { injurySensitivity: 1.0, growthMult: 1.0 },
  veteran: { injurySensitivity: 1.2, growthMult: 0.65 },
  twilight: { injurySensitivity: 1.5, growthMult: 0.35 }
};

// ============================================================================
// TALENT CEILING SYSTEM
// ============================================================================

/**
 * Derives the stat ceiling for a given attribute from talentSeed.
 * talentSeed 0-100 maps to a ceiling of ~45-99.
 * Each stat gets a slight per-attribute offset so ceilings aren't uniform.
 */
const STAT_CEILING_KEYS: (keyof RikishiStats)[] = [
  'strength', 'speed', 'technique', 'balance', 'stamina', 'mental', 'adaptability'
];

export function getStatCeiling(talentSeed: number, statKey: keyof RikishiStats): number {
  // Base ceiling: linear map from talentSeed
  // talentSeed 0 → ceiling 45, talentSeed 100 → ceiling 99
  const baseCeiling = 45 + (talentSeed / 100) * 54;
  // Small per-stat offset for variety (deterministic by stat index)
  const idx = STAT_CEILING_KEYS.indexOf(statKey);
  const offset = idx >= 0 ? ((idx * 7) % 5) - 2 : 0; // -2 to +2
  return Math.min(99, Math.max(30, Math.round(baseCeiling + offset)));
}

/**
 * Diminishing returns multiplier: as current stat approaches ceiling,
 * growth tapers off smoothly.  Returns 0-1.
 *   ratio = current / ceiling
 *   mult  = (1 - ratio^3)  — cubic falloff gives gentle taper then hard wall
 */
export function diminishingReturnsMult(currentStat: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  const ratio = Math.min(currentStat / ceiling, 1);
  return Math.max(0, 1 - ratio * ratio * ratio);
}

export function getCareerPhase(experience: number): keyof typeof PHASE_EFFECTS {
  if (experience < 30) return "rookie";
  if (experience < 70) return "prime";
  if (experience < 90) return "veteran";
  return "twilight";
}

// ============================================================================
// HELPERS
// ============================================================================

export function ensureHeyaTrainingState(world: WorldState, beyaId: Id): BeyaTrainingState {
  if (!world.trainingState) {
    world.trainingState = {};
  }

  if (!world.trainingState[beyaId]) {
    world.trainingState[beyaId] = {
      beyaId,
      activeProfile: {
        intensity: 'balanced',
        focus: 'neutral',
        styleBias: 'neutral',
        recovery: 'normal'
      },
      focusSlots: []
    };
  }
  return world.trainingState[beyaId];
}

export function getIndividualFocus(rikishiId: Id, beyaState: BeyaTrainingState): IndividualFocus | undefined {
  return beyaState.focusSlots.find(slot => slot.rikishiId === rikishiId);
}

/**
 * Public helper for calculating multipliers (used by injuries.ts)
 */
export function computeTrainingMultipliers(args: {
  rikishi: Rikishi;
  heya?: Heya;
  profile?: TrainingProfile;
  individualMode?: IndividualFocusType | null;
}): { injuryRiskMult: number; injuryRecoveryMult: number; growthMult: number; fatigueMult: number } {
  
  const intensity = args.profile?.intensity || 'balanced';
  const recovery = args.profile?.recovery || 'normal';
  const mode = args.individualMode;

  const intMult = INTENSITY_MULTIPLIERS[intensity];
  const recMult = RECOVERY_MULTIPLIERS[recovery];
  const modeMult = mode ? INDIVIDUAL_FOCUS_MODES[mode] : { growth: 1, fatigue: 1, injuryRisk: 1 };

  return {
    injuryRiskMult: intMult.injuryRisk * modeMult.injuryRisk,
    injuryRecoveryMult: recMult.injuryRecovery,
    growthMult: intMult.growth * modeMult.growth,
    fatigueMult: intMult.fatigue * modeMult.fatigue
  };
}

function calculateFatigueDelta(
  profile: TrainingProfile, 
  focus: IndividualFocus | undefined,
  currentFatigue: number
): number {
  const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].fatigue;
  const focusMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].fatigue : 1.0;
  const recoveryMult = RECOVERY_MULTIPLIERS[profile.recovery].fatigueDecay;
  
  const BASE_FATIGUE_GAIN = 10;
  const BASE_RECOVERY = 8;

  const gain = BASE_FATIGUE_GAIN * intensityMult * focusMult;
  const decay = BASE_RECOVERY * recoveryMult;

  return Math.floor(gain - decay);
}

function calculateGrowthVector(
  profile: TrainingProfile,
  focus: IndividualFocus | undefined,
  rikishi: Rikishi,
  heya?: Heya
): Record<keyof RikishiStats, number> {
  const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].growth;
  const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].growth : 1.0;
  const bias = FOCUS_BIAS_MATRIX[profile.focus];

  // Career phase growth modifier
  const phase = getCareerPhase(rikishi.experience);
  const phaseMult = PHASE_EFFECTS[phase].growthMult;

  // Facility bonus: training facility level 0-100 → 0.85 to 1.20 multiplier
  const trainingFacility = heya?.facilities?.training ?? 50;
  const facilityGrowthMult = 0.85 + (Math.min(100, Math.max(0, trainingFacility)) / 100) * 0.35;

  // Nutrition facility bonus: small additional growth for strength/stamina/weight
  const nutritionFacility = heya?.facilities?.nutrition ?? 50;
  const nutritionMult = 0.92 + (Math.min(100, Math.max(0, nutritionFacility)) / 100) * 0.16;

  const BASE_GROWTH = 0.5; 
  const totalMult = intensityMult * focusModeMult * phaseMult * facilityGrowthMult * BASE_GROWTH;

  const talentSeed = rikishi.talentSeed ?? 50;

  const growth: Record<keyof RikishiStats, number> = {
    strength: 0, speed: 0, technique: 0, balance: 0,
    weight: 0, stamina: 0, mental: 0, adaptability: 0
  };

  // Apply diminishing returns per stat based on talent ceiling
  const applyCapped = (stat: keyof RikishiStats, rawMult: number, currentVal: number) => {
    const ceiling = getStatCeiling(talentSeed, stat);
    const drMult = diminishingReturnsMult(currentVal, ceiling);
    return totalMult * rawMult * drMult;
  };

  growth.strength = applyCapped('strength', bias.strength, rikishi.stats.strength) * nutritionMult;
  growth.speed = applyCapped('speed', bias.speed, rikishi.stats.speed);
  growth.technique = applyCapped('technique', bias.technique, rikishi.stats.technique);
  growth.balance = applyCapped('balance', bias.balance, rikishi.stats.balance);
  growth.stamina = applyCapped('stamina', 0.5, rikishi.stats.stamina) * nutritionMult;
  growth.mental = applyCapped('mental', 0.2, rikishi.stats.mental);
  growth.adaptability = applyCapped('adaptability', 0.2, rikishi.stats.adaptability);

  return growth;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function applyWeeklyTraining(world: WorldState): WorldState {
  const rng = rngFromSeed(world.seed, "training", `week::${world.calendar.currentWeek}`);

  world.rikishi.forEach(rikishi => {
    if (rikishi.isRetired) return;

    const beyaState = ensureHeyaTrainingState(world, rikishi.heyaId);
    const focus = getIndividualFocus(rikishi.id, beyaState);
    const profile = beyaState.activeProfile;

    // 1. Fatigue
    const fatigueDelta = calculateFatigueDelta(profile, focus, rikishi.fatigue || 0);
    rikishi.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) + fatigueDelta));

    // 2. Injury Logic (Handled by external injuries.ts usually, but we keep basic check here if needed)
    // Note: injuries.ts 'rollWeeklyInjury' is the primary source of truth in the new system.
    // We defer to that module for injury CREATION to avoid double jeopardy.
    
    // 3. Growth
    if (!rikishi.injured) {
      const heya = world.heyas.get(rikishi.heyaId);
      const growth = calculateGrowthVector(profile, focus, rikishi, heya);

      const prevPower = Math.floor(rikishi.power);
      rikishi.power = Math.min(100, rikishi.power + growth.strength);
      rikishi.speed = Math.min(100, rikishi.speed + growth.speed);
      rikishi.technique = Math.min(100, rikishi.technique + growth.technique);
      rikishi.balance = Math.min(100, rikishi.balance + growth.balance);
      rikishi.stamina = Math.min(100, rikishi.stamina + growth.stamina);
      rikishi.adaptability = Math.min(100, rikishi.adaptability + growth.adaptability);
      rikishi.experience = Math.min(100, rikishi.experience + (growth.mental * 0.5));

      // Sync UI
      rikishi.stats.strength = Math.floor(rikishi.power);
      rikishi.stats.speed = Math.floor(rikishi.speed);
      rikishi.stats.technique = Math.floor(rikishi.technique);
      rikishi.stats.balance = Math.floor(rikishi.balance);
      rikishi.stats.stamina = Math.floor(rikishi.stamina);
      rikishi.stats.adaptability = Math.floor(rikishi.adaptability);
      rikishi.stats.mental = Math.floor(rikishi.experience);

      // Emit milestone when a stat crosses a 10-point threshold
      const newPower = Math.floor(rikishi.power);
      if (Math.floor(newPower / 10) > Math.floor(prevPower / 10)) {
        EventBus.trainingMilestone(world, rikishi.id, rikishi.heyaId,
          `${rikishi.shikona ?? rikishi.name} training breakthrough`,
          `Shows marked improvement in overall conditioning.`,
          { focus: profile.focus, intensity: profile.intensity }
        );
      }
    }
  });

  return world;
}

// UI Helper functions
export function getIntensityLabel(intensity: TrainingIntensity): string {
  const labels: Record<TrainingIntensity, string> = {
    conservative: "Conservative",
    balanced: "Balanced",
    intensive: "Intensive",
    punishing: "Punishing"
  };
  return labels[intensity] || intensity;
}

export function getFocusLabel(focus: TrainingFocus): string {
  const labels: Record<TrainingFocus, string> = {
    power: "Power",
    speed: "Speed",
    technique: "Technique",
    balance: "Balance",
    neutral: "Neutral"
  };
  return labels[focus] || focus;
}

export function getRecoveryLabel(recovery: RecoveryEmphasis): string {
  const labels: Record<RecoveryEmphasis, string> = {
    low: "Low",
    normal: "Normal",
    high: "High"
  };
  return labels[recovery] || recovery;
}

export function getFocusModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    develop: "Develop",
    push: "Push",
    protect: "Protect",
    rebuild: "Rebuild"
  };
  return labels[mode] || mode;
}

export function createDefaultTrainingState(beyaId: Id): BeyaTrainingState {
  return {
    beyaId,
    activeProfile: {
      intensity: 'balanced',
      focus: 'neutral',
      styleBias: 'neutral',
      recovery: 'normal'
    },
    focusSlots: []
  };
}

// Wrapper for world.ts
export function tickWeek(world: WorldState) {
  applyWeeklyTraining(world);
}

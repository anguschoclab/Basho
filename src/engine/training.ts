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

import type { 
  Rikishi, 
  WorldState, 
  Id, 
  TrainingProfile, 
  BeyaTrainingState, 
  IndividualFocus, 
  TrainingIntensity, 
  TrainingFocus, 
  RecoveryEmphasis,
  IndividualFocusType,
  RikishiStats,
  Heya
} from './types';
import { SeededRNG } from './utils/SeededRNG';

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
  rookie: { injurySensitivity: 0.8 },
  prime: { injurySensitivity: 1.0 },
  veteran: { injurySensitivity: 1.2 },
  twilight: { injurySensitivity: 1.5 }
};

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
  rikishi: Rikishi
): Record<keyof RikishiStats, number> {
  const intensityMult = INTENSITY_MULTIPLIERS[profile.intensity].growth;
  const focusModeMult = focus ? INDIVIDUAL_FOCUS_MODES[focus.focusType].growth : 1.0;
  const bias = FOCUS_BIAS_MATRIX[profile.focus];

  const BASE_GROWTH = 0.5; 

  const growth: Record<keyof RikishiStats, number> = {
    strength: 0,
    speed: 0,
    technique: 0,
    balance: 0,
    weight: 0,
    stamina: 0,
    mental: 0,
    adaptability: 0
  };

  const totalMult = intensityMult * focusModeMult * BASE_GROWTH;

  growth.strength = totalMult * bias.strength;
  growth.speed = totalMult * bias.speed;
  growth.technique = totalMult * bias.technique;
  growth.balance = totalMult * bias.balance;
  growth.stamina = totalMult * 0.5; 
  growth.mental = totalMult * 0.2; 
  growth.adaptability = totalMult * 0.2;

  return growth;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function applyWeeklyTraining(world: WorldState): WorldState {
  const rng = new SeededRNG(world.id + world.calendar.currentWeek);

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
      const growth = calculateGrowthVector(profile, focus, rikishi);

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

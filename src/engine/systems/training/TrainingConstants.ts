/**
 * src/engine/systems/training/TrainingConstants.ts
 * ===============================================
 * Authoritative constants for the Training System.
 *
 * Defines multipliers, bias matrices, and phase effects for rikishi development.
 * Goal: Single source of truth for simulation math.
 */

import type { RikishiStats } from "../../types/rikishi";
import type {
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  IndividualFocusType,
} from "../../types/training";
import type { CombatArchetype } from "../../types/combat";

// 1. INTENSITY EFFECTS
export const INTENSITY_MULTIPLIERS: Record<
  TrainingIntensity,
  { growth: number; fatigue: number; injuryRisk: number }
> = {
  conservative: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.8 },
  balanced: { growth: 1.0, fatigue: 1.0, injuryRisk: 1.0 },
  intensive: { growth: 1.2, fatigue: 1.25, injuryRisk: 1.15 },
  punishing: { growth: 1.35, fatigue: 1.5, injuryRisk: 1.35 },
};

// 2. RECOVERY EMPHASIS EFFECTS
export const RECOVERY_MULTIPLIERS: Record<
  RecoveryEmphasis,
  { fatigueDecay: number; injuryRecovery: number }
> = {
  low: { fatigueDecay: 0.8, injuryRecovery: 0.85 },
  normal: { fatigueDecay: 1.0, injuryRecovery: 1.0 },
  high: { fatigueDecay: 1.25, injuryRecovery: 1.2 },
};

// 3. FOCUS BIAS MATRIX
export type TrainingAttribute = Exclude<keyof RikishiStats, "achievements" | "specialPrizes">;

export const FOCUS_BIAS_MATRIX: Record<TrainingFocus, Record<TrainingAttribute, number>> = {
  power: {
    strength: 1.3,
    speed: 0.85,
    technique: 0.95,
    balance: 0.95,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
  },
  speed: {
    strength: 0.85,
    speed: 1.3,
    technique: 0.95,
    balance: 0.95,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
  },
  technique: {
    strength: 0.9,
    speed: 0.9,
    technique: 1.35,
    balance: 1.1,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
  },
  balance: {
    strength: 0.9,
    speed: 0.95,
    technique: 1.1,
    balance: 1.35,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
  },
  neutral: {
    strength: 1.0,
    speed: 1.0,
    technique: 1.0,
    balance: 1.0,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
  },
};

// 4. ARCHETYPE AFFINITY
export const ARCHETYPE_AFFINITY: Record<
  CombatArchetype,
  Partial<Record<keyof RikishiStats, number>>
> = {
  oshi: { speed: 1.25, mental: 1.15, technique: 0.9, balance: 0.9, stamina: 0.85 },
  yotsu: { weight: 1.3, balance: 1.2, strength: 1.15, technique: 0.85, speed: 0.7 },
  trickster: { speed: 1.2, technique: 1.2, adaptability: 1.2, strength: 0.8, weight: 0.75 },
  speedster: { speed: 1.3, stamina: 1.15, adaptability: 1.1, balance: 1.0, mental: 1.1 },
  hybrid: { strength: 1.05, speed: 1.05, technique: 1.05, balance: 1.05, stamina: 1.05 },
  giant: { weight: 1.35, strength: 1.2, balance: 1.15, speed: 0.65, stamina: 1.1 },
  tsuppari: { speed: 1.2, mental: 1.1, technique: 0.85, stamina: 0.9, balance: 0.85 },
  defensive: { technique: 1.25, balance: 1.2, stamina: 1.1, speed: 0.9, mental: 1.1 },
};

// 5. INDIVIDUAL FOCUS MODES
export const INDIVIDUAL_FOCUS_MODES: Record<
  IndividualFocusType,
  { growth: number; fatigue: number; injuryRisk: number }
> = {
  develop: { growth: 1.25, fatigue: 1.1, injuryRisk: 1.05 },
  push: { growth: 1.35, fatigue: 1.2, injuryRisk: 1.2 },
  protect: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.7 },
  rebuild: { growth: 1.1, fatigue: 0.9, injuryRisk: 0.85 },
};

// 6. PHASE EFFECTS
export const PHASE_EFFECTS = {
  rookie: { injurySensitivity: 0.8, growthMult: 1.25 },
  prime: { injurySensitivity: 1.0, growthMult: 1.0 },
  veteran: { injurySensitivity: 1.2, growthMult: 0.65 },
  twilight: { injurySensitivity: 1.5, growthMult: 0.35 },
};

export const STAT_CEILING_KEYS: (keyof RikishiStats)[] = [
  "strength",
  "speed",
  "technique",
  "balance",
  "stamina",
  "mental",
  "adaptability",
];

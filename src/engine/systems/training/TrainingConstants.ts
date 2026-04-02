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
  IndividualFocusType 
} from "../../types/training";
import type { RikishiArchetype } from "../../types/combat";

// 1. INTENSITY EFFECTS
export const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, { growth: number; fatigue: number; injuryRisk: number }> = {
  conservative: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.80 },
  balanced:     { growth: 1.00, fatigue: 1.00, injuryRisk: 1.00 },
  intensive:    { growth: 1.20, fatigue: 1.25, injuryRisk: 1.15 },
  punishing:    { growth: 1.35, fatigue: 1.50, injuryRisk: 1.35 },
};

// 2. RECOVERY EMPHASIS EFFECTS
export const RECOVERY_MULTIPLIERS: Record<RecoveryEmphasis, { fatigueDecay: number; injuryRecovery: number }> = {
  low:    { fatigueDecay: 0.80, injuryRecovery: 0.85 },
  normal: { fatigueDecay: 1.00, injuryRecovery: 1.00 },
  high:   { fatigueDecay: 1.25, injuryRecovery: 1.20 },
};

// 3. FOCUS BIAS MATRIX
export type TrainingAttribute = Exclude<keyof RikishiStats, 'achievements' | 'specialPrizes'>;

export const FOCUS_BIAS_MATRIX: Record<TrainingFocus, Record<TrainingAttribute, number>> = {
  power:     { strength: 1.30, speed: 0.85, technique: 0.95, balance: 0.95, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  speed:     { strength: 0.85, speed: 1.30, technique: 0.95, balance: 0.95, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  technique: { strength: 0.90, speed: 0.90, technique: 1.35, balance: 1.10, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  balance:   { strength: 0.90, speed: 0.95, technique: 1.10, balance: 1.35, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
  neutral:   { strength: 1.00, speed: 1.00, technique: 1.00, balance: 1.00, weight: 1.0, stamina: 1.0, mental: 1.0, adaptability: 1.0 },
};

// 4. ARCHETYPE AFFINITY
export const ARCHETYPE_AFFINITY: Record<RikishiArchetype, Partial<Record<keyof RikishiStats, number>>> = {
  Explosive_Blitzer: { speed: 1.25, mental: 1.15, technique: 0.9, balance: 0.9, stamina: 0.85 },
  Immovable_Mountain: { weight: 1.30, balance: 1.20, strength: 1.15, technique: 0.85, speed: 0.70 },
  Defensive_Stalwart: { technique: 1.25, balance: 1.20, stamina: 1.10, speed: 0.9, mental: 1.1 },
  Acrobatic_Trickster: { speed: 1.20, technique: 1.20, adaptability: 1.20, strength: 0.8, weight: 0.75 },
  All_Rounder: { strength: 1.05, speed: 1.05, technique: 1.05, balance: 1.05, stamina: 1.05 },
};

// 5. INDIVIDUAL FOCUS MODES
export const INDIVIDUAL_FOCUS_MODES: Record<IndividualFocusType, { growth: number; fatigue: number; injuryRisk: number }> = {
  develop: { growth: 1.25, fatigue: 1.10, injuryRisk: 1.05 },
  push:    { growth: 1.35, fatigue: 1.20, injuryRisk: 1.20 },
  protect: { growth: 0.85, fatigue: 0.75, injuryRisk: 0.70 },
  rebuild: { growth: 1.10, fatigue: 0.90, injuryRisk: 0.85 },
};

// 6. PHASE EFFECTS
export const PHASE_EFFECTS = {
  rookie:   { injurySensitivity: 0.8, growthMult: 1.25 },
  prime:    { injurySensitivity: 1.0, growthMult: 1.0 },
  veteran:  { injurySensitivity: 1.2, growthMult: 0.65 },
  twilight: { injurySensitivity: 1.5, growthMult: 0.35 }
};

export const STAT_CEILING_KEYS: (keyof RikishiStats)[] = [
  'strength', 'speed', 'technique', 'balance', 'stamina', 'mental', 'adaptability'
];

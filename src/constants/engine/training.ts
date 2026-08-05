/**
 * src/engine/systems/training/TrainingConstants.ts
 * ===============================================
 * Authoritative constants for the Training System.
 *
 * Defines multipliers, bias matrices, and phase effects for rikishi development.
 * Goal: Single source of truth for simulation math.
 */

import type { RikishiStats } from "../../engine/types/rikishi";
import type {
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  IndividualFocusType,
} from "../../engine/types/training";
import type { CombatArchetype } from "../../engine/types/combat";

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
    power: 1.3,
    speed: 0.85,
    technique: 0.95,
    balance: 0.95,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
    aggression: 1.0,
    experience: 1.0,
  },
  speed: {
    power: 0.85,
    speed: 1.3,
    technique: 0.95,
    balance: 0.95,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
    aggression: 1.0,
    experience: 1.0,
  },
  technique: {
    power: 0.9,
    speed: 0.9,
    technique: 1.35,
    balance: 1.1,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
    aggression: 1.0,
    experience: 1.0,
  },
  balance: {
    power: 0.9,
    speed: 0.95,
    technique: 1.1,
    balance: 1.35,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
    aggression: 1.0,
    experience: 1.0,
  },
  neutral: {
    power: 1.0,
    speed: 1.0,
    technique: 1.0,
    balance: 1.0,
    weight: 1.0,
    stamina: 1.0,
    mental: 1.0,
    adaptability: 1.0,
    aggression: 1.0,
    experience: 1.0,
  },
};

// 4. ARCHETYPE AFFINITY
export const ARCHETYPE_AFFINITY: Record<
  CombatArchetype,
  Partial<Record<keyof RikishiStats, number>>
> = {
  oshi: { speed: 1.25, mental: 1.15, technique: 0.9, balance: 0.9, stamina: 0.85 },
  yotsu: { weight: 1.3, balance: 1.2, power: 1.15, technique: 0.85, speed: 0.7 },
  trickster: { speed: 1.2, technique: 1.2, adaptability: 1.2, power: 0.8, weight: 0.75 },
  speedster: { speed: 1.3, stamina: 1.15, adaptability: 1.1, balance: 1.0, mental: 1.1 },
  hybrid: { power: 1.05, speed: 1.05, technique: 1.05, balance: 1.05, stamina: 1.05 },
  giant: { weight: 1.35, power: 1.2, balance: 1.15, speed: 0.65, stamina: 1.1 },
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

export const STAT_CEILING_KEYS: (keyof RikishiStats)[] = ["mental", "adaptability"];

// 7. DRILL EFFECTS (P2 Phase O)
// Defines the daily stat deltas for discrete training sessions.
// Applied 6 days a week in TrainingService.
export const DRILL_EFFECTS: Record<
  string, // DrillType
  Partial<RikishiStats> & { fatigue: number }
> = {
  asageiko: {
    power: 0.03,
    speed: 0.03,
    technique: 0.03,
    balance: 0.03,
    stamina: 0.03,
    fatigue: 1.0,
  },
  butsukari: {
    power: 0.25,
    stamina: 0.15,
    weight: 0.1,
    fatigue: 4.5,
  },
  teppo: {
    technique: 0.22,
    power: 0.06,
    speed: 0.04,
    fatigue: 2.5,
  },
  "moushi-ai": {
    power: 0.08,
    speed: 0.08,
    technique: 0.08,
    balance: 0.08,
    mental: 0.15,
    fatigue: 3.8,
  },
  shindo: {
    mental: 0.25,
    fatigue: -2.0,
  },
  shiko: {
    balance: 0.18,
    stamina: 0.12,
    fatigue: 1.5,
  },
  none: {
    fatigue: -1.2,
  },
};

export const DRILL_METADATA: Record<string, { label: string; description: string; color: string }> =
  {
    asageiko: {
      label: "Asageiko",
      description: "Standard morning conditioning. Low risk, balanced maintenance.",
      color: "slate",
    },
    butsukari: {
      label: "Butsukari",
      description: "Intense collision drills. Maximizes Power and Stamina. High fatigue.",
      color: "orange",
    },
    teppo: {
      label: "Teppo",
      description: "Rhythmic palm strikes. Focuses on Technique and explosive Strength.",
      color: "blue",
    },
    "moushi-ai": {
      label: "Moushi-ai",
      description: "Successive sparring. Sharpens overall competence and Mental focus.",
      color: "purple",
    },
    shindo: {
      label: "Shindo / Meditation",
      description: "Mental visualization and rest. Boosts Mental stats and reduces fatigue.",
      color: "emerald",
    },
    shiko: {
      label: "Shiko",
      description: "Ceremonial leg-lift-and-stomp. Builds Balance and Stamina at low fatigue cost.",
      color: "amber",
    },
    none: {
      label: "Rest",
      description: "Full rest day. Maximum fatigue recovery, no stat gains.",
      color: "gray",
    },
  };

/** Experience growth multiplier */
export const EXPERIENCE_GROWTH_MULTIPLIER = 0.5;

/** Crash probability threshold weeks */
export const CRASH_PROBABILITY_THRESHOLD_WEEKS = 3;

/** Maximum crash probability */
export const MAX_CRASH_PROBABILITY = 1.0;

/** Maximum technique bleed from mentor to apprentice per week */
export const MENTORSHIP_MAX_BLEED = 3;

/** Minimum technique gap for mentorship bleed */
export const MENTORSHIP_BLEED_THRESHOLD = 10;

/** Fraction of technique gap that transfers per week */
export const MENTORSHIP_BLEED_SCALE = 0.06;

/** Stat ceiling base value */
export const STAT_CEILING_BASE = 45;

/** Stat ceiling range */
export const STAT_CEILING_RANGE = 54;

/** Maximum stat ceiling */
export const MAX_STAT_CEILING = 99;

/** Minimum stat ceiling */
export const MIN_STAT_CEILING = 30;

/** Stat ceiling offset multiplier */
export const STAT_CEILING_OFFSET_MULTIPLIER = 7;

/** Stat ceiling offset divisor */
export const STAT_CEILING_OFFSET_DIVISOR = 5;

/** Stat ceiling offset subtract */
export const STAT_CEILING_OFFSET_SUBTRACT = 2;

/** Rookie experience threshold */
export const ROOKIE_EXPERIENCE_THRESHOLD = 30;

/** Prime experience threshold */
export const PRIME_EXPERIENCE_THRESHOLD = 70;

/** Veteran experience threshold */
export const VETERAN_EXPERIENCE_THRESHOLD = 90;

/** Base growth value */
export const BASE_GROWTH = 1.1;

/** Degeiko penalty multiplier */
export const DEGEIKO_PENALTY_MULTIPLIER = 0.5;

// Burnout probabilities
export const BURNOUT_PROB_WEEK_1 = 0.15;
export const BURNOUT_PROB_WEEK_2 = 0.35;

// Burnout injury consequences
export const BURNOUT_INJURY_WEEKS = 12;
export const CRASH_STAT_FLOOR = 30;
export const CRASH_STAT_PENALTY = 15;

// Stat floors
export const STAT_FLOOR = 10;
export const DIVISION_FLOOR_MAKUUCHI = 45;
export const DIVISION_FLOOR_JURYO = 40;

// Training milestones
export const TRAINING_MILESTONE_THRESHOLD = 10;

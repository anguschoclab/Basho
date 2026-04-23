/**
 * dynasty.ts
 * ==========
 * Core types for the Legacy Engine and Training Philosophy.
 * (Phase 5: Dynasty & World Circuit)
 */

import type { CombatArchetype } from "./combat";

/** A snapshot of a stable's training identity that persists across Oyakata generations. */
export interface TrainingPhilosophy {
  /** Primary stat group the stable double-downs on in training. */
  focusBias: "power" | "technique" | "speed" | "balanced";
  /** How hard the stable pushes its wrestlers. */
  intensityBias: "grueling" | "moderate" | "scientific";
  /** Where the stable primarily scouts. */
  recruitmentBias: "domestic" | "international" | "prodigy_seeker";
  /** The stable's trademark fighting style — used to bias candidate archetype matching. */
  signatureStyle?: CombatArchetype;

  /** Phase 5 Depth: Drift / Transition state */
  targetFocusBias?: "power" | "technique" | "speed" | "balanced";
  targetIntensityBias?: "grueling" | "moderate" | "scientific";
  transitionProgress?: number; // 0.0 to 1.0

  /** Drift / Cultural Influence accumulators (Phase 5) */
  powerBias?: number;
  techniqueBias?: number;
  speedBias?: number;
}

/** Per-Oyakata era achievements. */
export interface DynastyRecord {
  era: number; // Succession count (1 = founding, 2 = first successor, etc.)
  oyakataId: string;
  oyakataName: string;
  reignFrom: number; // Year Oyakata took charge
  reignTo: number | null; // null = currently in charge
  achievementsInReign: {
    yushoCount: number;
    globalCupWins: number;
    hofInductees: string[]; // shikona[]
    boardSeatsWon: number;
  };
  trainingPhilosophyAtReign: TrainingPhilosophy;
  legacyBlurb?: string; // BardEngine-generated narrative summary
}

/** A heritable stat advantage derived from a legendary retired rikishi. */
export interface BloodlineTrait {
  traitId: string;
  label: string;
  description: string;
  /** Additive bonus to affected stats on the candidate who carries the bloodline. */
  statFloorBonus: Partial<Record<string, number>>;
  /** Bonus to PA ceiling on the primary stat. */
  ceilingBonus: number;
  /** Shikona of the ancestor. */
  ancestorShikona: string;
  /** Year the trait was registered (when ancestor retired). */
  registeredYear: number;
}

/** Registry held in world state. */
export interface BloodlineRegistry {
  /** Map of lineageId → BloodlineTrait. lineageId usually derived from ancestor's ID. */
  traits: Record<string, BloodlineTrait>;
}

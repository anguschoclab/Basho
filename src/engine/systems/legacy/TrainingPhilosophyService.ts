/**
 * TrainingPhilosophyService.ts
 * ============================
 * Manages the inheritance and evolution of a stable's training identity.
 * (Phase 5: The Legacy Engine)
 */

import type { TrainingPhilosophy } from "../../types/dynasty";
import type { Oyakata, OyakataArchetype } from "../../types/oyakata";

/** Dimension shift — how a new Oyakata's archetype nudges the inherited philosophy. */
const ARCHETYPE_SHIFTS: Record<OyakataArchetype, Partial<TrainingPhilosophy>> = {
  traditionalist: { intensityBias: "grueling", focusBias: "power" },
  scientist: { intensityBias: "scientific", focusBias: "technique" },
  gambler: { recruitmentBias: "international" },
  nurturer: { intensityBias: "moderate", focusBias: "balanced" },
  tyrant: { intensityBias: "grueling", focusBias: "power" },
  strategist: { focusBias: "technique", intensityBias: "scientific" },
  strict: { intensityBias: "grueling" },
  indulgent: { intensityBias: "moderate" },
};

export const TrainingPhilosophyService = {
  getDefault(): TrainingPhilosophy {
    return {
      focusBias: "balanced",
      intensityBias: "moderate",
      recruitmentBias: "domestic",
    };
  },

  /**
   * Evolves the philosophy when a new Oyakata takes charge.
   * The successor inherits all dimensions but may shift one per their archetype.
   * Full convergence to the new style takes ~3 years (handled by the tick).
   */
  evolveForSuccessor(current: TrainingPhilosophy, incomingOyakata: Oyakata): TrainingPhilosophy {
    const shifts = ARCHETYPE_SHIFTS[incomingOyakata.archetype] ?? {};
    return {
      ...current,
      ...shifts, // Merge shifts — only overrides defined dimensions
    };
  },

  /**
   * Applies a single-dimension nudge based on overall stable performance.
   * Called yearly if no succession happened.
   * E.g., losing streaks increase 'grueling' intensity as the Oyakata panics.
   */
  applyPerformanceNudge(
    current: TrainingPhilosophy,
    consecutiveLosses: number
  ): TrainingPhilosophy {
    if (consecutiveLosses >= 3) {
      return { ...current, intensityBias: "grueling" };
    }
    return current;
  },

  /**
   * Human-readable label for the philosophy dimensions.
   */
  describe(philosophy: TrainingPhilosophy): string {
    const focus = {
      power: "Power-first",
      technique: "Technique-first",
      speed: "Speed-first",
      balanced: "Balanced",
    }[philosophy.focusBias];
    const intensity = { grueling: "grueling", moderate: "measured", scientific: "scientific" }[
      philosophy.intensityBias
    ];
    const recruit = {
      domestic: "domestic talent",
      international: "international stars",
      prodigy_seeker: "generational talents",
    }[philosophy.recruitmentBias];
    return `${focus}, ${intensity} training focused on ${recruit}.`;
  },
};

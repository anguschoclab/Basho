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
   * Phase 5 Depth: Instead of snapping, we set target biases.
   */
  evolveForSuccessor(current: TrainingPhilosophy, incomingOyakata: Oyakata): TrainingPhilosophy {
    const shifts = ARCHETYPE_SHIFTS[incomingOyakata.archetype] ?? {};
    return {
      ...current,
      targetFocusBias: shifts.focusBias || current.focusBias,
      targetIntensityBias: shifts.intensityBias || current.intensityBias,
      transitionProgress: 0,
    };
  },

  /**
   * Phase 5 Depth: Ticks the drift at the yearly boundary.
   * Moves 25% of the way toward the targets each year (Full transition in 4 years).
   */
  tickPhilosophyDrift(philosophy: TrainingPhilosophy): TrainingPhilosophy {
    if (philosophy.transitionProgress === undefined || philosophy.transitionProgress >= 1) {
      return philosophy;
    }

    const nextProgress = Math.min(1.0, philosophy.transitionProgress + 0.25);
    const nextPhil = { ...philosophy, transitionProgress: nextProgress };

    if (nextProgress >= 1.0) {
      // Transition complete
      nextPhil.focusBias = philosophy.targetFocusBias || philosophy.focusBias;
      nextPhil.intensityBias = philosophy.targetIntensityBias || philosophy.intensityBias;
      delete nextPhil.targetFocusBias;
      delete nextPhil.targetIntensityBias;
    }

    return nextPhil;
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

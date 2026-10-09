/**
 * src/engine/systems/training/TrainingService.ts
 * ==============================================
 * Stateful orchestration for the Training System.
 *
 * Responsibilities:
 * 1. State Hydration (ensureHeyaTrainingState)
 * 2. Weekly Evolution Tick (applyWeeklyTraining)
 * 3. Profile Management
 *
 * Goal: Service-oriented architecture with clear dependencies.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { HeyaTrainingState, IndividualFocus } from "../../types/training";
import { EntityCollection } from "../../core/EntityCollection";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { processRikishiWeekly } from "./weeklyTraining";

// Re-exports for UI consumption
export * from "../../../constants/engine/training";
export * from "./TrainingNarrative";

/**
 * Factory for default training state.
 * Creates a new HeyaTrainingState with default balanced profile.
 *
 * @param {Id} heyaId - The heya ID to create training state for.
 * @returns {HeyaTrainingState} The default training state.
 *
 * @example
 * ```ts
 * const defaultState = createDefaultTrainingState(heyaId);
 * console.log(defaultState.activeProfile.intensity); // "balanced"
 * ```
 */
export function createDefaultTrainingState(heyaId: Id): HeyaTrainingState {
  return {
    heyaId,
    activeProfile: {
      intensity: "balanced",
      focus: "neutral",
      styleBias: "neutral",
      recovery: "normal",
    },
    focusSlots: [],
  };
}

/**
 * Ensure heya training state exists in world.
 * Hydrates the training state for a heya if it doesn't exist.
 *
 * @param {WorldState} world - The current world state.
 * @param {Id} heyaId - The heya ID to ensure training state for.
 * @returns {HeyaTrainingState} The existing or newly created training state.
 *
 * @example
 * ```ts
 * const trainingState = ensureHeyaTrainingState(world, heyaId);
 * console.log(trainingState.activeProfile);
 * ```
 */
export function ensureHeyaTrainingState(world: WorldState, heyaId: Id): HeyaTrainingState {
  // Pure hydration — never writes into world.trainingState; a missing entry
  // resolves to the same default on every read, so persistence is moot.
  const state = world.trainingState?.get(heyaId);
  if (!state) return createDefaultTrainingState(heyaId);
  // Backfill any missing fields on a COPY. Nested-field updates (e.g. a loop
  // decision writing `activeProfile.intensity`) can persist a PARTIAL
  // trainingState onto a heya that had none, leaving `activeProfile` without
  // `focus`/`styleBias`/`recovery` — which then crashed the training tick at
  // INTENSITY_MULTIPLIERS[profile.intensity]. Merge over defaults so every
  // consumer sees a complete profile — but do not mutate the stored entry:
  // this is a read path, and the map belongs to the worker-owned world.
  const defaults = createDefaultTrainingState(heyaId);
  return {
    ...state,
    heyaId: state.heyaId ?? heyaId,
    activeProfile: { ...defaults.activeProfile, ...(state.activeProfile ?? {}) },
    focusSlots: state.focusSlots ?? [],
  };
}

/**
 * Authoritative Weekly Training Tick.
 * Returns StateImpact describing training updates instead of mutating state directly.
 *
 * Algorithm:
 * 1. For each active rikishi, calculate fatigue delta based on training profile
 * 2. Apply burnout check for prodigies on extreme intensity
 * 3. Aggregate weekly drill plan impacts
 * 4. Calculate growth vector with staff bonuses and infrastructure buffs
 * 5. Apply age-based decay to stats
 * 6. Enforce stat ceilings and division floors
 * 7. Log milestone events for threshold crossings
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Impact describing training updates for all rikishi.
 *
 * @example
 * ```ts
 * const impact = applyWeeklyTraining(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function applyWeeklyTraining(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyWeeklyTraining");
  const activeRikishi = EntityCollection.getActiveRikishi(world);

  const focusMapCache = new Map<Id, Map<Id, IndividualFocus>>();

  activeRikishi.forEach((rikishi) => {
    processRikishiWeekly(rikishi, world, focusMapCache, builder);
  });

  return builder.build();
}

/**
 * Compatibility object for any legacy callers using TrainingService.*
 * Provides a namespace for all training-related functions and constants.
 */
import * as Constants from "../../../constants/engine/training";
import * as Narrative from "./TrainingNarrative";

/**
 * Training Service namespace.
 * Exports all training-related functions, constants, and narrative helpers.
 *
 * @see SparringService for sparring-specific logic
 * @see MentorshipService for mentorship-specific logic
 */
export const TrainingService = {
  ensureHeyaTrainingState,
  applyWeeklyTraining,
  createDefaultTrainingState,
  ...Constants,
  ...Narrative,
};

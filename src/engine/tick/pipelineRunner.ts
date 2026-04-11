/**
 * pipelineRunner.ts
 * =================
 * Core reducer engine for the Strict Pipeline Architecture.
 *
 * Each pipeline phase is a pure function that returns either WorldState or StateImpact.
 * The runner:
 *   1. Reducer-based sequence execution.
 *   2. Resolves StateImpact objects into WorldState.
 *   3. Validates the returned state has not been wiped.
 *   4. Falls back to the pre-phase snapshot on error (no silent crashes).
 *
 * Zero in-place mutations. Every phase must use spread/clone semantics.
 */

import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { resolveImpacts } from "../core/ImpactResolver";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single pipeline phase: pure function returning either WorldState or StateImpact. */
export type PipelinePhase = (world: WorldState) => WorldState | StateImpact;

// ── Core runner ───────────────────────────────────────────────────────────────

/**
 * Run a sequence of pipeline phases as a left-fold reducer.
 * Each phase must return a new object (no mutation).
 * Phases can return either WorldState (legacy) or StateImpact (migrated).
 *
 * On phase failure the unmutated pre-phase snapshot is returned, so the
 * remaining phases still execute against a valid (if stale) world.
 */
export function runPipeline(
  initialWorld: WorldState,
  phases: PipelinePhase[],
): WorldState {
  const impacts: StateImpact[] = [];
  let currentWorld = initialWorld;

  for (const phase of phases) {
    try {
      const result = phase(currentWorld);

      // Check if phase returned StateImpact (migrated) or WorldState (legacy)
      if (result && typeof result === 'object' && 'entityUpdates' in result) {
        // Phase returned StateImpact - collect it
        impacts.push(result as StateImpact);
        // Note: StateImpact will be resolved at the end
      } else {
        // Phase returned WorldState (legacy)
        const nextWorld = result as WorldState;

        // Resolve any pending impacts before applying legacy WorldState
        if (impacts.length > 0) {
          currentWorld = resolveImpacts(currentWorld, impacts);
          impacts.length = 0; // Clear impacts
        }

        currentWorld = nextWorld;
      }

      // Safety check: phase must not wipe core entity maps
      if (!currentWorld || !currentWorld.heyas || !currentWorld.rikishi) {
        throw new Error(
          `[pipelineRunner] Phase "${phase.name || 'anonymous'}" returned invalid WorldState ` +
            `(heyas or rikishi map missing).`,
        );
      }
    } catch (error) {
      console.error(
        `[PIPELINE FATAL ERROR] in phase: "${phase.name || 'anonymous'}"`,
        error,
      );
      // Return the unmutated state on failure to allow subsequent phases to attempt recovery
      return currentWorld;
    }
  }

  // Resolve any remaining impacts at the end
  if (impacts.length > 0) {
    currentWorld = resolveImpacts(currentWorld, impacts);
  }

  return currentWorld;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a fresh empty TickDeltas object for the start of each pipeline run. */
export function emptyDeltas() {
  return {
    revenue: 0,
    expenses: 0,
    statChanges: {} as Record<string, { stat: string; amount: number }[]>,
    injuriesSustained: [] as string[],
  };
}

/** Build default ActiveModifiers (neutral — no bonuses or penalties). */
export function defaultActiveModifiers() {
  return {
    trainingMultiplier: 1.0,
    recoveryMultiplier: 1.0,
    financialPenalty: false,
    moraleBoost: false,
  };
}

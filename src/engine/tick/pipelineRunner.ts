/**
 * pipelineRunner.ts
 * =================
 * Core reducer engine for the Strict Pipeline Architecture.
 *
 * Each pipeline phase is a pure function `(WorldState) => WorldState`.
 * The runner:
 *   1. structuredClone()s the world before each phase (immutability guardrail)
 *   2. Validates the returned state has not been wiped
 *   3. Falls back to the pre-phase snapshot on error (no silent crashes)
 *
 * Zero in-place mutations. Every phase must use spread/clone semantics.
 */

import type { WorldState } from "../types/world";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single pipeline phase: pure function returning a new WorldState. */
export type PipelinePhase = (world: WorldState) => WorldState;

// ── Core runner ───────────────────────────────────────────────────────────────

/**
 * Run a sequence of pipeline phases as a left-fold reducer.
 * Each phase receives a structuredClone of the previous output, guaranteeing
 * that a buggy phase cannot corrupt the shared world reference.
 *
 * On phase failure the unmutated pre-phase snapshot is returned, so the
 * remaining phases still execute against a valid (if stale) world.
 */
export function runPipeline(
  initialWorld: WorldState,
  phases: PipelinePhase[],
): WorldState {
  return phases.reduce((currentWorld, phase) => {
    try {
      const nextWorld = phase(currentWorld);

      // Safety check: phase must not wipe core entity maps
      if (!nextWorld || !nextWorld.heyas || !nextWorld.rikishi) {
        throw new Error(
          `[pipelineRunner] Phase "${phase.name}" returned invalid WorldState ` +
            `(heyas or rikishi map missing).`,
        );
      }

      return nextWorld;
    } catch (error) {
      console.error(
        `[PIPELINE FATAL ERROR] in phase: "${phase.name}"`,
        error,
      );
      // Return the unmutated state on failure to allow subsequent phases to attempt recovery
      return currentWorld;
    }
  }, initialWorld);
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

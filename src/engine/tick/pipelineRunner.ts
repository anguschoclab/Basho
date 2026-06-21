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
export function runPipeline(initialWorld: WorldState, phases: PipelinePhase[]): WorldState {
  let currentWorld = initialWorld;

  for (const phase of phases) {
    // PERFORMANCE OPTIMIZATION: Avoid expensive deep clone (structuredClone) every phase.
    // In a strict immutable architecture, the reference to currentWorld acts as a
    // sufficient snapshot for recovery if phases are pure.
    const prePhaseSnapshot = currentWorld;

    try {
      const result = phase(currentWorld);

      // Check if phase returned StateImpact (migrated) or WorldState (legacy)
      // StateImpact has metadata, WorldState does not
      const isStateImpact = result && typeof result === "object" && "metadata" in result;

      if (isStateImpact) {
        // Phase returned StateImpact - resolve immediately so subsequent phases
        // see the updated state (sequential correctness is required)
        currentWorld = resolveImpacts(currentWorld, [result as StateImpact]);
      } else {
        // Phase returned WorldState (legacy)
        const nextWorld = result as WorldState;
        currentWorld = nextWorld;
      }

      // Safety check: phase must not wipe core entity maps
      if (!currentWorld || !currentWorld.heyas || !currentWorld.rikishi) {
        throw new Error(
          `[pipelineRunner] Phase "${phase.name || "anonymous"}" returned invalid WorldState ` +
            `(heyas or rikishi map missing).`
        );
      }
    } catch (error) {
      console.error(`[PIPELINE FATAL ERROR] in phase: "${phase.name || "anonymous"}"`, error);
      // Restore from snapshot to ensure unmutated state for subsequent phases
      currentWorld = prePhaseSnapshot;
      continue;
    }
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

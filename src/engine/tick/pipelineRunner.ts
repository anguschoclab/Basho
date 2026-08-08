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

import type { WorldState, ActiveModifiers } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { resolveImpacts } from "../core/ImpactResolver";
import { error } from "../utils/Logger";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A single pipeline phase: pure function returning either WorldState or StateImpact.
 *
 * WARNING: If returning a StateImpact, it MUST include the `metadata` property.
 * The runner uses `"metadata" in result` to distinguish migrated StateImpact
 * responses from legacy WorldState responses. StateImpacts missing metadata
 * will be treated as invalid legacy states and crash the pipeline.
 * Always use `createEmptyImpact` which guarantees metadata presence.
 */
export type PipelinePhase = (world: WorldState) => WorldState | StateImpact;

/**
 * Optional metadata for pipeline phases.
 * Phases can declare which world fields they touch, allowing the runner
 * to snapshot only those fields for error recovery (B3.2).
 */
export interface PipelinePhaseMetadata {
  /** World fields this phase may modify. Runner snapshots these before execution. */
  touches?: string[];
  /** If true, phase is read-only and runner skips snapshotting (B3.2). */
  pure?: boolean;
}

// ── Core runner ───────────────────────────────────────────────────────────────

/**
 * Entity map fields that may be shallow-cloned for snapshot recovery.
 */
const ENTITY_MAP_FIELDS = ["heyas", "rikishi", "oyakata", "staff", "sponsorPool"] as const;

/**
 * Create a shallow snapshot of the specified entity maps for error recovery.
 * Only clones maps that the phase is declared to touch (via metadata.touches),
 * or all entity maps if no touches are declared.
 */
function createShallowSnapshot(
  world: WorldState,
  touches?: string[],
): { snapshot: Partial<WorldState>; restore: (w: WorldState) => WorldState } {
  const fieldsToSnapshot = touches && touches.length > 0
    ? touches.filter((f) => ENTITY_MAP_FIELDS.includes(f as any))
    : [...ENTITY_MAP_FIELDS];

  const snapshot: Partial<WorldState> = {};
  for (const field of fieldsToSnapshot) {
    const map = (world as any)[field];
    if (map instanceof Map) {
      snapshot[field as keyof WorldState] = new Map(map) as any;
    }
  }

  return {
    snapshot,
    restore: (w: WorldState) => ({ ...w, ...snapshot }),
  };
}

/**
 * Run a sequence of pipeline phases as a left-fold reducer.
 * Each phase must return a new object (no mutation).
 * Phases can return either WorldState (legacy) or StateImpact (migrated).
 *
 * On phase failure the pre-phase snapshot (shallow clone of entity maps)
 * is restored, so the remaining phases still execute against a valid world.
 * This closes H7: a phase that mutates shared maps in-place before throwing
 * will not corrupt the recovered state.
 */
export function runPipeline(initialWorld: WorldState, phases: PipelinePhase[]): WorldState {
  let currentWorld = initialWorld;

  for (const phase of phases) {
    // B3.1-2: Shallow snapshot of entity maps for error recovery.
    // If the phase declares touches, only snapshot those fields.
    // If pure, skip snapshotting entirely.
    const phaseMeta = (phase as any).touches
      ? { touches: (phase as any).touches as string[] }
      : undefined;
    const { restore } = createShallowSnapshot(
      currentWorld,
      phaseMeta?.touches,
    );

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
    } catch (err) {
      error(`FATAL ERROR in phase: "${phase.name || "anonymous"}"`, "Pipeline", err);
      // B3.1: Restore from shallow snapshot to undo any in-place mutations
      currentWorld = restore(currentWorld);
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
export function defaultActiveModifiers(): ActiveModifiers {
  return {
    facilityGrowthMult: 1.0,
    nutritionMult: 1.0,
    degeikoMult: 1.0,
    styleDriftMults: {
      power: 1.0,
      speed: 1.0,
      technique: 1.0,
      balance: 1.0,
      stamina: 1.0,
      mental: 1.0,
    },
    recoveryMultiplier: 1.0,
    financialPenalty: false,
    moraleBoost: false,
  };
}

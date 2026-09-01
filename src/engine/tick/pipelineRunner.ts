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
export type PipelinePhase = ((world: WorldState) => WorldState | StateImpact) &
  Partial<PipelinePhaseMetadata>;

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
type EntityMapField = "heyas" | "rikishi" | "oyakata" | "staff";
const ENTITY_MAP_FIELDS: EntityMapField[] = ["heyas", "rikishi", "oyakata", "staff"];

type EntityMap = Map<string, unknown>;
type EntitySnapshot = Partial<Record<EntityMapField, EntityMap>>;

/**
 * Create a shallow snapshot of the specified entity maps for error recovery.
 * Only clones maps that the phase is declared to touch (via metadata.touches),
 * or all entity maps if no touches are declared.
 */
function createShallowSnapshot(
  world: WorldState,
  touches?: string[]
): { snapshot: Partial<WorldState>; restore: (w: WorldState) => WorldState } {
  const validTouches = new Set<string>(ENTITY_MAP_FIELDS);
  const fieldsToSnapshot: EntityMapField[] =
    touches !== undefined
      ? touches.filter((f): f is EntityMapField => validTouches.has(f))
      : [...ENTITY_MAP_FIELDS];

  const snapshot: EntitySnapshot = {};
  for (const field of fieldsToSnapshot) {
    const map = world[field];
    if (map instanceof Map) {
      snapshot[field] = new Map(map as EntityMap);
    }
  }

  return {
    snapshot: snapshot as Partial<WorldState>,
    restore: (w: WorldState) => ({ ...w, ...(snapshot as Partial<WorldState>) }),
  };
}

/**
 * Run a sequence of pipeline phases as a left-fold reducer.
 * Each phase must return a new object (no mutation).
 * Phases can return either WorldState (legacy) or StateImpact (migrated).
 *
 * On phase failure the pre-phase snapshot (shallow clone of entity maps)
 * is restored, so the remaining phases still execute against a valid world.
 * WARNING: Only maps explicitly listed in `touches` or `ENTITY_MAP_FIELDS`
 * (heyas, rikishi, oyakata, staff) are restored. If a phase mutates nested
 * state, scalars, or unlisted maps in-place before throwing, that corruption persists.
 * This closes H7 for explicitly tracked maps only.
 */
export function runPipeline(initialWorld: WorldState, phases: PipelinePhase[]): WorldState {
  let currentWorld = initialWorld;

  // A2: Lightweight phase timer — only active when __PERF__ flag is set
  const perfEnabled =
    typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).__PERF__ === true;
  const perfTrace: Array<{ phaseName: string; durationMs: number; impactSize?: number }> = [];

  for (const phase of phases) {
    const touches = phase.pure ? [] : phase.touches;
    const { restore } = createShallowSnapshot(currentWorld, touches);

    const perfStart = perfEnabled ? performance.now() : 0;

    try {
      const result = phase(currentWorld);

      const isStateImpact = result && typeof result === "object" && "metadata" in result;

      let impactSize: number | undefined;
      if (isStateImpact) {
        const impact = result as StateImpact;
        currentWorld = resolveImpacts(currentWorld, [impact]);
        if (perfEnabled) {
          impactSize = Object.keys(impact.entities ?? {}).length;
        }
      } else {
        const nextWorld = result as WorldState;
        currentWorld = nextWorld;
      }

      if (!currentWorld || !currentWorld.heyas || !currentWorld.rikishi) {
        throw new Error(
          `[pipelineRunner] Phase "${phase.name || "anonymous"}" returned invalid WorldState ` +
            `(heyas or rikishi map missing).`
        );
      }

      if (perfEnabled) {
        perfTrace.push({
          phaseName: phase.name || "anonymous",
          durationMs: performance.now() - perfStart,
          impactSize,
        });
      }
    } catch (err) {
      error(`FATAL ERROR in phase: "${phase.name || "anonymous"}"`, "Pipeline", err);
      currentWorld = restore(currentWorld);
      continue;
    }
  }

  if (perfEnabled && typeof postMessage === "function") {
    postMessage({ type: "PERF_TRACE", trace: perfTrace });
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

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

import type { WorldState, ActiveModifiers } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { error } from "@/engine/utils/Logger";

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
 * to snapshot only those fields for error recovery.
 */
export interface PipelinePhaseMetadata {
  /**
   * Entity maps this phase may mutate IN PLACE. Declaring a field makes the
   * runner shallow-clone that map before execution so a throwing phase can be
   * rolled back. Only fields in ENTITY_MAP_FIELDS (heyas, rikishi, oyakata,
   * staff) are honored.
   *
   * CONTRACT: Phases must return new objects via spread/StateImpact and never
   * mutate entity maps in place. `touches` is a safety net for phases that
   * intentionally write in place — undeclared in-place mutation is a contract
   * violation and is NOT rolled back on error.
   */
  touches?: string[];
  /**
   * Indicates if phase is read-only.
   * When true, the runner skips snapshotting even if touches is declared.
   * CONTRACT: Pure phases have zero rollback protection. If a phase marked pure
   * mutates state in-place before throwing an error, the pipeline cannot recover
   * and the corruption will persist.
   */
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
 * Create a shallow snapshot of the entity maps a phase declares via
 * `metadata.touches`, for rollback of intentional in-place mutation.
 * Only runs when the phase opts in — phases that return new objects (the
 * required contract) need no snapshot.
 *
 * CONTRACT: This mechanism ONLY rolls back top-level maps listed in ENTITY_MAP_FIELDS.
 * It does NOT deeply clone entities. If a phase mutates entity fields in-place (e.g. `rikishi.stats`)
 * or modifies unlisted top-level fields before throwing an error, that corruption WILL persist.
 * Undeclared in-place mutation of an entity map is likewise not rolled back.
 */
function createShallowSnapshot(world: WorldState, touches: string[]): Partial<WorldState> {
  const validTouches = new Set<string>(ENTITY_MAP_FIELDS);
  const snapshot: EntitySnapshot = {};
  for (const field of touches) {
    if (!validTouches.has(field)) continue;
    const map = world[field as EntityMapField];
    if (map instanceof Map) {
      snapshot[field as EntityMapField] = new Map(map as EntityMap);
    }
  }
  return snapshot as Partial<WorldState>;
}

/**
 * Run a sequence of pipeline phases as a left-fold reducer.
 * Each phase must return a new object (no mutation).
 * Phases can return either WorldState (legacy) or StateImpact (migrated).
 *
 * On phase failure the runner restores the whole pre-phase world object, so
 * the remaining phases still execute against a valid world. Phases that opt
 * in via `touches` additionally get a shallow-clone rollback of the declared
 * entity maps, covering intentional in-place `Map.set` mutation.
 * WARNING: undeclared in-place mutation is a contract violation and is NOT
 * rolled back — the clone is only paid for maps a phase explicitly declares.
 * Nested-state, scalar, or unlisted-map mutation also persists on failure.
 */
export function runPipeline(initialWorld: WorldState, phases: PipelinePhase[]): WorldState {
  let currentWorld = initialWorld;

  // A2: Lightweight phase timer — only active when __PERF__ flag is set
  const perfEnabled =
    typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).__PERF__ === true;
  const perfTrace: Array<{ phaseName: string; durationMs: number; impactSize?: number }> = [];

  for (const phase of phases) {
    // Free reference capture — the whole-world restore on failure. Entity-map
    // clones are paid only for maps the phase declares via `touches` (the
    // in-place-mutation backstop); all production phases return StateImpacts
    // and never need the clone.
    const prePhaseWorld = currentWorld;
    const declaredTouches = phase.pure ? [] : phase.touches;
    const snapshot =
      declaredTouches && declaredTouches.length > 0
        ? createShallowSnapshot(currentWorld, declaredTouches)
        : null;

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
      // Whole-world restore covers structurally invalid returns; overlaying the
      // declared-map clones additionally rolls back touches-declared in-place
      // mutation on an otherwise-intact world.
      currentWorld = snapshot ? { ...prePhaseWorld, ...snapshot } : prePhaseWorld;
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

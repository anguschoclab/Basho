/**
 * orchestrator.ts
 * ===============
 * The Router: inspects WorldState and dispatches to the correct pipeline.
 *
 * Routing logic:
 *   active_basho → bashoPipeline   (economy + context + npcAI + narrative)
 *   all others   → offSeasonPipeline (full 6-phase training week)
 *
 * This is the canonical weekly advancement entry point. Call `advanceWeek`
 * from the game loop once every 7 daily ticks (or on "Advance Week" UI click).
 *
 * The orchestrator does NOT replace `advanceOneDay` — daily ticks still
 * drive the calendar and phase transitions. `advanceWeek` is the weekly
 * subsystem aggregate that was previously spread across `tickWeeklySubsystems`.
 */

import type { WorldState } from "../types/world";
import { runPipeline } from "./pipelineRunner";
import { offSeasonPipeline } from "./pipelines/offSeasonPipeline";
import { bashoPipeline } from "./pipelines/bashoPipeline";

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Advance the world by one week via the structured pipeline.
 * Returns a new WorldState; the input is never mutated.
 *
 * Call this in place of `tickWeeklySubsystems` for all non-legacy code paths.
 */
export function advanceWeek(world: WorldState): WorldState {
  const pipeline = selectPipeline(world);
  return runPipeline(world, pipeline);
}

/**
 * Re-derive `transientContext` without advancing the week.
 * Used by SaveSlotService after deserializing a save file to restore
 * the ephemeral modifier context before passing state to the UI.
 */
export function rebuildTransientContext(world: WorldState): WorldState {
  // Run only phases 1 + 2 (economy snapshot + context derivation) to rebuild
  // activeModifiers without applying training or welfare side-effects.
  return runPipeline(world, [
    // phase01_economy reads current heya.funds and records revenue/expenses
    // without changing anything else — safe to re-run on load.
    offSeasonPipeline[0], // phase01_economy
    offSeasonPipeline[1], // phase02_context
  ]);
}

// ── Internal ──────────────────────────────────────────────────────────────────

function selectPipeline(world: WorldState) {
  return world.cyclePhase === "active_basho" ? bashoPipeline : offSeasonPipeline;
}

/**
 * tickOrchestrator.ts
 * ===================
 * Unified tick middleware that eliminates boilerplate across tick cadences.
 *
 * Each tick file defines a list of TickStep entries (label + business logic).
 * The orchestrator handles:
 *   - Safe execution with error swallowing (safeCall)
 *   - Subsystem tracking (subs array population)
 *   - Autosave gating
 *
 * Individual tick files export pure business-logic only.
 */

import type { WorldState } from "../types/world";
import { autosave } from "../saveload";
import { advanceOneDay } from "./tickDaily";

// ── Types ────────────────────────────────────────────────────────────────────

/** A single subsystem step within a tick cadence. */
export interface TickStep {
  /** Human-readable label pushed to subs[] on success. */
  label: string;
  /** The business-logic function to execute. */
  run: (world: WorldState) => void;
  /** If true, label is NOT auto-pushed to subs (step manages it manually). */
  silent?: boolean;
}

interface TickPipelineOptions {
  /** Whether to autosave after all steps complete. Defaults to true. */
  autosave?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely execute a function, swallowing errors.
 * Returns true on success, false on failure.
 */
export function safeCall(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

// ── Pipeline executor ────────────────────────────────────────────────────────

/**
 * Execute an ordered list of tick steps against the world state.
 * Handles safe-call wrapping, subs tracking, and optional autosave.
 */
export function runTickPipeline(
  world: WorldState,
  subs: string[],
  steps: TickStep[],
  options: TickPipelineOptions = {},
): void {
  for (const step of steps) {
    const ok = safeCall(() => step.run(world));
    if (ok && !step.silent) {
      subs.push(step.label);
    }
  }

  if (options.autosave !== false) {
    safeCall(() => autosave(world));
  }
}

/**
 * Perform a fast shallow clone with specific deep structural sharing for the
 * parts of the world state that update on every tick, avoiding O(N) memory
 * bloat from deep cloning the massive entire historical database.
 */
export function cloneWorldForTick(world: WorldState): WorldState {
  const nextWorld: WorldState = { ...world };

  // Deep clone basic mutable nested properties
  nextWorld.calendar = { ...world.calendar };

  // Create a new array reference for top-level arrays that are appended to
  nextWorld.history = Array.isArray(world.history) ? [...world.history] : [];
  nextWorld.events = Array.isArray(world.events) ? [...world.events] : [];

  // Create new Maps and selectively structuredClone entities
  nextWorld.heyas = new Map();
  for (const [id, heya] of world.heyas.entries()) {
    nextWorld.heyas.set(id, structuredClone(heya));
  }

  nextWorld.rikishi = new Map();
  for (const [id, r] of world.rikishi.entries()) {
    // Retired rikishi never change state on daily ticks, map by reference!
    if (r.isRetired) {
      nextWorld.rikishi.set(id, r);
    } else {
      nextWorld.rikishi.set(id, structuredClone(r));
    }
  }

  // Same for staff
  if (world.staff) {
    nextWorld.staff = new Map();
    for (const [id, st] of world.staff.entries()) {
      nextWorld.staff.set(id, structuredClone(st));
    }
  }

  return nextWorld;
}

/**
 * Convenience entry point for a single daily tick.
 * Returns a NEW world state to ensure immutability / purity.
 */
export function tickOrchestrator(world: WorldState): WorldState {
  const nextWorld = cloneWorldForTick(world);
  advanceOneDay(nextWorld);
  return nextWorld;
}

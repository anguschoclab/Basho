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

export interface TickPipelineOptions {
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

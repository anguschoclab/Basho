/**
 * src/engine/tick/advanceWithGates.ts
 * ====================================
 * Generic advance-with-gates helper shared by runHoliday and AutoSimService.
 * Replaces the duplicated advanceOneDay loop + gate-check pattern.
 */

import type { WorldState } from "../types/world";
import { advanceOneDay } from "./tickDaily";
import { shouldHaltAdvance } from "../loop/shouldHaltAdvance";

export interface GateConfig {
  /** Maximum days to advance (safety cap). */
  maxDays: number;
  /** Optional predicate — if returns true, loop stops. */
  shouldStop?: (world: WorldState, daysAdvanced: number) => boolean;
  /** Optional target predicate — if returns true, loop stops. */
  isTargetReached?: (world: WorldState, daysAdvanced: number) => boolean;
  /** If true, sets `_autonomousSim` before advancing (suppresses interactive halts). */
  autonomous?: boolean;
  /** If true, checks `shouldHaltAdvance` after each tick and breaks if true. */
  haltOnPendingDecision?: boolean;
  /** Optional progress callback invoked after each day. */
  onProgress?: (daysAdvanced: number, world: WorldState) => void;
}

export interface AdvanceResult {
  world: WorldState;
  daysAdvanced: number;
  stoppedBy: "target" | "gate" | "halt" | "maxDays";
}

/**
 * Advances day-by-day until one of: target reached, gate triggered,
 * shouldHaltAdvance returns true, or maxDays reached.
 */
export function advanceWithGates(world: WorldState, config: GateConfig): AdvanceResult {
  let currentWorld = config.autonomous
    ? { ...world, _autonomousSim: true }
    : world;
  const cap = Math.min(config.maxDays, 500);
  let daysAdvanced = 0;

  for (let i = 0; i < cap; i++) {
    currentWorld = advanceOneDay(currentWorld);
    daysAdvanced++;
    config.onProgress?.(daysAdvanced, currentWorld);

    if (config.shouldStop?.(currentWorld, daysAdvanced)) {
      return { world: currentWorld, daysAdvanced, stoppedBy: "gate" };
    }

    if (config.isTargetReached?.(currentWorld, daysAdvanced)) {
      return { world: currentWorld, daysAdvanced, stoppedBy: "target" };
    }

    if (config.haltOnPendingDecision && shouldHaltAdvance(currentWorld)) {
      return { world: currentWorld, daysAdvanced, stoppedBy: "halt" };
    }
  }

  return { world: currentWorld, daysAdvanced, stoppedBy: "maxDays" };
}

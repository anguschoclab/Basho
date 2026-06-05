// src/engine/bout/boutPhysics.ts
// =======================================================
// Barrel / thin-wrapper — delegates to the B+ spatial engine.
// =======================================================

import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState } from "../types/basho";
import type { EngineSnapshot } from "../types/combat-spatial";
import { resolveBoutPhysicsImpl } from "./boutPhaseLoop";
import {
  stat,
  jitter,
  computeTachiaiPower,
  tachiaiPowerWithMatchupPenalty,
  h2hConfidence,
  boutFatigueIncrement,
  edgeCrisisRecoveryChance,
  conditionMultiplier,
  type BoutContext,
} from "./boutUtils";

/** Re-export BoutContext so existing importers still work */
export type { BoutContext };

/** Re-export pure helpers so tests that imported them from here still work */
export {
  stat,
  jitter,
  computeTachiaiPower,
  tachiaiPowerWithMatchupPenalty,
  h2hConfidence,
  boutFatigueIncrement,
  edgeCrisisRecoveryChance,
  conditionMultiplier,
};

/**
 * Main entrance to bout physics.
 * Delegates to the B+ spatial engine (resolveBoutPhysicsImpl in boutPhaseLoop.ts).
 * Returns { result, engineSnapshot } for downstream consumers.
 */
export function resolveBoutPhysics(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  meta?: { tone: string; drift: Record<string, number> }
): { result: BoutResult; engineSnapshot: EngineSnapshot } {
  return resolveBoutPhysicsImpl(bout, east, west, basho, meta);
}

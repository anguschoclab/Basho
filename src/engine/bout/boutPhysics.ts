// boutPhysics.ts — Thin re-export barrel for the bout physics sub-system.
// Responsibilities: boutUtils.ts (pure stat helpers + BoutContext type),
//                   boutPhaseLoop.ts (phase simulation internals).
// This file re-exports all public surface so existing import paths continue to work.

import type { BashoState } from "../types/basho";
import type { Rikishi } from "../types/rikishi";
import type { EngineSnapshot } from "../types/combat-spatial";
import { resolveBoutPhysicsImpl } from "./boutPhaseLoop";

// Re-export EngineSnapshot for consumers that imported it here previously
export type { EngineSnapshot };

// ---------------------------------------------------------------------------
// Public interface (BoutContext lives in boutUtils to avoid circular imports)
// ---------------------------------------------------------------------------

export type { BoutContext } from "./boutUtils";

// ---------------------------------------------------------------------------
// Public utilities (pure helpers — live in boutUtils.ts)
// ---------------------------------------------------------------------------

export {
  computeTachiaiPower,
  conditionMultiplier,
  h2hConfidence,
  tachiaiPowerWithMatchupPenalty,
  boutFatigueIncrement,
  edgeCrisisRecoveryChance,
} from "./boutUtils";

// ---------------------------------------------------------------------------
// Public entry point (phase simulation lives in boutPhaseLoop.ts)
// ---------------------------------------------------------------------------

export function resolveBoutPhysics(
  bout: Parameters<typeof resolveBoutPhysicsImpl>[0],
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  meta?: { tone: string; drift: Record<string, number> }
): ReturnType<typeof resolveBoutPhysicsImpl> {
  return resolveBoutPhysicsImpl(bout, east, west, basho, meta);
}

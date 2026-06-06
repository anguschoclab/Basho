// boutUtils.ts — Standalone physics utilities and shared types for bout simulation.
// No phase-loop dependencies; fully unit-testable in isolation.
// Consumed by boutPhaseLoop.ts and re-exported from boutPhysics.ts.

import type { Rikishi } from "../types/rikishi";
import type { Side } from "../types/banzuke";
import { SeededRNG } from "../rng";
import {
  FORCE_POWER_MULTIPLIER,
  FORCE_SPEED_MULTIPLIER,
  FORCE_AGGRESSION_MULTIPLIER,
  AGGRESSION_SPEED_MULTIPLIER,
  AGGRESSION_CONTRIBUTION_MULTIPLIER,
} from "../../constants/engine/physics";

// ---------------------------------------------------------------------------
// Shared interface (defined here to avoid circular imports)
// ---------------------------------------------------------------------------

export interface BoutContext {
  id: string;
  day: number;
  rikishiEastId: string;
  rikishiWestId: string;
  playerSide?: Side;
  playerTactic?: import("../types/combat").BoutTactic;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
}

// ---------------------------------------------------------------------------
// Private helpers (used only within this module)
// ---------------------------------------------------------------------------

/** Safe stat read — prefers canonical rikishi.stats, falls back to top-level for bout copies */
export function stat(r: Rikishi, key: string, fallback = 50): number {
  const statsObj = r.stats as unknown as Record<string, unknown> | undefined;
  let v = statsObj?.[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    v = (r as unknown as Record<string, unknown>)[key];
  }
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function jitter(rng: SeededRNG, scale = 1): number {
  return (rng.next() - 0.5) * scale;
}

// ---------------------------------------------------------------------------
// Exported pure helpers (unit-testable, used internally)
// ---------------------------------------------------------------------------

/**
 * Computes a rikishi's tachiai power score without RNG jitter.
 * When `henkaVulnerabilityMode` is true, returns how susceptible this fighter
 * is as the OPPONENT of a henka attempt (high aggression = commits harder = easier
 * to sidestep).
 */
export function computeTachiaiPower(
  r: Rikishi,
  options?: { henkaVulnerabilityMode?: boolean }
): number {
  if (options?.henkaVulnerabilityMode) {
    // High aggression = overcommits = easier to sidestep
    return (
      stat(r, "speed") * AGGRESSION_SPEED_MULTIPLIER +
      stat(r, "aggression") * AGGRESSION_CONTRIBUTION_MULTIPLIER
    );
  }
  // Tachiai power: power 50%, speed 30%, aggression 20%
  return (
    stat(r, "power") * FORCE_POWER_MULTIPLIER +
    stat(r, "speed") * FORCE_SPEED_MULTIPLIER +
    stat(r, "aggression") * FORCE_AGGRESSION_MULTIPLIER
  );
}

export function conditionMultiplier(condition: number): number {
  const c = Math.max(0, Math.min(100, condition)) / 100;
  return 0.8 + 0.2 * c;
}

/**
 * Returns a tachiai power bonus/penalty based on head-to-head record.
 * Formula: (wins/total - 0.5) * 8, requires total >= 3 bouts.
 *   50/50 record → 0 (neutral)
 *   dominant record (10-0) → +4
 *   dominated record (0-10) → -4
 */
export function h2hConfidence(r: Rikishi, opponentId: string): number {
  const record = (r as unknown as Record<string, unknown>).h2h as
    | Record<string, { wins: number; losses: number }>
    | undefined;
  if (!record) return 0;
  const h2h = record[opponentId];
  if (!h2h) return 0;
  const total = h2h.wins + h2h.losses;
  if (total < 3) return 0;
  return (h2h.wins / total - 0.5) * 8;
}

/**
 * Computes tachiai power with optional style-matchup penalty.
 * Applies a 8% reduction when the opponent's style appears in the rikishi's
 * weakAgainstStyles list.
 */
export function tachiaiPowerWithMatchupPenalty(r: Rikishi, opponent: Rikishi): number {
  const base = computeTachiaiPower(r);
  const opponentStyle = (opponent as unknown as Record<string, unknown>).style as
    | string
    | undefined;
  const weaknesses: string[] =
    ((r as unknown as Record<string, unknown>).weakAgainstStyles as string[]) ?? [];
  if (opponentStyle && weaknesses.includes(opponentStyle)) {
    return base * 0.92;
  }
  return base;
}

/**
 * Per-tick boutFatigue increment based on stamina.
 * High-stamina fighters accumulate fatigue more slowly.
 *   stamina=100 → 0.5/tick (half rate)
 *   stamina=50  → 1.0/tick (baseline)
 *   stamina=25  → 2.0/tick (double, capped)
 */
export function boutFatigueIncrement(stamina: number): number {
  return 1 / Math.max(0.5, stamina * 0.02);
}

/**
 * Computes edge-crisis recovery probability for the defending fighter.
 * Mental composure is the dominant factor; balance is secondary.
 */
export function edgeCrisisRecoveryChance(
  defender: Rikishi,
  baseProbability: number,
  bounceBonus: number,
  tickDecay: number
): number {
  const mentalFactor = stat(defender, "mental") * 0.005; // 0–0.5 (dominant)
  const balanceFactor = stat(defender, "balance") * 0.002; // 0–0.2 (secondary)
  return (baseProbability + mentalFactor + balanceFactor + bounceBonus) * tickDecay;
}

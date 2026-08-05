/**
 * src/engine/bout/shinitai.ts
 * ===========================
 * Shini-tai (死に体) — "Dead body" determination for simultaneous exits.
 *
 * When both rikishi exit the ring at nearly the same time and the physics
 * instability ratio is too close to call, the shini-tai rule determines
 * the loser: the rikishi with lower balance (falling with no control)
 * is ruled the loser. This mirrors real sumo mono-ii decisions.
 */

import type { Rikishi } from "../types/rikishi";
import type { Side } from "../types/banzuke";

/** Instability difference below which shini-tai is invoked (simultaneous exit). */
export const SHINITAI_INSTABILITY_DIFF_THRESHOLD = 0.05;

/**
 * Attempts shini-tai determination for a simultaneous exit.
 * Returns null if the instability difference is large enough to use
 * the raw physics result (non-simultaneous exit).
 *
 * @returns The winner side and `true` if shini-tai was invoked, or `null`
 *          if the physics result should be used as-is.
 */
export function tryShinitai(
  eastInstability: number,
  westInstability: number,
  east: Rikishi,
  west: Rikishi
): { winner: Side; shinitai: boolean } | null {
  const diff = Math.abs(eastInstability - westInstability);
  if (diff > SHINITAI_INSTABILITY_DIFF_THRESHOLD) return null;

  const eastBalance = east.stats?.balance ?? 50;
  const westBalance = west.stats?.balance ?? 50;

  if (eastBalance === westBalance) {
    return {
      winner: eastInstability <= westInstability ? "east" : "west",
      shinitai: true,
    };
  }

  return {
    winner: eastBalance > westBalance ? "east" : "west",
    shinitai: true,
  };
}

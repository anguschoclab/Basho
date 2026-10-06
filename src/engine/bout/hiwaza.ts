/**
 * hiwaza.ts
 * =========
 * Hiwaza (非技) are the five "non-technique" winning results — the loser
 * defeats themselves without a decisive technique from the winner:
 *
 *   isamiashi    — over-eager step-out while attacking at the edge
 *   koshikudake  — hip collapse from exhaustion
 *   tsukite      — hand touches the clay
 *   tsukihiza    — knee touches the clay
 *   fumidashi    — steps out under own momentum
 *
 * They are classified from the loser's physical state at resolution:
 * a collapsing body becomes a touch-down (graded by remaining stamina),
 * while a lead foot crossing the tawara under the loser's own momentum
 * becomes fumidashi — or isamiashi if the winner was also pressed to the
 * edge (the classic over-committed attacker's exit).
 */

import type { Rikishi } from "../types/rikishi";
import type { EngineStateV2, PhysicalBody } from "../types/combat-spatial";
import type { Side } from "../types/banzuke";

/** Minimal RNG surface — matches SeededRNG without importing the class. */
export interface HiwaRng {
  next(): number;
}

export type HiwazaId = "isamiashi" | "koshikudake" | "tsukite" | "tsukihiza" | "fumidashi";

/** All hi_waza ids — used to avoid reclassifying an already-hiwaza result. */
export const HIWAZA_IDS: ReadonlySet<string> = new Set<HiwazaId>([
  "isamiashi",
  "koshikudake",
  "tsukite",
  "tsukihiza",
  "fumidashi",
]);

/** Lead-foot distance (m) from center that counts as "at the tawara". */
const EDGE_THRESHOLD_M = 3.8;

/** Fraction of eligible terminal states reclassified as hi_waza. */
const HIWAZA_RECLASSIFY_GATE = 0.02;

/** Stamina below which a collapse ends as a full hip-drop (koshikudake).
 * Also fires on severe in-bout exhaustion regardless of base stamina. */
const KOSHIKUDAKE_STAMINA = 25;
const KOSHIKUDAKE_FATIGUE = 20;

/** Stamina below which a collapse ends as a knee-down (tsukihiza). */
const TSUKIHIZA_STAMINA = 50;

/**
 * Classify a bout finish as a hiwaza from the loser's terminal body state,
 * or return null for a contested technique finish.
 */
export function classifyHiwaza(
  winnerSide: Side,
  east: Rikishi,
  west: Rikishi,
  state: EngineStateV2,
  _rng: HiwaRng
): HiwazaId | null {
  const loserBody: PhysicalBody = winnerSide === "east" ? state.west : state.east;
  const loserRikishi = winnerSide === "east" ? west : east;

  // Step-out first: a boundary exit beats a touch-down (whoever leaves the
  // ring or touches the clay first loses). Counts as a self-defeat when the
  // loser was still carrying outward momentum, or when the bout ended in an
  // edge crisis (the loser crossed the boundary under their own drive).
  const atEdge = Math.abs(loserBody.leadingFootX) >= EDGE_THRESHOLD_M;
  const movingOutward =
    Math.sign(loserBody.velocityX) === Math.sign(loserBody.leadingFootX) &&
    Math.abs(loserBody.velocityX) > 0;

  if (atEdge && (movingOutward || state.phase.tag === "edge_crisis")) {
    // Still carrying real outward speed → the loser charged themselves out:
    // isamiashi (over-eager step-out). Otherwise a plain fumidashi.
    return Math.abs(loserBody.velocityX) >= 2 ? "isamiashi" : "fumidashi";
  }

  // Collapse: center of gravity beyond the foot base — the body went down.
  const collapsed = Math.abs(loserBody.cogOffset) > loserBody.footSpread / 2;
  if (collapsed) {
    const stamina = loserRikishi.stats.stamina ?? 50;
    if (stamina < KOSHIKUDAKE_STAMINA || loserBody.boutFatigue > KOSHIKUDAKE_FATIGUE)
      return "koshikudake";
    if (stamina < TSUKIHIZA_STAMINA) return "tsukihiza";
    return "tsukite";
  }

  return null;
}

/**
 * Probabilistically reclassify a finish as a hiwaza. The gate keeps the
 * engine's primary technique selection dominant; only a minority of
 * eligible physical states are relabeled.
 */
export function maybeClassifyHiwaza(
  winnerSide: Side,
  east: Rikishi,
  west: Rikishi,
  state: EngineStateV2,
  rng: HiwaRng
): HiwazaId | null {
  if (rng.next() >= HIWAZA_RECLASSIFY_GATE) return null;
  return classifyHiwaza(winnerSide, east, west, state, rng);
}

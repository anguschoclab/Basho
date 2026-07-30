/**
 * Fighting Name (Shikona) Conferred Early System (B11)
 *
 * Some rikishi receive a distinctive shikona before reaching sekitori rank.
 * This acts as a motivation modifier — a "painful moment" that drives extra
 * desire. Small motivation boost while in lower divisions.
 */

import type { Rikishi } from "../../types/rikishi";
import type { SeededRNG } from "../../rng";

/** Chance of early shikona for lower-division rikishi */
export const EARLY_SHIKONA_CHANCE = 0.15;

/** Motivation boost per weekly tick while in lower divisions with early shikona */
export const EARLY_SHIKONA_MOTIVATION_BOOST = 3;

/** Divisions eligible for early shikona */
const LOWER_DIVISIONS = new Set([
  "jonokuchi",
  "jonidan",
  "sandanme",
  "makushita",
]);

/**
 * Maybe assign `shikonaConferredEarly` flag to a rikishi during generation.
 * Only applies to lower-division rikishi (below juryo).
 */
export function maybeAssignEarlyShikona(
  rikishi: Rikishi,
  rng: SeededRNG
): Rikishi {
  // Don't override existing flag
  if (rikishi.shikonaConferredEarly) return rikishi;

  // Only for lower divisions
  if (!rikishi.division || !LOWER_DIVISIONS.has(rikishi.division)) {
    return rikishi;
  }

  if (rng.next() < EARLY_SHIKONA_CHANCE) {
    return { ...rikishi, shikonaConferredEarly: true };
  }

  return rikishi;
}

/**
 * Get the motivation boost for a rikishi with early shikona.
 * Returns a positive value only when in lower divisions with the flag set.
 */
export function getEarlyShikonaMotivationBoost(rikishi: Rikishi): number {
  if (!rikishi.shikonaConferredEarly) return 0;
  if (!rikishi.division || !LOWER_DIVISIONS.has(rikishi.division)) return 0;
  return EARLY_SHIKONA_MOTIVATION_BOOST;
}

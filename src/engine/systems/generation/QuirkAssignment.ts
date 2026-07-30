/**
 * QuirkAssignment.ts
 * ==================
 * Assigns visual/behavioral quirks to rikishi at generation time.
 * Currently supports poor eyesight (2% chance) which can later be corrected
 * with glasses via applyGlasses.
 */

import type { Rikishi } from "../../types/rikishi";
import type { SeededRNG } from "../../rng";
import { POOR_EYESIGHT_CHANCE } from "../../../constants/engine/generation";

/**
 * Assigns quirks to a rikishi during generation.
 * Preserves any existing quirk values.
 */
export function assignQuirk(rikishi: Rikishi, rng: SeededRNG): Rikishi {
  const existing = rikishi.quirks ?? {};

  // Don't override already-assigned quirks
  if (existing.poorEyesight !== undefined) {
    return rikishi;
  }

  const poorEyesight = rng.next() < POOR_EYESIGHT_CHANCE;

  return {
    ...rikishi,
    quirks: {
      ...existing,
      poorEyesight,
    },
  };
}

/**
 * Checks whether a rikishi has the poor eyesight quirk.
 */
export function hasPoorEyesight(rikishi: Rikishi): boolean {
  return rikishi.quirks?.poorEyesight === true;
}

/**
 * Applies glasses to a rikishi with poor eyesight.
 * Does nothing if the rikishi does not have the poorEyesight quirk.
 */
export function applyGlasses(
  rikishi: Rikishi,
  style: string,
  acquiredBasho: string
): Rikishi {
  if (!hasPoorEyesight(rikishi)) return rikishi;

  return {
    ...rikishi,
    quirks: {
      ...rikishi.quirks!,
      glasses: { style, acquiredBasho },
    },
  };
}

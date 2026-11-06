/**
 * QuirkAssignment.ts
 * ==================
 * Assigns visual/behavioral quirks to rikishi at generation time.
 * Supports poor eyesight (2% chance), which feeds the avatar's glasses
 * layer via applyGlasses.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { SeededRNG } from "@/engine/core/rng";
import { POOR_EYESIGHT_CHANCE } from "@/constants/engine/generation";

const GLASSES_STYLES = ["round", "square", "rimless"] as const;

/**
 * Assigns quirks to a rikishi during generation.
 * Preserves any existing quirk values. A rikishi who rolls poor eyesight
 * also acquires glasses, which the avatar layer renders.
 */
export function assignQuirk(rikishi: Rikishi, rng: SeededRNG): Rikishi {
  const existing = rikishi.quirks ?? {};

  // Don't override already-assigned quirks
  if (existing.poorEyesight !== undefined) {
    return rikishi;
  }

  const poorEyesight = rng.next() < POOR_EYESIGHT_CHANCE;

  const withQuirk = {
    ...rikishi,
    quirks: {
      ...existing,
      poorEyesight,
    },
  };

  if (!poorEyesight) return withQuirk;

  const style = GLASSES_STYLES[Math.floor(rng.next() * GLASSES_STYLES.length)];
  return applyGlasses(withQuirk, style, "maezumo");
}

/**
 * Checks whether a rikishi has the poor eyesight quirk.
 */
// @keep-export hasPoorEyesight — live via same-file/dispatch call or public API contract
export function hasPoorEyesight(rikishi: Rikishi): boolean {
  return rikishi.quirks?.poorEyesight === true;
}

/**
 * Applies glasses to a rikishi with poor eyesight.
 * Does nothing if the rikishi does not have the poorEyesight quirk.
 */
// @keep-export applyGlasses — live via same-file/dispatch call or public API contract
export function applyGlasses(rikishi: Rikishi, style: string, acquiredBasho: string): Rikishi {
  if (!hasPoorEyesight(rikishi)) return rikishi;

  return {
    ...rikishi,
    quirks: {
      ...rikishi.quirks,
      glasses: { style, acquiredBasho },
    },
  };
}

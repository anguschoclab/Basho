/**
 * facilityProjections.ts
 *
 * Projections for facility level labels and colors.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import { BardEngine } from "../../engine/bard/BardEngine";
import { SeededRNG } from "../../engine/rng";

/**
 * Get facility level label.
 */
export function getFacilityLevelLabel(rng: SeededRNG, level: number): string {
  let band = "limited";
  if (level >= 85) band = "exceptional";
  else if (level >= 65) band = "outstanding";
  else if (level >= 45) band = "strong";
  else if (level >= 25) band = "capable";

  return BardEngine.resolve(rng, `rikishi.stats.power.${band}`).text.split(" — ")[0].split(".")[0];
}

/**
 * Get facility level color.
 */
export function getFacilityLevelColor(level: number): string {
  if (level >= 85) return "text-gold";
  if (level >= 65) return "text-primary";
  if (level >= 45) return "text-primary/70";
  if (level >= 25) return "text-warning";
  return "text-destructive";
}

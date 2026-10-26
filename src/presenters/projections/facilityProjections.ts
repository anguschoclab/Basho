/**
 * facilityProjections.ts
 *
 * Projections for facility level labels and colors.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

/**
 * Get facility level label.
 *
 * Honest band descriptor for a 0-100 facility level — do NOT source this from
 * rikishi stat bard lines (wrong domain: "outpowered by opponents" is not a
 * dojo quality).
 */
export function getFacilityLevelLabel(level: number): string {
  if (level >= 85) return "Exceptional";
  if (level >= 65) return "Outstanding";
  if (level >= 45) return "Strong";
  if (level >= 25) return "Capable";
  return "Limited";
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

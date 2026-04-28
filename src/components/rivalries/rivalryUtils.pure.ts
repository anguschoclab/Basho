/**
 * rivalryUtils.pure.ts
 *
 * Pure utility functions for rivalry calculations.
 * Extracted to comply with react-refresh/only-export-components rule.
 */

import type { RivalryHeatBand } from "@/engine/rivalries";

export function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 80) return "inferno";
  if (heat >= 55) return "hot";
  if (heat >= 25) return "warm";
  return "cold";
}

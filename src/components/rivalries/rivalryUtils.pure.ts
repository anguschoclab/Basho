/**
 * rivalryUtils.pure.ts
 *
 * Pure utility functions for rivalry calculations.
 * Extracted to comply with react-refresh/only-export-components rule.
 */

import { toRivalryHeatBand } from "@/presenters/engineAccess";
import type { RivalryHeatBand } from "@/presenters/engineAccess";

/**
 * Map a rivalry heat score (0–100) to its display band.
 * Delegates to the canonical engine band conversion.
 */
export function getDisplayHeatBand(heat: number): RivalryHeatBand {
  return toRivalryHeatBand(heat);
}

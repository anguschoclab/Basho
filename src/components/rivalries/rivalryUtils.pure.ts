/**
 * rivalryUtils.pure.ts
 *
 * Pure utility functions for rivalry calculations.
 * Extracted to comply with react-refresh/only-export-components rule.
 */

import type { RivalryHeatBand } from "@/presenters/engineAccess";

export function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 85) return "legendary";
  if (heat >= 65) return "fierce";
  if (heat >= 40) return "heated";
  if (heat >= 20) return "simmering";
  return "dormant";
}

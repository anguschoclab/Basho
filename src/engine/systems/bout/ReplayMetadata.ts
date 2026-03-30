/**
 * ReplayMetadata.ts — Engine-side logic for replay timing and metadata.
 * Centralizes how different kimarite and outcomes affect visual pacing.
 */

import { BoutResult } from "../../types/basho";

export type ReplayPhase = "ritual" | "tachiai" | "clinch" | "momentum" | "finish" | "ceremony" | "complete";

/**
 * Returns the recommended phase durations (in ms) for a given bout result.
 */
export function getReplayPhaseDurations(result: BoutResult): Record<ReplayPhase, number> {
  const base = {
    ritual: 2500,
    tachiai: 1200,
    clinch: 2200,
    momentum: 2800,
    finish: 1800,
    ceremony: 2200,
    complete: 0,
  };

  const kimarite = (result.kimarite || "").toLowerCase();

  // Heavyweight kimarite (throws/slams) take longer to animate
  const isHeavy = ["uwatenage", "shitanage", "kotenage", "tsuridashi", "ipponzeoi"].includes(kimarite);
  if (isHeavy) {
    base.finish = 2800;
    base.momentum = 3200;
  }

  // Quick wins (slaps/thrusts) are faster
  const isQuick = ["hatakikomi", "hikitoshi", "okuridashi", "ababetaoshi"].includes(kimarite);
  if (isQuick) {
    base.finish = 1200;
    base.momentum = 1500;
    base.clinch = 1000;
  }

  // Special case: Upset/Kinboshi adds dramatic pause
  if (result.upset) {
    base.ceremony += 1000;
    base.finish += 400;
  }

  return base;
}

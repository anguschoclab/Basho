/**
 * ReplayMetadata.ts — Engine-side logic for replay timing and metadata.
 * Centralizes how different kimarite and outcomes affect visual pacing.
 *
 * Owns BoutAnimationFamily, BoutScript, and the logic to derive them from
 * BoutResult.log + BoutResult.kimarite. The component layer imports these
 * types and the pre-computed script — it never touches BoutLogEntry directly.
 */

import type { BoutResult } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteClass } from "../types/kimarite";
import { getKimarite } from "../kimarite";

export type ReplayPhase =
  | "ritual"
  | "tachiai"
  | "clinch"
  | "momentum"
  | "finish"
  | "ceremony"
  | "complete";

// ---------------------------------------------------------------------------
// Animation family — maps the engine's KimariteClass to a smaller set of
// animation-relevant families.
// ---------------------------------------------------------------------------

export type BoutAnimationFamily =
  | "force_out"
  | "throw"
  | "pull"
  | "lift"
  | "trip"
  | "generic";

const FAMILY_MAP: Record<KimariteClass, BoutAnimationFamily> = {
  force_out: "force_out",
  push: "force_out",
  thrust: "force_out",
  throw: "throw",
  twist: "throw",
  slap_pull: "pull",
  lift: "lift",
  trip: "trip",
  rear: "generic",
  evasion: "generic",
  special: "generic",
  result: "generic",
  forfeit: "generic",
};

/**
 * Fallback for kimarite IDs not yet in KIMARITE_REGISTRY (hatakikomi,
 * hikiotoshi, okuridashi, tsuriotoshi). These are in KIMARITE_STRATEGIES
 * but not the registry, so getKimarite() returns undefined for them.
 */
const ID_FALLBACK: Record<string, BoutAnimationFamily> = {
  hatakikomi: "pull",
  hikiotoshi: "pull",
  okuridashi: "force_out",
  tsuridashi: "lift",
  tsuriotoshi: "lift",
};

/**
 * Maps a kimarite ID to its animation family via the engine's KimariteClass
 * taxonomy. Uses getKimarite() for O(1) registry lookup, with a fallback
 * for IDs missing from the registry.
 */
export function getBoutAnimationFamily(kimariteId: string): BoutAnimationFamily {
  const fallback = ID_FALLBACK[kimariteId];
  if (fallback) return fallback;
  const def = getKimarite(kimariteId);
  if (!def?.kimariteClass) return "generic";
  return FAMILY_MAP[def.kimariteClass] ?? "generic";
}

// ---------------------------------------------------------------------------
// BoutScript — pre-computed animation parameters derived from BoutResult
// ---------------------------------------------------------------------------

export interface BoutScript {
  family: BoutAnimationFamily;
  winnerSide: Side;
  /** Tachiai power margin, clamped 0–1. Higher = more dominant initial clash. */
  tachiaiMargin: number;
  /** True if any engagement log entry had family === "belt". */
  hasBeltBattle: boolean;
  /** True if any edge_crisis log entry had escaped === true. */
  hasEdgeCrisisEscape: boolean;
  /** True when family === "pull" (slap/pulldown wins are quick). */
  isSpeedBout: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Builds a BoutScript from a BoutResult by interpreting the log entries
 * and kimarite classification. Handles fusensho (minimal log), henka
 * (multiple tachiai entries), and edge crisis escape/forced-out cases.
 */
export function buildBoutScript(result: BoutResult): BoutScript {
  const family = getBoutAnimationFamily(result.kimarite);
  const winnerSide = result.winner;

  let tachiaiMargin = 0.5;
  let hasBeltBattle = false;
  let hasEdgeCrisisEscape = false;

  for (const entry of result.log) {
    if (entry.phase === "tachiai") {
      const margin = entry.data?.margin;
      if (typeof margin === "number") {
        tachiaiMargin = clamp01(margin);
      }
    }
    if (entry.phase === "engagement" && entry.data?.family === "belt") {
      hasBeltBattle = true;
    }
    if (entry.phase === "edge_crisis" && entry.data?.escaped === true) {
      hasEdgeCrisisEscape = true;
    }
  }

  return {
    family,
    winnerSide,
    tachiaiMargin,
    hasBeltBattle,
    hasEdgeCrisisEscape,
    isSpeedBout: family === "pull",
  };
}

// ---------------------------------------------------------------------------
// Phase durations
// ---------------------------------------------------------------------------

/**
 * Returns the recommended phase durations (in ms) for a given bout result.
 * If a pre-computed BoutScript is provided, uses it directly; otherwise
 * builds one internally (backward compatible).
 */
export function getReplayPhaseDurations(
  result: BoutResult,
  script?: BoutScript,
): Record<ReplayPhase, number> {
  const s = script ?? buildBoutScript(result);

  const base: Record<ReplayPhase, number> = {
    ritual: 2500,
    tachiai: 1200,
    clinch: 2200,
    momentum: 2800,
    finish: 1800,
    ceremony: 2200,
    complete: 0,
  };

  switch (s.family) {
    case "throw":
      base.finish = 2800;
      base.momentum = 3200;
      break;
    case "lift":
      base.finish = 2600;
      base.momentum = 3000;
      break;
    case "pull":
      base.finish = 1200;
      base.momentum = 1500;
      base.clinch = 1000;
      break;
    case "trip":
      base.finish = 2200;
      break;
  }

  if (s.tachiaiMargin > 0.7) {
    base.tachiai = Math.round(base.tachiai * 0.85);
  }
  if (s.tachiaiMargin < 0.35) {
    base.tachiai = Math.round(base.tachiai * 1.3);
  }
  if (s.hasEdgeCrisisEscape) {
    base.ceremony += 800;
  }
  if (result.upset) {
    base.ceremony += 1000;
    base.finish += 400;
  }

  return base;
}

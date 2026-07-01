/**
 * EraDriftService.ts
 * ==================
 * Orchestrates the "Meta" of the Sumo World across decades.
 * (Phase M: Era Drift & Global Meta)
 */

import { WorldState } from "../../types/world";
import { KIMARITE_REGISTRY, getKimarite } from "../../kimarite";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import {
  ERA_DRIFT_MIN_MOVES,
  DOMINANCE_RATIO_THRESHOLD,
  DEFAULT_DRIFT_VALUE,
  DOMINANT_FAMILY_DRIFT_GROWTH,
  NON_DOMINANT_FAMILY_DRIFT_DECAY,
  MIN_DRIFT_CLAMP,
  MAX_DRIFT_CLAMP,
} from "../../../constants/engine/calendarExtended";

export type EraTone = "classic" | "explosive" | "technical" | "defensive";

/**
 * Orchestrates a year-end "Meta Assessment".
 * Analyzes technique usage over the past year to shift the Era Tone and individual drift factors.
 */
export function processYearlyEraDrift(world: WorldState): StateImpact {
  const builder = createImpactBuilder("processYearlyEraDrift");
  const stats = world.globalKimariteStats || {};

  // 1. Group by Tactical Family
  const familyTotals: Record<string, number> = {
    push: 0,
    belt: 0,
    speed: 0,
    trick: 0,
  };

  let totalMoves = 0;
  for (const [id, count] of Object.entries(stats)) {
    const def = getKimarite(id);
    if (def && def.tacticalFamily) {
      familyTotals[def.tacticalFamily] += count;
      totalMoves += count;
    }
  }

  if (totalMoves < ERA_DRIFT_MIN_MOVES) return builder.build(); // Not enough data yet

  // 2. Identify Dominance
  const dominantFamily = Object.entries(familyTotals).sort((a, b) => b[1] - a[1])[0][0];

  const dominanceRatio = familyTotals[dominantFamily] / totalMoves;

  // 3. Update Tone (Hysteresis-friendly)
  let newTone: EraTone = world.meta?.tone || "classic";
  if (dominanceRatio > DOMINANCE_RATIO_THRESHOLD) {
    if (dominantFamily === "push") newTone = "explosive";
    if (dominantFamily === "belt") newTone = "classic";
    if (dominantFamily === "speed") newTone = "technical";
    if (dominantFamily === "trick") newTone = "defensive";
  }

  // 4. Update Individual Drift Weights (Recalculate towards DEFAULT_DRIFT_VALUE)
  const currentDrift = { ...(world.meta?.drift || {}) };
  const updatedDrift: Record<string, number> = {};

  for (const k of KIMARITE_REGISTRY) {
    let d = currentDrift[k.id] || DEFAULT_DRIFT_VALUE;

    // Bias towards dominant styles
    if (k.tacticalFamily === dominantFamily) {
      d *= DOMINANT_FAMILY_DRIFT_GROWTH; // Slow growth
    } else {
      d *= NON_DOMINANT_FAMILY_DRIFT_DECAY; // Natural decay back to baseline
    }

    // Clamp between MIN_DRIFT_CLAMP and MAX_DRIFT_CLAMP
    updatedDrift[k.id] = Math.max(MIN_DRIFT_CLAMP, Math.min(MAX_DRIFT_CLAMP, d));
  }

  // 5. Update World State via Builder
  builder.updateWorldField("meta", {
    tone: newTone,
    drift: updatedDrift,
  });

  // 6. Reset global stats for the new era/year
  builder.updateWorldField("globalKimariteStats", {});

  // 7. Emit Narrative Event for Year End Review
  const eraNarratives: Record<EraTone, string> = {
    classic:
      "The 'Golden Belt' revival. Standard mawashi techniques and traditional grit define the current circuit.",
    explosive:
      "The 'Tsuppari Rush'. A high-impact meta where pushing (oshi-sumo) and raw speed overwhelm technical defenses.",
    technical:
      "The 'Technical Renaissance'. Complex throws and diverse maneuvers are back in fashion, favoring tactical flexibility.",
    defensive:
      "The 'Iron Wall' era. Longer bouts and defensive masterclasses have slowed the game's pace as counters become lethal.",
  };

  builder.logEvent(
    "WORLD_META_EVOLUTION",
    "narrative",
    {
      status: newTone,
      incident: eraNarratives[newTone] || `The world enters a new phase designated as ${newTone}.`,
      score: Math.floor(dominanceRatio * 100),
      intensity: dominanceRatio > 0.4 ? "high" : "medium",
    },
    { year: world.year, importance: "headline" }
  );

  return builder.build();
}

/**
 * EraDriftService.ts
 * ==================
 * Orchestrates the "Meta" of the Sumo World across decades.
 * (Phase M: Era Drift & Global Meta)
 */

import { WorldState, MetaHistoryEntry } from "../../types/world";
import type { MediaHeadline } from "../../types/media";
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
  META_HISTORY_WINDOW,
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

  // 5. Update World State via Builder. Record the completed yearly assessment
  // in meta.history — the capped window managers perceive (canon §§6–7). Live
  // stats are reset below, so perception only ever sees finished years.
  const familyShares: MetaHistoryEntry["familyShares"] = {
    push: familyTotals.push / totalMoves,
    belt: familyTotals.belt / totalMoves,
    speed: familyTotals.speed / totalMoves,
    trick: familyTotals.trick / totalMoves,
  };
  const history = [
    ...(world.meta?.history ?? []),
    { year: world.year, tone: newTone, familyShares },
  ].slice(-META_HISTORY_WINDOW);

  builder.updateWorldField("meta", {
    tone: newTone,
    drift: updatedDrift,
    history,
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
      intensity: dominanceRatio > 0.4 ? "high" : "normal",
    },
    { importance: "headline" }
  );

  // WS7 — a tone change is a real media headline, flowing into the weekly
  // gazette digest (mediaState.headlines → buildMediaDigest). Deterministic:
  // id and title derive from year + tone, no RNG needed.
  const previousTone = world.meta?.tone ?? "classic";
  if (newTone !== previousTone && world.mediaState?.headlines) {
    const eraTitles: Record<EraTone, string> = {
      classic: "The 'Golden Belt' era takes hold",
      explosive: "The 'Tsuppari Rush' era begins",
      technical: "The 'Technical Renaissance' arrives",
      defensive: "The 'Iron Wall' era descends",
    };
    const headline: MediaHeadline = {
      id: `meta-era-${world.year}-${newTone}`,
      week: world.week ?? 0,
      tier: "national",
      beat: "feature",
      tone: "neutral",
      rikishiIds: [],
      heyaIds: [],
      title: eraTitles[newTone],
      subtitle: `The circuit's dominant style has shifted.`,
      impact: 40,
      tags: ["meta", "era", "feature"],
    };
    builder.updateWorldField("mediaState", {
      ...world.mediaState,
      headlines: [...world.mediaState.headlines, headline].slice(-250),
    });
  }

  return builder.build();
}

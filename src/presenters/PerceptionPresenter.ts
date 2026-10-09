/**
 * PerceptionPresenter.ts — Logic for transforming raw engine state into UI perceptions.
 * This prevents "Perception Logic Leakage" into React components.
 */

import { Rikishi } from "../engine/types/rikishi";
import { MediaTone } from "../engine/types/media";
import { HEAT_BANDS, PERCEPTION_TICKS } from "@/constants/ui/drawingPalette";

export type HealthBadge = "Fresh" | "Worn" | "Struggling" | "Critical" | "Recovering";

/**
 * Maps numeric health/injury state to UI badge.
 */
export function getHealthBadge(rikishi: Rikishi): HealthBadge {
  if (rikishi.injured && rikishi.injuryWeeksRemaining > 0) return "Recovering";

  const stamina = rikishi.stats?.stamina ?? 50;
  const fatigue = rikishi.fatigue ?? 0;
  const health = stamina - fatigue;

  if (health >= 80) return "Fresh";
  if (health >= 50) return "Worn";
  if (health >= 20) return "Struggling";
  return "Critical";
}

/**
 * Maps heat score to UI label.
 */
export function getMediaHeatLabel(heat: number): { label: string; color: string } {
  if (heat >= 85) return { label: "Red Hot", color: HEAT_BANDS.redHot };
  if (heat >= 60) return { label: "Rising", color: HEAT_BANDS.rising };
  if (heat >= 30) return { label: "Notable", color: HEAT_BANDS.notable };
  return { label: "Under the Radar", color: HEAT_BANDS.calm };
}

/**
 * Color mapping for media tones.
 */
export function getMediaToneColor(tone: MediaTone): string {
  switch (tone) {
    case "praise":
      return PERCEPTION_TICKS.technique; // emerald-400
    case "hype":
      return PERCEPTION_TICKS.strength; // pink-400
    case "concern":
      return PERCEPTION_TICKS.agility; // amber-400
    case "controversy":
      return PERCEPTION_TICKS.hinkaku; // red-400
    case "disrespect":
      return PERCEPTION_TICKS.intelligence; // gray-400
    default:
      return PERCEPTION_TICKS.default; // slate-400
  }
}

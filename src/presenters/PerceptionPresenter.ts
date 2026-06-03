/**
 * PerceptionPresenter.ts — Logic for transforming raw engine state into UI perceptions.
 * This prevents "Perception Logic Leakage" into React components.
 */

import { Rikishi } from "../engine/types/rikishi";
import { MediaTone } from "../engine/types/media";

export type HealthBadge = "Fresh" | "Worn" | "Struggling" | "Critical" | "Recovering";

/**
 * Maps numeric health/injury state to UI badge.
 */
export function getHealthBadge(rikishi: Rikishi): HealthBadge {
  if (rikishi.injured && rikishi.injuryWeeksRemaining > 0) return "Recovering";

  const stamina = rikishi.stamina ?? 50;
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
  if (heat >= 85) return { label: "Red Hot", color: "#ef4444" };
  if (heat >= 60) return { label: "Rising", color: "#f59e0b" };
  if (heat >= 30) return { label: "Notable", color: "#10b981" };
  return { label: "Under the Radar", color: "#6b7280" };
}

/**
 * Color mapping for media tones.
 */
export function getMediaToneColor(tone: MediaTone): string {
  switch (tone) {
    case "praise":
      return "#34d399"; // emerald-400
    case "hype":
      return "#f472b6"; // pink-400
    case "concern":
      return "#fbbf24"; // amber-400
    case "controversy":
      return "#f87171"; // red-400
    case "disrespect":
      return "#9ca3af"; // gray-400
    default:
      return "#94a3b8"; // slate-400
  }
}

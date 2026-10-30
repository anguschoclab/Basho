/**
 * trainingAdvisoryProjections.ts
 * ==============================
 * Presenter projections for the TrainingPage advisory surfaces:
 * coach notes (W10/V21) and projected weekly gains via calculateGains (P3/V22).
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { HeyaTrainingState } from "@/engine/types/training";
import type { Id } from "@/engine/types/common";
import { projectAdvisorRecommendations } from "@/presenters/projections/advisorProjections";
import { calculateGains } from "@/presenters/engineAccess";

export type CoachNote = ReturnType<typeof projectAdvisorRecommendations>[number];

export function buildCoachNotes(world: WorldState, playerHeyaId: Id): CoachNote[] {
  return projectAdvisorRecommendations(world, playerHeyaId).slice(0, 4);
}

export interface GainRow {
  name: string;
  stat: string;
  gain: number;
}

export function buildProjectedGains(
  world: WorldState,
  rikishiList: Rikishi[],
  trainingState: HeyaTrainingState
): GainRow[] {
  const am = world.transientContext?.activeModifiers;
  if (!am) return [];
  return rikishiList
    .map((r) => {
      const g = calculateGains(r, am, trainingState.activeProfile, undefined, world.year);
      const top = Object.entries(g).sort((a, b) => b[1] - a[1])[0];
      return top ? { name: r.shikona, stat: top[0], gain: top[1] } : null;
    })
    .filter((x): x is GainRow => !!x && x.gain > 0)
    .slice(0, 6);
}

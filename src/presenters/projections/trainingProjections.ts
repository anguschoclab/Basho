/**
 * trainingProjections.ts
 *
 * Training summary projection for the Control Center and Training page.
 */

import type { WorldState } from "../../engine/types/world";
import type { FatigueBand } from "../../engine/systems/narrative/NarrativeBands";
import { ensureHeyaTrainingState } from "../../presenters/uiDigest";
import { toFatigueBand } from "../../engine/descriptorBands";
import { FATIGUE_LABELS } from "../../constants/ui/labels";

export interface TrainingRikishiStatus {
  id: string;
  shikona: string;
  fatigue: number;
  fatigueLabel: string;
  injuryRisk: "low" | "medium" | "high";
  isInjured: boolean;
}

export interface TrainingSummary {
  intensity: string;
  focus: string;
  recovery: string;
  rosterStatuses: TrainingRikishiStatus[];
  injuryRiskHighCount: number;
  injuredCount: number;
  avgFatigue: number;
  avgFatigueBand: FatigueBand;
  hasHighRisk: boolean;
}

function toInjuryRisk(fatigue: number, isInjured: boolean): "low" | "medium" | "high" {
  if (isInjured) return "high";
  if (fatigue >= 75) return "high";
  if (fatigue >= 50) return "medium";
  return "low";
}

export function projectTrainingSummary(world: WorldState, heyaId: string): TrainingSummary | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const ts = ensureHeyaTrainingState(world, heyaId);
  const profile = ts.activeProfile;

  // ⚡ Bolt Optimization: Replaced chained .map().filter() and subsequent iterations
  // with a single loop to avoid multiple O(N) array allocations and redundant iterations.
  const rosterStatuses: TrainingRikishiStatus[] = [];
  let injuryRiskHighCount = 0;
  let injuredCount = 0;
  let totalFatigue = 0;

  if (heya.rikishiIds) {
    for (const id of heya.rikishiIds) {
      const r = world.rikishi.get(id);
      if (!r) continue;

      const fatigue = r.fatigue ?? 0;
      const fatigueBand = toFatigueBand(fatigue);
      const isInjured = !!r.injury;
      const injuryRisk = toInjuryRisk(fatigue, isInjured);

      rosterStatuses.push({
        id: r.id,
        shikona: r.shikona ?? r.name ?? id,
        fatigue,
        fatigueLabel: FATIGUE_LABELS[fatigueBand],
        injuryRisk,
        isInjured,
      });

      if (injuryRisk === "high") injuryRiskHighCount++;
      if (isInjured) injuredCount++;
      totalFatigue += fatigue;
    }
  }

  const avgFatigue =
    rosterStatuses.length > 0 ? Math.round(totalFatigue / rosterStatuses.length) : 0;
  const avgFatigueBand = toFatigueBand(avgFatigue);

  return {
    intensity: profile.intensity,
    focus: profile.focus,
    recovery: profile.recovery,
    rosterStatuses,
    injuryRiskHighCount,
    injuredCount,
    avgFatigue,
    avgFatigueBand,
    hasHighRisk: injuryRiskHighCount > 0 || injuredCount > 0,
  };
}

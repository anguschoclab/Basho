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

  const rosterStatuses: TrainingRikishiStatus[] = (heya.rikishiIds ?? [])
    .map((id) => {
      const r = world.rikishi.get(id);
      if (!r) return null;
      const fatigue = r.fatigue ?? 0;
      const fatigueBand = toFatigueBand(fatigue);
      return {
        id: r.id,
        shikona: r.shikona ?? r.name ?? id,
        fatigue,
        fatigueLabel: FATIGUE_LABELS[fatigueBand],
        injuryRisk: toInjuryRisk(fatigue, !!r.injury),
        isInjured: !!r.injury,
      };
    })
    .filter((x): x is TrainingRikishiStatus => x !== null);

  const injuryRiskHighCount = rosterStatuses.filter((r) => r.injuryRisk === "high").length;
  const injuredCount = rosterStatuses.filter((r) => r.isInjured).length;
  const avgFatigue =
    rosterStatuses.length > 0
      ? Math.round(rosterStatuses.reduce((sum, r) => sum + r.fatigue, 0) / rosterStatuses.length)
      : 0;
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

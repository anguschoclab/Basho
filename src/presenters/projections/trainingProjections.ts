/**
 * trainingProjections.ts
 *
 * Training summary projection for the Control Center and Training page.
 * Also includes tsukebito (attendant) projections for player assignment.
 */

import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";
import type { FatigueBand } from "../../engine/systems/narrative/NarrativeBands";
import { ensureHeyaTrainingState } from "../../presenters/uiDigest";
import { toFatigueBand } from "../../engine/descriptorBands";
import { FATIGUE_LABELS } from "../../constants/ui/labels";
import { isEligibleForTsukebito, isEligibleTsukebito } from "../../engine/systems/training/TsukebitoService";

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

  const rosterStatuses: TrainingRikishiStatus[] = [];
  let injuryRiskHighCount = 0;
  let injuredCount = 0;
  let fatigueSum = 0;

  for (const id of heya.rikishiIds ?? []) {
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
    fatigueSum += fatigue;
    if (injuryRisk === "high") injuryRiskHighCount++;
    if (isInjured) injuredCount++;
  }

  const avgFatigue = rosterStatuses.length > 0 ? Math.round(fatigueSum / rosterStatuses.length) : 0;
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

// ── Tsukebito projections ──

export interface TsukebitoSeniorDTO {
  id: string;
  shikona: string;
  rankLabel: string;
  tsukebitoIds: string[];
  tsukebitoPlayerSet: boolean;
  eligibleJuniors: TsukebitoJuniorDTO[];
}

export interface TsukebitoJuniorDTO {
  id: string;
  shikona: string;
  rankLabel: string;
  isAssigned: boolean;
}

export interface TsukebitoProjection {
  seniors: TsukebitoSeniorDTO[];
  hasSeniors: boolean;
}

/**
 * Project tsukebito state for a heya — which seniors are eligible,
 * who their current tsukebito are, and which juniors are available.
 */
export function projectTsukebito(world: WorldState, heyaId: string): TsukebitoProjection {
  const heya = world.heyas.get(heyaId);
  if (!heya) return { seniors: [], hasSeniors: false };

  const roster = (heya.rikishiIds ?? [])
    .map((id) => world.rikishi.get(id))
    .filter((r): r is Rikishi => r !== undefined);

  const seniors = roster
    .filter((r) => isEligibleForTsukebito(r))
    .map((senior) => {
      const tsukebitoIds = senior.tsukebitoIds ?? [];
      const eligibleJuniors = roster
        .filter((j) => isEligibleTsukebito(j, senior))
        .map((j) => ({
          id: j.id,
          shikona: j.shikona ?? j.name ?? j.id,
          rankLabel: j.rank ?? "—",
          isAssigned: tsukebitoIds.includes(j.id),
        }));
      return {
        id: senior.id,
        shikona: senior.shikona ?? senior.name ?? senior.id,
        rankLabel: senior.rank ?? "—",
        tsukebitoIds,
        tsukebitoPlayerSet: senior.tsukebitoPlayerSet ?? false,
        eligibleJuniors,
      };
    });

  return {
    seniors,
    hasSeniors: seniors.length > 0,
  };
}

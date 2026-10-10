/**
 * useTrainingDerived.ts
 *
 * TrainingPage derived data — roster-sorted rikishi list, intensity
 * effectiveness table, focus-bias matrix, encouragement count.
 */

import { useMemo } from "react";
import { INTENSITY_MULTIPLIERS, FOCUS_BIAS_MATRIX, RANK_HIERARCHY } from "@/presenters/uiDigest";
import type { TrainingIntensity, TrainingFocus } from "@/engine/types/training";
import { getRikishi } from "@/presenters/worldAccess";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/presenters/uiDigest";
import type { Heya } from "@/engine/types/heya";
import { selectEncouragementLog } from "@/presenters/selectors";

export function useTrainingDerived(world: WorldState | null, heya: Heya | null) {
  const encouragementLog = useMemo(
    () => (world ? (world.encouragementLog ?? selectEncouragementLog(world)) : []),
    [world]
  );
  const encouragementCount = encouragementLog.length;

  const rikishiList = useMemo<Rikishi[]>(() => {
    if (!world || !heya) return [];
    return [...new Set(heya.rikishiIds ?? [])]
      .map((id) => getRikishi(world, id))
      .filter((r): r is Rikishi => r !== undefined)
      .sort((a, b) => {
        const aTier = RANK_HIERARCHY[a.rank]?.tier ?? 999;
        const bTier = RANK_HIERARCHY[b.rank]?.tier ?? 999;
        return aTier - bTier;
      });
  }, [world, heya]);

  const trainingEffectivenessData = useMemo(
    () =>
      (
        Object.entries(INTENSITY_MULTIPLIERS) as Array<
          [TrainingIntensity, { growth: number; fatigue: number; injuryRisk: number }]
        >
      ).map(([intensity, eff]) => ({
        intensity: intensity.charAt(0).toUpperCase() + intensity.slice(1),
        growth: Math.round(eff.growth * 100),
        fatigue: Math.round(eff.fatigue * 100),
        injuryRisk: Math.round(eff.injuryRisk * 100),
      })),
    []
  );

  const focusBiasData = useMemo(
    () =>
      (Object.entries(FOCUS_BIAS_MATRIX) as Array<[TrainingFocus, Record<string, number>]>).map(
        ([focus, biases]) => ({
          focus: focus.charAt(0).toUpperCase() + focus.slice(1),
          strength: Math.round((biases.power ?? 1) * 100),
          speed: Math.round((biases.speed ?? 1) * 100),
          technique: Math.round((biases.technique ?? 1) * 100),
          balance: Math.round((biases.balance ?? 1) * 100),
        })
      ),
    []
  );

  return { rikishiList, encouragementCount, trainingEffectivenessData, focusBiasData };
}

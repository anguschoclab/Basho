/**
 * useRikishiData.ts
 *
 * Custom hooks for rikishi profile data preparation.
 */

import { useMemo } from "react";
import type { CareerSnapshot } from "@/engine/types/history";
import type { UIRikishi } from "@/presenters/uiModels";

export function useCareerProgressionData(history: CareerSnapshot[] | undefined) {
  return useMemo(() => {
    if (!history || history.length === 0) return [];
    const rankOrder: Record<string, number> = {
      yokozuna: 100,
      ozeki: 90,
      sekiwake: 80,
      komusubi: 70,
      maegashira: 60,
      juryo: 40,
      makushita: 30,
      sandanme: 20,
      jonidan: 10,
      jonokuchi: 5,
    };
    return (history as CareerSnapshot[])
      .slice()
      .reverse()
      .map((snap) => ({
        basho: `${snap.bashoName} ${snap.year}`,
        rankValue: (rankOrder[snap.rank] || 0) + (snap.rankNumber || 0),
        wins: snap.wins,
        losses: snap.losses,
        winRate:
          snap.wins + snap.losses > 0
            ? Math.round((snap.wins / (snap.wins + snap.losses)) * 100)
            : 0,
      }));
  }, [history]);
}

export function useKimariteDistributionData(rikishi: UIRikishi | null) {
  return useMemo(() => {
    if (!rikishi?.favoredKimariteDetailed || rikishi.favoredKimariteDetailed.length === 0)
      return [];
    return (rikishi.favoredKimariteDetailed as { kimarite: string; percentage: number }[])
      .slice(0, 8)
      .map((k) => ({
        kimarite: k.kimarite,
        percentage: k.percentage,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [rikishi?.favoredKimariteDetailed]);
}

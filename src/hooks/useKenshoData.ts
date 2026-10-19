import { useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { resolveAvatar, rikishiStageInput } from "@/presenters/avatarProjections";
import type { Rikishi } from "@/engine/types/rikishi";
import type { AvatarRenderData } from "@/engine/types/avatar";
import type { BoutResult } from "@/engine/types/basho";

export interface KenshoBoutEntry {
  rikishiId: string;
  rikishiName: string;
  boutId: string;
  kenshoEnvelopes: number;
  awardFact?: string;
  avatar?: AvatarRenderData;
}

export function useKenshoData() {
  const { state } = useGame();
  const world = state.world;
  const heyaId = world?.playerHeyaId;
  const heya = heyaId ? world?.heyas.get(heyaId) : undefined;

  const { playerRikishi, totalKenshoEarnings, projectedKensho } = useMemo(() => {
    const rikishiArray: Rikishi[] = [];
    let earningsSum = 0;
    let projectedSum = 0;

    if (heya && heya.rikishiIds) {
      for (const id of [...new Set(heya.rikishiIds)]) {
        const rikishi = world?.rikishi.get(id);
        if (rikishi) {
          rikishiArray.push(rikishi);

          const economics = rikishi.economics;
          if (economics) {
            earningsSum += (economics.careerKenshoWon || 0) * 70000;
          }

          const rank = rikishi.rank;
          if (rank) {
            let baseProjection = 0;
            if (rank === "yokozuna" || rank === "ozeki") baseProjection = 15;
            else if (rank === "sekiwake" || rank === "komusubi") baseProjection = 10;
            else if (rank.includes("maegashira")) baseProjection = 5;
            projectedSum += baseProjection * 70000;
          }
        }
      }
    }
    return {
      playerRikishi: rikishiArray,
      totalKenshoEarnings: earningsSum,
      projectedKensho: projectedSum,
    };
  }, [heya, world?.rikishi]);

  const recentBoutsWithKensho = useMemo(() => {
    const arr: KenshoBoutEntry[] = [];

    if (world?.currentBasho?.matches && heya?.rikishiIds) {
      for (const match of world.currentBasho.matches) {
        const result = match.result as BoutResult | undefined;
        if (!result) continue;

        const eastRikishi = world.rikishi.get(match.eastRikishiId);
        const westRikishi = world.rikishi.get(match.westRikishiId);

        const boutAvatar = (r: Rikishi) =>
          resolveAvatar({
            id: r.id,
            stored: r.avatarConfig,
            nationality: r.nationality,
            ...rikishiStageInput(r, world?.year ?? 0),
          });

        if (eastRikishi && heya.rikishiIds.includes(eastRikishi.id) && result.kenshoEnvelopes > 0) {
          arr.push({
            rikishiId: eastRikishi.id,
            rikishiName: eastRikishi.shikona || eastRikishi.id,
            boutId: match.boutId,
            kenshoEnvelopes: result.kenshoEnvelopes,
            awardFact: result.awardFact || undefined,
            avatar: boutAvatar(eastRikishi),
          });
        }

        if (westRikishi && heya.rikishiIds.includes(westRikishi.id) && result.kenshoEnvelopes > 0) {
          arr.push({
            rikishiId: westRikishi.id,
            rikishiName: westRikishi.shikona || westRikishi.id,
            boutId: match.boutId,
            kenshoEnvelopes: result.kenshoEnvelopes,
            awardFact: result.awardFact || undefined,
            avatar: boutAvatar(westRikishi),
          });
        }
      }
    }
    return arr;
  }, [world?.currentBasho?.matches, world?.rikishi, world?.year, heya?.rikishiIds]);

  return {
    heyaId,
    heya,
    worldYear: world?.year ?? 0,
    playerRikishi,
    totalKenshoEarnings,
    projectedKensho,
    recentBoutsWithKensho,
  };
}

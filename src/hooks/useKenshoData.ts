import { useMemo } from "react";
import { useGame } from "@/state/game/useGame";
import { resolveAvatar, rikishiStageInput } from "@/presenters/projections/avatarProjections";
import type { Rikishi } from "@/engine/types/rikishi";
import type { AvatarRenderData } from "@/engine/types/avatar";
import type { BoutResult } from "@/engine/types/basho";
import { KENSHO_AMOUNT_PER_ENVELOPE } from "@/constants/engine/economic";
import { isYokozunaOrOzekiRank, isLowerSanyakuRank } from "@/constants/engine/rankDisplay";

export interface KenshoBoutEntry {
  rikishiId: string;
  rikishiName: string;
  boutId: string;
  kenshoEnvelopes: number;
  awardFact?: string;
  avatar?: AvatarRenderData;
}

/**
 * Hook returning the kensho banner/sponsor data for the current basho.
 */
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
            earningsSum += (economics.careerKenshoWon || 0) * KENSHO_AMOUNT_PER_ENVELOPE;
          }

          const rank = rikishi.rank;
          if (rank) {
            let baseProjection = 0;
            if (isYokozunaOrOzekiRank(rank)) baseProjection = 15;
            else if (isLowerSanyakuRank(rank)) baseProjection = 10;
            else if (rank.includes("maegashira")) baseProjection = 5;
            projectedSum += baseProjection * KENSHO_AMOUNT_PER_ENVELOPE;
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
      const rosterIdSet = new Set(heya.rikishiIds);
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

        // Kensho envelopes go to the winner — only the winner's side earns,
        // and same-heya bouts must not emit the bout twice (dup boutId key).
        const winnerSide =
          result.winnerRikishiId === match.eastRikishiId
            ? eastRikishi
            : result.winnerRikishiId === match.westRikishiId
              ? westRikishi
              : undefined;
        if (winnerSide && rosterIdSet.has(winnerSide.id) && result.kenshoEnvelopes > 0) {
          arr.push({
            rikishiId: winnerSide.id,
            rikishiName: winnerSide.shikona || winnerSide.id,
            boutId: match.boutId,
            kenshoEnvelopes: result.kenshoEnvelopes,
            awardFact: result.awardFact || undefined,
            avatar: boutAvatar(winnerSide),
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

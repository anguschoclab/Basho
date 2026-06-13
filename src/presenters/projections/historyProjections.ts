/**
 * historyProjections.ts
 *
 * History / archive page data projection.
 * Computes yusho count, best finish, career prize money from world.history.
 */

import type { WorldState } from "../../engine/types/world";
import { formatYen } from "../../utils/engineUtils";

export interface HistoryAggregate {
  bashoPlayed: number;
  yushoCount: number;
  bestWinRate: number;
  bestWinRateLabel: string;
  totalPrizeMoney: number;
  totalPrizeMoneyLabel: string;
  consecutiveWinningRecords: number;
  hasHofCandidate: boolean;
}

export function projectHistoryAggregate(world: WorldState, heyaId: string): HistoryAggregate {
  const history = world.history ?? [];

  const playerHeya = world.heyas.get(heyaId);
  const playerRikishiIds = new Set(playerHeya?.rikishiIds ?? []);

  let yushoCount = 0;
  let totalPrizeMoney = 0;
  let bestWinRate = 0;
  let consecutiveWinning = 0;
  let currentStreak = 0;

  for (const basho of history) {
    if (basho.yusho && playerRikishiIds.has(basho.yusho)) {
      yushoCount++;
    }

    const prize = ((basho as unknown as Record<string, unknown>).playerPrize as number) ?? 0;
    totalPrizeMoney += prize;

    const playerResults = (basho as unknown as Record<string, unknown>).playerResults as
      | Array<{ wins: number; losses: number }>
      | undefined;

    if (playerResults && playerResults.length > 0) {
      let totalWins = 0;
      let totalLosses = 0;
      for (const r of playerResults) {
        totalWins += r.wins;
        totalLosses += r.losses;
      }
      const winRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0;
      if (winRate > bestWinRate) bestWinRate = winRate;
      if (totalWins > totalLosses) {
        currentStreak++;
        if (currentStreak > consecutiveWinning) consecutiveWinning = currentStreak;
      } else {
        currentStreak = 0;
      }
    }
  }

  const hofInductees = world.hallOfFame?.inductees ?? [];
  const hasHofCandidate = hofInductees.some((i: unknown) =>
    playerRikishiIds.has((i as Record<string, unknown>).rikishiId as string)
  );

  return {
    bashoPlayed: history.length,
    yushoCount,
    bestWinRate: Math.round(bestWinRate * 100),
    bestWinRateLabel: `${Math.round(bestWinRate * 100)}%`,
    totalPrizeMoney,
    totalPrizeMoneyLabel: formatYen(totalPrizeMoney),
    consecutiveWinningRecords: consecutiveWinning,
    hasHofCandidate,
  };
}

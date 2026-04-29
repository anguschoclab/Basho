/**
 * ChronicleService.ts
 * ===================
 * Records history of Global Cup tournaments.
 */

import type { WorldState } from "../types/world";
import type { GlobalCupHistoryEntry } from "../types/globalCup";

/**
 * Record a Global Cup tournament completion
 */
export function recordGlobalCup(
  world: WorldState,
  cup: NonNullable<WorldState["globalCup"]>
): WorldState {
  const champion = cup.championId ? world.rikishi.get(cup.championId) : null;
  const championHeya = champion?.heyaId ? world.heyas.get(champion.heyaId) : null;

  const historyEntry: GlobalCupHistoryEntry = {
    year: cup.year,
    championId: cup.championId || "",
    championName: champion?.shikona || "Unknown",
    championHeya: championHeya?.name || "Unknown",
    participantCount: cup.participants.length,
    wasPlayerChampion: cup.participants.some(
      (p: { rikishiId: string; isChallenger: boolean }) =>
        p.rikishiId === cup.championId && !p.isChallenger
    ),
  };

  // Add to chronicle
  const chronicle = world.chronicle || {
    eraLabels: [],
    topChampions: [],
    greatestRivalries: [],
    recordsBroken: [],
  };
  const globalCups = chronicle.globalCups || [];

  return {
    ...world,
    chronicle: {
      ...chronicle,
      globalCups: [...globalCups, historyEntry],
    },
  };
}

/**
 * Get Global Cup history
 */
export function getGlobalCupHistory(world: WorldState): GlobalCupHistoryEntry[] {
  return world.chronicle?.globalCups || [];
}

/**
 * Get best performers in Global Cup history
 */
export function getGlobalCupLegends(world: WorldState): Array<{
  rikishiId: string;
  shikona: string;
  wins: number;
  finalAppearances: number;
}> {
  const history = getGlobalCupHistory(world);
  const stats = new Map<string, { shikona: string; wins: number; finals: number }>();

  for (const entry of history) {
    // Champion stats
    const champ = stats.get(entry.championId) || {
      shikona: entry.championName,
      wins: 0,
      finals: 0,
    };
    champ.wins++;
    champ.finals++;
    stats.set(entry.championId, champ);
  }

  return Array.from(stats.entries())
    .map(([rikishiId, data]) => ({
      rikishiId,
      shikona: data.shikona,
      wins: data.wins,
      finalAppearances: data.finals,
    }))
    .sort((a, b) => b.wins - a.wins);
}

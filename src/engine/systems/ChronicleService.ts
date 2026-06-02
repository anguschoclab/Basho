/**
 * src/engine/systems/ChronicleService.ts
 * =======================================
 * Chronicle Service
 *
 * Responsibilities:
 * - Record Global Cup tournament completion history
 * - Track Global Cup champions and statistics
 * - Calculate legendary performers based on tournament history
 */

import type { WorldState } from "../types/world";
import type { GlobalCupHistoryEntry } from "../types/globalCup";
import { getHeya, getRikishi } from "../queries";

/**
 * Record a Global Cup tournament completion.
 * Creates a history entry with champion details and participant count.
 *
 * @param {WorldState} world - The current world state.
 * @param {NonNullable<WorldState["globalCup"]>} cup - The completed Global Cup tournament data.
 * @returns {WorldState} Updated world state with the tournament recorded in chronicle.
 *
 * @example
 * ```ts
 * const updatedWorld = recordGlobalCup(world, globalCup);
 * const history = getGlobalCupHistory(updatedWorld);
 * console.log(history[0].championName);
 * ```
 */
export function recordGlobalCup(
  world: WorldState,
  cup: NonNullable<WorldState["globalCup"]>
): WorldState {
  const champion = cup.championId ? getRikishi(world, cup.championId) : null;
  const championHeya = champion?.heyaId ? getHeya(world, champion.heyaId) : null;

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
 * Get Global Cup history.
 * Returns the list of all completed Global Cup tournaments.
 *
 * @param {WorldState} world - The current world state.
 * @returns {GlobalCupHistoryEntry[]} Array of Global Cup history entries.
 *
 * @example
 * ```ts
 * const history = getGlobalCupHistory(world);
 * history.forEach(entry => {
 *   console.log(`${entry.year}: ${entry.championName}`);
 * });
 * ```
 */
export function getGlobalCupHistory(world: WorldState): GlobalCupHistoryEntry[] {
  return world.chronicle?.globalCups || [];
}

/**
 * Get best performers in Global Cup history.
 * Calculates statistics for all rikishi who have participated in Global Cup finals,
 * sorted by number of wins.
 *
 * @param {WorldState} world - The current world state.
 * @returns {Array<{rikishiId: string; shikona: string; wins: number; finalAppearances: number}>} Array of legendary performers sorted by wins.
 *
 * @example
 * ```ts
 * const legends = getGlobalCupLegends(world);
 * const topLegend = legends[0];
 * console.log(`${topLegend.shikona}: ${topLegend.wins} wins`);
 * ```
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

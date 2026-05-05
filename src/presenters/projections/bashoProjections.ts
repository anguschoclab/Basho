/**
 * bashoProjections.ts
 *
 * Projections for basho live data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "../../engine/types/world";
import type { MatchSchedule } from "../../engine/types/basho";
import type { Rikishi } from "../../engine/types/rikishi";
import type { BashoUIDigest, BoutMatchUI, HeatBand, StandingEntry } from "../types/uiDigest";
import { projectRikishi } from "../rikishiUI";
import { generateH2HCommentary } from "../../engine/h2h";
import { getRivalry } from "../../engine/rivalries";
import { compareRanks } from "../../engine/banzuke";
import { toRankPosition } from "../../engine/types/banzuke";
import { isKeyDay, getSeasonalFlavor, BASHO_CALENDAR } from "../../engine/calendar";
import { getRikishiByDivision } from "../../engine/queries";

/**
 * Project tournament live data for BashoPage.
 */
export function projectBashoUIDigest(world: WorldState): BashoUIDigest | null {
  const basho = world.currentBasho;
  if (!basho) return null;

  const playerHeyaId = world.playerHeyaId;
  const playerRikishiIds = new Set<string>();
  if (playerHeyaId) {
    const heya = world.heyas.get(playerHeyaId);
    if (heya && heya.rikishiIds) {
      heya.rikishiIds.forEach((id) => playerRikishiIds.add(id));
    }
  }

  const day = basho.day;
  const matches = (basho.matches || [])
    .filter((m: MatchSchedule) => m.day === day)
    .map((match: MatchSchedule) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return null;

      const uiEast = projectRikishi(east, world);
      const uiWest = projectRikishi(west, world);

      const record = uiEast.h2h?.[uiWest.id] || { wins: 0, losses: 0 };
      const h2h = { wins: record.wins, losses: record.losses };

      const rivalriesState = world.rivalriesState;
      const rivalry =
        (rivalriesState ? getRivalry(rivalriesState, east.id, west.id) : null) ?? null;
      const heat = rivalry?.heat ?? 0;
      let heatBand: HeatBand = "cold";
      if (heat >= 75) heatBand = "inferno";
      else if (heat >= 50) heatBand = "hot";
      else if (heat >= 25) heatBand = "warm";

      return {
        ...match,
        eastRikishi: uiEast,
        westRikishi: uiWest,
        isPlayerBout:
          playerRikishiIds.has(match.eastRikishiId) || playerRikishiIds.has(match.westRikishiId),
        h2h,
        rivalry,
        heatBand,
        h2hCommentary: generateH2HCommentary(east, west),
      };
    })
    .filter((m) => m !== null) as BoutMatchUI[];

  const completedBouts = matches.filter((m) => m.result).length;
  const dayProgress = matches.length > 0 ? (completedBouts / matches.length) * 100 : 0;

  // ⚡ Bolt Optimization: Replace O(N) Array.from(world.rikishi.values()).filter(...)
  // with cached getRikishiByDivision to eliminate redundant array allocations and iterations
  const standings: StandingEntry[] = getRikishiByDivision(world, "makuuchi")
    .map((r: Rikishi) => {
      const record = r.currentBashoRecord || { wins: 0, losses: 0 };
      return {
        rikishi: projectRikishi(r, world),
        wins: record.wins,
        losses: record.losses,
      };
    })
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        compareRanks(
          toRankPosition({
            rank: a.rikishi.rank,
            side: a.rikishi.side,
            rankNumber: a.rikishi.rankNumber,
          }),
          toRankPosition({
            rank: b.rikishi.rank,
            side: b.rikishi.side,
            rankNumber: b.rikishi.rankNumber,
          })
        )
    )
    .slice(0, 10);

  return {
    bashoName: basho.bashoName,
    day,
    year: world.year,
    matches,
    standings,
    playerRikishiIds: Array.from(playerRikishiIds),
    completedBouts,
    totalBouts: matches.length,
    dayProgress,
    isKeyDay: isKeyDay(day),
    seasonalFlavor: getSeasonalFlavor(
      BASHO_CALENDAR[basho.bashoName]?.season ?? "autumn",
      world.seed
    ),
  };
}

/**
 * bashoProjections.ts
 *
 * Projections for basho live data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { WorldState } from "../../engine/types/world";
import { projectRikishi } from "../rikishiUI";
import { generateH2HCommentary } from "../../engine/h2h";
import { getRivalry } from "../../engine/rivalries";
import { compareRanks } from "../../engine/banzuke";
import { isKeyDay, getSeasonalFlavor, BASHO_CALENDAR } from "../../engine/calendar";

/**
 * Project tournament live data for BashoPage.
 */
export function projectBashoUIDigest(world: WorldState) {
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
    .filter((m) => m.day === day)
    .map((match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return null;

      const uiEast = projectRikishi(east, world);
      const uiWest = projectRikishi(west, world);

      const record = (uiEast as any).h2h?.[uiWest.id] || { wins: 0, losses: 0 };
      const h2h = { wins: record.wins, losses: record.losses };

      const rivalriesState = (world as any).rivalriesState;
      const rivalry = rivalriesState ? getRivalry(rivalriesState, east.id, west.id) : null;
      const heat = rivalry?.heat ?? 0;
      let heatBand: any = "cold";
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
    .filter((m): m is any => !!m);

  const completedBouts = matches.filter((m) => m.result).length;
  const dayProgress = matches.length > 0 ? (completedBouts / matches.length) * 100 : 0;

  const standings = Array.from(world.rikishi.values())
    .filter((r) => !r.isRetired && r.division === "makuuchi")
    .map((r) => {
      const record = (r as any).currentBashoRecord || { wins: 0, losses: 0 };
      return {
        rikishi: projectRikishi(r, world),
        wins: record.wins,
        losses: record.losses,
      };
    })
    .sort((a, b) => b.wins - a.wins || compareRanks(a.rikishi.rank as any, b.rikishi.rank as any))
    .slice(0, 10);

  return {
    bashoName: basho.name,
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
      BASHO_CALENDAR[basho.bashoName || "hatsu"].season,
      (world as any).seed
    ),
  };
}

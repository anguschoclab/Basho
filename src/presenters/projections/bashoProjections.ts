/**
 * bashoProjections.ts
 *
 * Projections for basho live data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoUIDigest, BoutMatchUI, HeatBand, StandingEntry } from "@/presenters/uiDigestTypes";
import { projectRikishi } from "@/presenters/rikishi/index";
import { generateH2HCommentary } from "@/engine/bout/h2h";
import { getRivalry } from "@/engine/narrative/rivalry/rivalriesState";
import { toRivalryHeatBand } from "@/engine/narrative/descriptorBands";
import { compareRanks } from "@/engine/banzuke/banzukeHelpers";
import { toRankPosition } from "@/engine/types/banzuke";
import { sortStandings } from "@/engine/utils/sort";
import { isKeyDay, getSeasonalFlavor, BASHO_CALENDAR } from "@/engine/calendar/calendar";
import { isNakabiDay } from "@/engine/basho/NakabiService";
import { getRikishiByDivision, getPlayerHeya } from "@/engine/core/queries";
import {
  isSanyakuBout,
  KORE_YORI_SANYAKU_ANNOUNCEMENT,
} from "@/constants/engine/koreYoriSanyaku";

/**
 * Project tournament live data for BashoPage.
 */
export function projectBashoUIDigest(world: WorldState): BashoUIDigest | null {
  const basho = world.currentBasho;
  if (!basho) return null;

  const playerHeya = getPlayerHeya(world);
  const playerRikishiIds = new Set<string>(playerHeya?.rikishiIds ?? []);

  const day = basho.day;
  const matches: BoutMatchUI[] = [];
  let completedBouts = 0;
  for (const match of basho.matches || []) {
    if (match.day !== day) continue;
    const east = world.rikishi.get(match.eastRikishiId);
    const west = world.rikishi.get(match.westRikishiId);
    if (!east || !west) continue;

    const uiEast = projectRikishi(east, world);
    const uiWest = projectRikishi(west, world);

    const record = uiEast.h2h?.[uiWest.id] || { wins: 0, losses: 0 };
    const h2h = { wins: record.wins, losses: record.losses };

    const rivalriesState = world.rivalriesState;
    const rivalry = (rivalriesState ? getRivalry(rivalriesState, east.id, west.id) : null) ?? null;
    const heat = rivalry?.heat ?? 0;
    const heatBand: HeatBand = toRivalryHeatBand(heat);

    matches.push({
      ...match,
      eastRikishi: uiEast,
      westRikishi: uiWest,
      isPlayerBout:
        playerRikishiIds.has(match.eastRikishiId) || playerRikishiIds.has(match.westRikishiId),
      h2h,
      rivalry,
      heatBand,
      h2hCommentary: generateH2HCommentary(east, west),
    });
    if (match.result) completedBouts++;
  }

  const dayProgress = matches.length > 0 ? (completedBouts / matches.length) * 100 : 0;

  // Sort first on raw fields, then project only the displayed top 10 —
  // projectRikishi is too expensive to run for the whole division.
  const standings: StandingEntry[] = sortStandings(
    getRikishiByDivision(world, "makuuchi").map((r: Rikishi) => {
      const record = r.currentBashoRecord || { wins: 0, losses: 0 };
      return { r, wins: record.wins, losses: record.losses };
    }),
    (a, b) =>
      compareRanks(
        toRankPosition({
          rank: a.r.rank,
          side: a.r.side,
          rankNumber: a.r.rankNumber ?? 1,
        }),
        toRankPosition({
          rank: b.r.rank,
          side: b.r.side,
          rankNumber: b.r.rankNumber ?? 1,
        })
      )
  )
    .slice(0, 10)
    .map((e) => ({
      rikishi: projectRikishi(e.r, world),
      wins: e.wins,
      losses: e.losses,
    }));

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
    isNakabiDay: isNakabiDay(day),
    seasonalFlavor: getSeasonalFlavor(
      BASHO_CALENDAR[basho.bashoName]?.season ?? "autumn",
      world.seed
    ),
    sanyakuCallout:
      completedBouts < matches.length && isSanyakuBout(completedBouts, matches.length)
        ? KORE_YORI_SANYAKU_ANNOUNCEMENT
        : undefined,
  };
}

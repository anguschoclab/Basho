/**
 * rivalriesProjections.ts
 *
 * Rivalries page data projection.
 * Projects player, hot, and cool rivalries with heat stats.
 */

import type { WorldState } from "../../engine/types/world";
import type { RivalryPairState } from "../../engine/rivalries";
import { getPlayerHeya } from "../../engine/queries";

export interface RivalriesPageData {
  playerRivalries: RivalryPairState[];
  hotRivalries: RivalryPairState[];
  coolRivalries: RivalryPairState[];
  stableRivalries: Array<{
    aId: string;
    bId: string;
    heat: number;
    aName: string;
    bName: string;
    tone: string;
  }>;
  stats: {
    total: number;
    inferno: number;
    hot: number;
  };
  heatmapData: Array<{ x: string; y: string; value: number }>;
  playerRikishiNames: string[];
}

export function projectRivalriesPage(world: WorldState): RivalriesPageData {
  const rivalriesState = world.rivalriesState;

  if (!rivalriesState?.pairs) {
    return {
      playerRivalries: [],
      hotRivalries: [],
      coolRivalries: [],
      stableRivalries: [],
      stats: { total: 0, inferno: 0, hot: 0 },
      heatmapData: [],
      playerRikishiNames: [],
    };
  }

  const playerHeya = getPlayerHeya(world);
  const playerRikishiIds = new Set(playerHeya?.rikishiIds ?? []);

  const player: RivalryPairState[] = [];
  const hot: RivalryPairState[] = [];
  const cool: RivalryPairState[] = [];
  let totalPairs = 0;
  let infernoCount = 0;
  let hotCount = 0;

  for (const key in rivalriesState.pairs) {
    if (Object.prototype.hasOwnProperty.call(rivalriesState.pairs, key)) {
      const pair = rivalriesState.pairs[key];
      totalPairs++;
      const h = pair.heat ?? 0;
      if (h >= 80) infernoCount++;
      else if (h >= 55) hotCount++;

      const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
      if (isPlayer) player.push(pair);
      else if (h >= 55) hot.push(pair);
      else cool.push(pair);
    }
  }

  const byHeat = (a: RivalryPairState, b: RivalryPairState) => (b.heat ?? 0) - (a.heat ?? 0);
  player.sort(byHeat);
  hot.sort(byHeat);
  cool.sort(byHeat);

  const heatmapData = player.map((pair) => {
    const a = world.rikishi.get(pair.aId);
    const b = world.rikishi.get(pair.bId);
    return {
      x: a?.shikona ?? pair.aId,
      y: b?.shikona ?? pair.bId,
      value: pair.heat ?? 0,
    };
  });

  const playerRikishiNames = Array.from(playerRikishiIds).map(
    (id) => world.rikishi.get(id)?.shikona ?? id
  );

  const stableRivalries = [];
  const heyaPairs = rivalriesState.heyaRivalryPairs || {};
  for (const key in heyaPairs) {
    if (Object.prototype.hasOwnProperty.call(heyaPairs, key)) {
      const pair = heyaPairs[key];
      const a = world.heyas.get(pair.heyaAId);
      const b = world.heyas.get(pair.heyaBId);
      stableRivalries.push({
        aId: pair.heyaAId,
        bId: pair.heyaBId,
        heat: pair.heat,
        aName: a?.name ?? pair.heyaAId,
        bName: b?.name ?? pair.heyaBId,
        tone: pair.heat >= 80 ? "bad_blood" : pair.heat >= 50 ? "rivalry" : "neutral",
      });
    }
  }

  return {
    playerRivalries: player,
    hotRivalries: hot,
    coolRivalries: cool,
    stableRivalries,
    stats: { total: totalPairs, inferno: infernoCount, hot: hotCount },
    heatmapData,
    playerRikishiNames,
  };
}

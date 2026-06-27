/**
 * rivalriesProjections.ts
 *
 * Rivalries page data projection.
 * Projects player, hot, and cool rivalries with heat stats.
 */

import type { WorldState } from "../../engine/types/world";
import type { RivalryPairState } from "../../engine/rivalries";

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

  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  const playerRikishiIds = new Set(playerHeya?.rikishiIds ?? []);

  const normalized: RivalryPairState[] = Object.values(rivalriesState.pairs);

  const player: RivalryPairState[] = [];
  const hot: RivalryPairState[] = [];
  const cool: RivalryPairState[] = [];
  let infernoCount = 0;
  let hotCount = 0;

  for (const pair of normalized) {
    const h = pair.heat ?? 0;
    if (h >= 80) infernoCount++;
    else if (h >= 55) hotCount++;

    const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
    if (isPlayer) player.push(pair);
    else if (h >= 55) hot.push(pair);
    else cool.push(pair);
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

  return {
    playerRivalries: player,
    hotRivalries: hot,
    coolRivalries: cool,
    stableRivalries: Object.values(rivalriesState.heyaRivalryPairs || {}).map((pair) => {
      const a = world.heyas.get(pair.heyaAId);
      const b = world.heyas.get(pair.heyaBId);
      return {
        aId: pair.heyaAId,
        bId: pair.heyaBId,
        heat: pair.heat,
        aName: a?.name ?? pair.heyaAId,
        bName: b?.name ?? pair.heyaBId,
        tone: pair.heat >= 80 ? "bad_blood" : pair.heat >= 50 ? "rivalry" : "neutral",
      };
    }),
    stats: { total: normalized.length, inferno: infernoCount, hot: hotCount },
    heatmapData,
    playerRikishiNames,
  };
}

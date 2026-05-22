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
  const rivalriesState = (world as unknown as Record<string, unknown>).rivalries as
    | { pairs: Map<string, RivalryPairState> }
    | undefined;

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

  const normalized: RivalryPairState[] = [];
  for (const pair of rivalriesState.pairs.values()) {
    normalized.push(pair);
  }

  const player: RivalryPairState[] = [];
  const hot: RivalryPairState[] = [];
  const cool: RivalryPairState[] = [];

  for (const pair of normalized) {
    const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
    if (isPlayer) player.push(pair);
    else if ((pair.heat ?? 0) >= 55) hot.push(pair);
    else cool.push(pair);
  }

  const byHeat = (a: RivalryPairState, b: RivalryPairState) => (b.heat ?? 0) - (a.heat ?? 0);
  player.sort(byHeat);
  hot.sort(byHeat);
  cool.sort(byHeat);

  let infernoCount = 0;
  let hotCount = 0;
  for (const p of normalized) {
    const heat = p.heat ?? 0;
    if (heat >= 80) infernoCount++;
    else if (heat >= 55) hotCount++;
  }

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

  // ⚡ Bolt Optimization: Replace Object.entries().map() with a for...in loop
  // to avoid O(N) array allocations from Map/Tuple conversions and multiple iterations
  const stableRivalries = [];
  const pairs = world.heyaRivalryPairs || {};
  for (const key in pairs) {
    if (!Object.prototype.hasOwnProperty.call(pairs, key)) continue;
    const heat = pairs[key];
    const [aId, bId] = key.split("::");
    const a = world.heyas.get(aId);
    const b = world.heyas.get(bId);
    stableRivalries.push({
      aId,
      bId,
      heat,
      aName: a?.name ?? aId,
      bName: b?.name ?? bId,
      tone: heat >= 80 ? "bad_blood" : heat >= 50 ? "rivalry" : "neutral",
    });
  }

  return {
    playerRivalries: player,
    hotRivalries: hot,
    coolRivalries: cool,
    stableRivalries,
    stats: { total: normalized.length, inferno: infernoCount, hot: hotCount },
    heatmapData,
    playerRikishiNames,
  };
}

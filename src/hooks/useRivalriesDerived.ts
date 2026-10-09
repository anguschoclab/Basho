/**
 * useRivalriesDerived.ts
 *
 * Derived rivalry data for RivalriesPage — normalization, search
 * filtering, player/hot/cool bucketing, sorting, and stats.
 */

import { useMemo } from "react";
import type { RivalryPairState } from "@/presenters/engineAccess";
import { createDefaultRivalriesState, type RivalriesState } from "@/presenters/engineAccess";
import {
  projectRivalriesPage,
} from "@/presenters/projections/rivalriesProjections";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { WorldState } from "@/presenters/uiDigest";

const rivalryAccessor: Record<string, (p: RivalryPairState) => string | number | undefined> = {
  heat: (p) => p.heat ?? 0,
  wins: (p) => (p.aWins ?? 0) + (p.bWins ?? 0),
};

export function useRivalriesDerived(
  world: WorldState | null,
  playerHeyaId: string | null | undefined,
  searchQuery: string,
  sortKey: string,
  sortOrder: SortDirection,
) {
  const rivalriesState = useMemo<RivalriesState>(() => {
    if (!world) return createDefaultRivalriesState();
    const rs = world.rivalriesState;
    return rs && typeof rs === "object" && rs.pairs ? rs : createDefaultRivalriesState();
  }, [world]);

  const playerRikishiIds = useMemo(() => {
    if (!world || !playerHeyaId) return new Set<string>();
    const heya = getPlayerHeya(world);
    return new Set(heya?.rikishiIds ?? []);
  }, [world, playerHeyaId]);

  const derived = useMemo(() => {
    if (!world) {
      return {
        playerRivalries: [] as RivalryPairState[],
        hotRivalries: [] as RivalryPairState[],
        coolRivalries: [] as RivalryPairState[],
        stableRivalries: [] as ReturnType<typeof projectRivalriesPage>["stableRivalries"],
        stats: { total: 0, inferno: 0, hot: 0 },
      };
    }
    const rawPairs = Object.values(rivalriesState.pairs);
    const normalized: RivalryPairState[] = rawPairs
      .filter(
        (p) => p && typeof p === "object" && typeof p.aId === "string" && typeof p.bId === "string"
      )
      .map((p) => ({
        ...p,
        heat: Math.max(0, Math.min(100, Number(p.heat) || 0)),
        aWins: p.aWins ?? 0,
        bWins: p.bWins ?? 0,
        triggers: p.triggers || {},
        tone: p.tone || "respect",
      })) as RivalryPairState[];

    // Search filter
    const filtered = searchQuery
      ? normalized.filter((p) => {
          const a = world?.rikishi.get(p.aId);
          const b = world?.rikishi.get(p.bId);
          const q = searchQuery.toLowerCase();
          return a?.shikona?.toLowerCase().includes(q) || b?.shikona?.toLowerCase().includes(q);
        })
      : normalized;

    const player: RivalryPairState[] = [];
    const hot: RivalryPairState[] = [];
    const cool: RivalryPairState[] = [];

    for (const pair of filtered) {
      const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
      if (isPlayer) player.push(pair);
      else if ((pair.heat ?? 0) >= 55) hot.push(pair);
      else cool.push(pair);
    }

    const byHeat = (a: RivalryPairState, b: RivalryPairState) => (b.heat ?? 0) - (a.heat ?? 0);
    const sortFn = rivalryAccessor[sortKey];
    const applySort = (arr: RivalryPairState[]) => {
      if (!sortFn) return arr.sort(byHeat);
      return [...arr].sort((a, b) => compareBy(a, b, sortFn, sortOrder));
    };
    player.sort(byHeat);
    hot.sort(byHeat);
    cool.sort(byHeat);
    const playerSorted = applySort(player);
    const hotSorted = applySort(hot);
    const coolSorted = applySort(cool);

    let infernoCount = 0;
    let hotCount = 0;
    for (const p of normalized) {
      const heat = p.heat ?? 0;
      if (heat >= 80) infernoCount++;
      else if (heat >= 55) hotCount++;
    }

    const projections = projectRivalriesPage(world);

    return {
      playerRivalries: playerSorted,
      hotRivalries: hotSorted,
      coolRivalries: coolSorted,
      stableRivalries: projections.stableRivalries,
      stats: { total: normalized.length, inferno: infernoCount, hot: hotCount },
    };
  }, [rivalriesState, playerRikishiIds, searchQuery, world, sortKey, sortOrder]);

  return { ...derived, playerRikishiIds };
}

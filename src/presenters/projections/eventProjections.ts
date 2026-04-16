/**
 * eventProjections.ts
 *
 * Projections for event log, governance, basho results, press conference, and player context.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { WorldState } from "../../engine/types/world";
import { projectRikishi } from "../rikishiUI";

/**
 * Project event log data with rikishi/heya lookup functions.
 */
export function projectEventLogData(world: WorldState) {
  return {
    events: world.events?.log ?? [],
    getRikishi: (id: string) => {
      const r = world.rikishi.get(id);
      return r ? projectRikishi(r, world) : null;
    },
    getHeya: (id: string) => world.heyas.get(id),
    playerHeyaId: world.playerHeyaId,
  };
}

/**
 * Project governance summary with world stats.
 */
export function projectGovernanceSummary(world: WorldState) {
  return {
    governanceLog: world.governanceLog ?? [],
    year: world.year,
    heyasCount: world.heyas.size,
  };
}

/**
 * Project basho results with participant data.
 */
export function projectBashoResults(world: WorldState, lastBasho: any) {
  const getRikishiData = (id: string) => {
    const r = world.rikishi.get(id);
    if (!r) return null;
    const h = r.heyaId ? world.heyas.get(r.heyaId) : null;
    return { ...r, heyaName: h?.name ?? "Unknown Stable" };
  };

  const champion = lastBasho.yusho ? getRikishiData(lastBasho.yusho) : null;
  const isPlayerChampion = champion?.heyaId === world.playerHeyaId;

  const junYusho = (lastBasho.junYusho ?? []).map(getRikishiData).filter(Boolean);

  const matches = world.currentBasho?.matches || [];
  const kinboshi = matches
    .filter((m: any) => m.result?.isKinboshi)
    .map((m: any) => {
      const winner = world.rikishi.get(m.result.winnerRikishiId);
      const loser = world.rikishi.get(m.result.loserRikishiId);
      if (!winner || !loser) return null;
      return { winner: projectRikishi(winner, world), loser: projectRikishi(loser, world) };
    })
    .filter(Boolean);

  const ginoShoRikishi = lastBasho.ginoSho ? world.rikishi.get(lastBasho.ginoSho) : null;
  const ginoSho = ginoShoRikishi ? projectRikishi(ginoShoRikishi, world) : null;
  const shukunShoRikishi = lastBasho.shukunsho ? world.rikishi.get(lastBasho.shukunsho) : null;
  const shukunSho = shukunShoRikishi ? projectRikishi(shukunShoRikishi, world) : null;
  const kantoShoRikishi = lastBasho.kantoSho ? world.rikishi.get(lastBasho.kantoSho) : null;
  const kantoSho = kantoShoRikishi ? projectRikishi(kantoShoRikishi, world) : null;

  return {
    champion,
    isPlayerChampion,
    junYusho,
    kinboshi,
    ginoSho,
    shukunSho,
    kantoSho,
  };
}

/**
 * Project data for press conference questions.
 */
export function projectPressConferenceData(world: WorldState) {
  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  if (!playerHeya) return null;

  const lastBasho = world.history[world.history.length - 1];

  const totalWins = (playerHeya.rikishiIds ?? []).reduce((sum, id) => {
    const r = world.rikishi.get(id);
    return sum + (r?.currentBashoWins ?? 0);
  }, 0);
  const totalLosses = (playerHeya.rikishiIds ?? []).reduce((sum, id) => {
    const r = world.rikishi.get(id);
    return sum + (r?.currentBashoLosses ?? 0);
  }, 0);
  const winRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0.5;

  return {
    playerHeya,
    lastBasho,
    rosterStats: { totalWins, totalLosses, winRate },
  };
}

/**
 * Project player context for identification.
 */
export function projectPlayerContext(world: WorldState) {
  return {
    playerHeyaId: world.playerHeyaId,
  };
}

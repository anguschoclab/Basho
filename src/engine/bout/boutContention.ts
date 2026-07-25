/**
 * src/engine/bout/boutContention.ts
 * =================================
 * Yusho contention and playoff scenario detection.
 * Extracted from boutResolver.ts for SRP separation.
 */

import type { Rikishi } from "../types/rikishi";
import type { BashoState } from "../types/basho";
import { CONTENTION_WINDOW, FINAL_DAY } from "../../constants/engine/physics";

export function getLeaderWins(basho: BashoState): number {
  const standings = basho.standings;
  if (!standings || standings.size === 0) return 0;
  let maxWins = 0;
  for (const record of standings.values()) {
    if (record.wins > maxWins) maxWins = record.wins;
  }
  return maxWins;
}

export function isYushoContention(east: Rikishi, west: Rikishi, basho: BashoState): boolean {
  const standings = basho.standings;
  if (!standings || standings.size === 0) return false;

  const maxWins = getLeaderWins(basho);
  const eastWins = standings.get(east.id)?.wins ?? 0;
  const westWins = standings.get(west.id)?.wins ?? 0;

  return maxWins - eastWins <= CONTENTION_WINDOW && maxWins - westWins <= CONTENTION_WINDOW;
}

export function isPlayoffScenario(east: Rikishi, west: Rikishi, basho: BashoState): boolean {
  if (basho.day !== FINAL_DAY) return false;

  const standings = basho.standings;
  if (!standings || standings.size === 0) return false;

  const maxWins = getLeaderWins(basho);
  const eastWins = standings.get(east.id)?.wins ?? 0;
  const westWins = standings.get(west.id)?.wins ?? 0;

  return eastWins === maxWins && westWins === maxWins && eastWins === westWins;
}

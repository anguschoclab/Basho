/**
 * src/engine/bout/boutContention.ts
 * =================================
 * Yusho contention and playoff scenario detection.
 * Extracted from boutResolver.ts for SRP separation.
 *
 * BashoState.standings is a single flat map across EVERY division — all
 * leader math must scope to the bout's division (a Juryo leader must not
 * suppress a Makuuchi yusho race). For cross-division callup bouts each side
 * is measured against its own division's leader.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import { CONTENTION_WINDOW, FINAL_DAY } from "@/constants/engine/physics";

/** Max wins among standings entries whose rikishi competes in `division`. */
export function getLeaderWins(
  basho: BashoState,
  world: WorldState,
  division: Rikishi["division"]
): number {
  const standings = basho.standings;
  if (!standings || standings.size === 0) return 0;
  let maxWins = 0;
  for (const [rid, record] of standings) {
    const r = world.rikishi.get(rid);
    if (!r || r.division !== division) continue;
    if (record.wins > maxWins) maxWins = record.wins;
  }
  return maxWins;
}

export function isYushoContention(
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  world: WorldState
): boolean {
  const standings = basho.standings;
  if (!standings || standings.size === 0) return false;

  const inWindow = (r: Rikishi) =>
    getLeaderWins(basho, world, r.division) - (standings.get(r.id)?.wins ?? 0) <=
    CONTENTION_WINDOW;
  return inWindow(east) && inWindow(west);
}

export function isPlayoffScenario(
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  world: WorldState
): boolean {
  if (basho.day !== FINAL_DAY || east.division !== west.division) return false;

  const standings = basho.standings;
  if (!standings || standings.size === 0) return false;

  const maxWins = getLeaderWins(basho, world, east.division);
  const eastWins = standings.get(east.id)?.wins ?? 0;
  const westWins = standings.get(west.id)?.wins ?? 0;

  return eastWins === maxWins && westWins === maxWins && eastWins === westWins;
}

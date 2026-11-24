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
import type { BashoState, StandingsTableRuntime } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import { CONTENTION_WINDOW, FINAL_DAY } from "@/constants/engine/physics";

// Per-bout memo: the two isYushoContention leader scans (east + west division,
// plus isPlayoffScenario's third) share one full standings pass. Keyed on the
// standings Map object — standings are rebuilt as a new Map per bout, so the
// cache invalidates naturally; the rikishi-map guard covers swapped worlds.
const leaderWinsCache = new WeakMap<
  StandingsTableRuntime,
  { rikishi: WorldState["rikishi"]; byDivision: Map<Rikishi["division"], number> }
>();

function leaderWinsByDivision(
  basho: BashoState,
  world: WorldState
): Map<Rikishi["division"], number> {
  const standings = basho.standings;
  const cached = leaderWinsCache.get(standings);
  if (cached && cached.rikishi === world.rikishi) return cached.byDivision;

  const byDivision = new Map<Rikishi["division"], number>();
  for (const [rid, record] of standings) {
    const r = world.rikishi.get(rid);
    if (!r) continue;
    const current = byDivision.get(r.division) ?? 0;
    if (record.wins > current) byDivision.set(r.division, record.wins);
  }
  leaderWinsCache.set(standings, { rikishi: world.rikishi, byDivision });
  return byDivision;
}

/** Max wins among standings entries whose rikishi competes in `division`. */
export function getLeaderWins(
  basho: BashoState,
  world: WorldState,
  division: Rikishi["division"]
): number {
  const standings = basho.standings;
  if (!standings || standings.size === 0) return 0;
  return leaderWinsByDivision(basho, world).get(division) ?? 0;
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
    getLeaderWins(basho, world, r.division) - (standings.get(r.id)?.wins ?? 0) <= CONTENTION_WINDOW;
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

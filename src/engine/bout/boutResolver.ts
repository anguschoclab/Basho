import type { BoutContext } from "../bout/boutPhysics";
import type { Rikishi } from "../types/rikishi";
import type { BashoState, BoutResult, BashoName } from "../types/basho";
// We import the new cleaned physics runner 
import { resolveBoutPhysics } from "./boutPhysics";
// We import the pure narrative translator
import { generateBoutNarrative } from "./boutNarrative";
// Note: injuries module doesn't currently apply per-bout injuries.
// injuries.ts handles weekly rolls. If a bout-injury system is 
// implemented in injuries.ts, it will be injected here.

export function resolveBout(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState
): BoutResult {
  // 1. Run deterministic physics
  const result = resolveBoutPhysics(bout, east, west, basho);

  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;
    
  // 2. Generate narrative based on data frames
  generateBoutNarrative(result, east, west, bashoName, bout.day, `${result.boutId}-pbp`);

  // 2.5. Kinboshi Fact Stamping
  // Rule: If winner.division === 'Makuuchi' && winner.position === 'Maegashira' && loser.position === 'Yokozuna' && kimarite !== 'Fusensho' -> BoutResult.isKinboshi = true.
  const winner = result.winner === 'east' ? east : west;
  const loser = result.winner === 'east' ? west : east;

  if (
    winner.division === 'makuuchi' && 
    winner.rank === 'maegashira' && 
    loser.rank === 'yokozuna' && 
    result.kimarite !== 'fusensho'
  ) {
    result.isKinboshi = true;
  }

  // 3. Apply any ensuing injuries based on the bout's physical toll
  // (Left as a hook for narrative injuries)

  return result;
}

export function simulateBout(east: Rikishi, west: Rikishi, seed: string): BoutResult {
  const fakeBasho: BashoState = {
    id: "sim",
    year: 2025,
    day: 1,
    bashoName: "hatsu",
    bashoNumber: 1,
    matches: [],
    standings: new Map(),
    isActive: false,
  };
  const bout: BoutContext = { id: `sim-${seed}`, day: 1, rikishiEastId: east.id, rikishiWestId: west.id };
  return resolveBout(bout, east, west, fakeBasho);
}

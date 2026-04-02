import type { BoutContext } from "../bout/boutPhysics";
import type { Rikishi, RikishiAchievements } from "../types/rikishi";
import type { BashoState, BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
// We import the new cleaned physics runner 
import { resolveBoutPhysics } from "./boutPhysics";
// We import the pure narrative translator
import { generateBoutNarrative } from "./boutNarrative";
// Note: injuries module doesn't currently apply per-bout injuries.
import { RivalryService } from "../systems/narrative/RivalryService";
import { EntityCollection } from "../core/EntityCollection";
import { clamp } from "../utils/math";

export function resolveBout(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  playerTactic?: import("../types/combat").BoutTactic,
  world?: WorldState
): BoutResult {
  const ctxWithTactic = { ...bout, playerTactic };

  // --- PHASE 3: RIVALRY CONNECTIVITY ---
  let eastMod = 1.0;
  let westMod = 1.0;

  if (world) {
    const rivalryState = RivalryService.ensureRivalriesState(world);
    const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
    const pair = rivalryState.pairs[rivalryKey];

    if (pair) {
      // High heat increases aggression and mental intensity
      const heat01 = pair.heat / 100;
      eastMod = 1.0 + (heat01 * 0.15); // Up to 15% boost
      westMod = 1.0 + (heat01 * 0.15);
    }
  }

  // Clone rikishi to apply temporary bout-only modifiers
  const eastBout = { ...east, aggression: clamp((east.aggression || 50) * eastMod, 0, 100) };
  const westBout = { ...west, aggression: clamp((west.aggression || 50) * westMod, 0, 100) };

  // 1. Run deterministic physics
  const result = resolveBoutPhysics(ctxWithTactic, eastBout as Rikishi, westBout as Rikishi, basho);

  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;
    
  // 2. Generate narrative based on data frames
  generateBoutNarrative(result, east, west, bashoName, bout.day, `${result.boutId}-pbp`);

  // 2.5. Achievement Detection (Gold & Silver Stars - v2)
  const winner = result.winner === 'east' ? east : west;
  const loser = result.winner === 'east' ? west : east;

  // Initialize achievements if missing
  const defaultAchievements = (): RikishiAchievements => ({
    kinboshiEarned: 0,
    ginboshiEarned: 0,
    kinboshiConceded: 0,
    ginboshiConceded: 0,
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
  });

  if (!winner.stats.achievements) winner.stats.achievements = defaultAchievements();
  if (!loser.stats.achievements) loser.stats.achievements = defaultAchievements();

  // Rule: Kinboshi (Gold Star) - Maegashira defeats Yokozuna (excluding Fusensho)
  if (winner.rank === 'maegashira' && loser.rank === 'yokozuna' && result.kimarite !== 'fusensho') {
    result.awardFact = 'kinboshi';
    result.isKinboshi = true;
    winner.stats.achievements.kinboshiEarned++;
    loser.stats.achievements.kinboshiConceded++;
  } 
  // Rule: Ginboshi (Silver Star) - Maegashira defeats Ozeki (excluding Fusensho)
  else if (winner.rank === 'maegashira' && loser.rank === 'ozeki' && result.kimarite !== 'fusensho') {
    result.awardFact = 'ginboshi';
    winner.stats.achievements.ginboshiEarned++;
    loser.stats.achievements.ginboshiConceded++;
  }

  // 3. Update Rivalry State
  if (world) {
    RivalryService.onBoutResolved(world, { 
      result, 
      day: bout.day 
    });
  }

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

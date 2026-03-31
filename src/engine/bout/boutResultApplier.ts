/**
 * src/engine/bout/boutResultApplier.ts
 * 
 * Handles the application of a bout result to the world state.
 * Responsible for updating standings, stats, earnings, and notifying secondary systems.
 */

import type { WorldState } from "../types/world";
import type { BoutResult, MatchSchedule } from "../types/basho";
import { updateH2H } from "../h2h";
import { EventBus } from "../events";
import * as injuries from "../systems/health/InjuryService";
import * as rivalries from "../rivalries";
import * as economics from "../economics";
import * as scoutingStore from "../scoutingStore";
import { 
  updateMediaFromBout, 
  createDefaultMediaState 
} from "../systems/media/MediaService";
import { safeCall } from "../utils/safe";

/**
 * Apply the result of a single bout to the world.
 * 
 * @param world - The current world state.
 * @param match - The match schedule object being updated.
 * @param result - The result of the simulated bout.
 * @returns The updated world state.
 */
export function applyBoutResult(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult
): WorldState {
  const basho = world.currentBasho;
  if (!basho) return world;

  match.result = result;

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return world;

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // 1. Update Standing
  const standings = basho.standings;
  const wRec = standings.get(winner.id) || { wins: 0, losses: 0 };
  const lRec = standings.get(loser.id) || { wins: 0, losses: 0 };
  standings.set(winner.id, { wins: wRec.wins + 1, losses: wRec.losses });
  standings.set(loser.id, { wins: lRec.wins, losses: lRec.losses + 1 });

  // 2. Track Achievement Counters
  if (result.awardFact) {
    if (!winner.stats.achievements) {
      winner.stats.achievements = { 
        kinboshiEarned: 0, 
        ginboshiEarned: 0, 
        kinboshiConceded: 0, 
        ginboshiConceded: 0,
        specialPrizes: {
          shukunSho: 0,
          kantoSho: 0,
          ginoSho: 0
        }
      };
    }
    if (result.awardFact === 'kinboshi') {
      winner.stats.achievements.kinboshiEarned++;
      
      // Update legacy kinboshiCount for backward compatibility
      if (!winner.economics) {
        winner.economics = { 
          cash: 0, 
          retirementFund: 0, 
          careerKenshoWon: 0, 
          kinboshiCount: 0, 
          totalEarnings: 0, 
          currentBashoEarnings: 0, 
          popularity: 50 
        };
      }
      winner.economics.kinboshiCount = (winner.economics.kinboshiCount || 0) + 1;
    } else if (result.awardFact === 'ginboshi') {
      winner.stats.achievements.ginboshiEarned++;
    }
  }

  // 3. Update Head-to-Head Records
  safeCall(() => {
    const bashoId = world.currentBasho?.id ?? "unknown";
    const year = world.year ?? 0;
    updateH2H(winner, loser, result, bashoId, year, match.day);
  });

  // 4. Notify Secondary Systems
  safeCall(() => injuries.onBoutResolved(world, { match, result, east, west }));
  safeCall(() => rivalries.onBoutResolved(world, { match, result, east, west }));
  safeCall(() => economics.onBoutResolved(world, { match, result, east, west }));
  safeCall(() => scoutingStore.onBoutResolved(world, { match, result, east, west }));

  // 5. Update Media (generates headlines, heat, etc.)
  safeCall(() => {
    if (!world.mediaState) world.mediaState = createDefaultMediaState();
    const { state } = updateMediaFromBout({
      state: world.mediaState,
      world,
      result,
      day: match.day,
      bashoName: world.currentBashoName,
      division: east.division,
      rivalries: world.rivalriesState,
    });
    world.mediaState = state;
  });

  // 6. Emit Canonical Event
  EventBus.boutResult(world, result.winnerRikishiId, result.loserRikishiId, result.kimarite ?? "unknown", match.day);

  return world;
}

import type { WorldState } from "../types/world";
import type { BashoName, BoutResult, BashoSimResult, BanzukeUpdateHook } from "../types/basho";
import type { PromotionEvent, DemotionEvent } from "../types/banzuke";
import { simulateBout } from "../bout/boutResolver";
import { RANK_HIERARCHY } from "../banzuke";
import { initializeBasho } from "../systems/generation/WorldFactory";
import { generateFullBashoSchedule, scheduleAllDivisionsDay } from "../schedule";
import { stableTieBreak } from "../utils/sort";
import { resolveImpacts } from "../core/ImpactResolver";

/**
 * High-speed Tournament Simulation.
 * Resolves an entire basho deterministically without real-time delays.
 */
export function simulateEntireBasho(
  world: WorldState,
  bashoName: BashoName,
  seed: string,
  opts?: {
    banzukeUpdateHook?: BanzukeUpdateHook;
  }
): BashoSimResult {
  const basho = initializeBasho(world, bashoName);

  const standings = new Map<string, { wins: number; losses: number }>();
  const keyBouts: BoutResult[] = [];
  const injuries: string[] = [];

  // Initialize standings (sekitori only)
  for (const [id, rikishi] of world.rikishi) {
    if (rikishi.division === "makuuchi" || rikishi.division === "juryo") {
      standings.set(id, { wins: 0, losses: 0 });
      rikishi.currentBashoWins = 0;
      rikishi.currentBashoLosses = 0;
    }
  }

  // Pre-generate all 15 days of schedules at once for efficiency
  try {
    const scheduleImpact = generateFullBashoSchedule({ world, basho, seed });
    const resolvedWorld = resolveImpacts(world, [scheduleImpact]);
    Object.assign(world, resolvedWorld);
  } catch {
    for (let day = 1; day <= 15; day++) {
      const daySeed = `${seed}-day${day}`;
      const { impact } = scheduleAllDivisionsDay({ world, basho, day, seed: daySeed });
      const resolvedWorld = resolveImpacts(world, [impact]);
      Object.assign(world, resolvedWorld);
    }
  }

  // Simulate all 15 days
  for (let day = 1; day <= 15; day++) {
    const dayMatches = basho.matches.filter((m) => m.day === day && !m.result);

    for (let boutIndex = 0; boutIndex < dayMatches.length; boutIndex++) {
      const match = dayMatches[boutIndex];
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);

      if (!east || !west) continue;

      if (east.injured || west.injured) {
        // Fusen-sho / Fusen-paku (standardization point)
        const winner = east.injured ? west : east;
        const loser = east.injured ? east : west;

        winner.currentBashoWins = (winner.currentBashoWins ?? 0) + 1;
        loser.currentBashoLosses = (loser.currentBashoLosses ?? 0) + 1;

        const winnerStanding = standings.get(winner.id);
        const loserStanding = standings.get(loser.id);
        if (winnerStanding) winnerStanding.wins++;
        if (loserStanding) loserStanding.losses++;

        // Add fake bout result for stats consistency
        match.result = {
          boutId: match.boutId,
          winner: east.injured ? "west" : "east",
          winnerRikishiId: winner.id,
          loserRikishiId: loser.id,
          kimarite: "oshidashi",
          kimariteName: "Oshidashi",
          stance: "push-dominant",
          tachiaiWinner: east.injured ? "west" : "east",
          duration: 0,
          upset: false,
          kenshoEnvelopes: 0,
          log: [],
        };
        continue;
      }

      const boutSeed = `${seed}-d${day}-b${boutIndex}`;
      const result = simulateBout(east, west, boutSeed);
      match.result = result;

      const winner = result.winner === "east" ? east : west;
      const loser = result.winner === "east" ? west : east;

      winner.currentBashoWins = (winner.currentBashoWins ?? 0) + 1;
      loser.currentBashoLosses = (loser.currentBashoLosses ?? 0) + 1;

      const winnerStanding = standings.get(winner.id);
      const loserStanding = standings.get(loser.id);

      if (winnerStanding) winnerStanding.wins++;
      if (loserStanding) loserStanding.losses++;

      // Track key bouts (upsets, high-rank, senshuraku)
      const eastTier = RANK_HIERARCHY[east.rank]?.tier ?? 999;
      const westTier = RANK_HIERARCHY[west.rank]?.tier ?? 999;

      if (result.upset || day === 15 || eastTier <= 2 || westTier <= 2) {
        keyBouts.push(result);
      }

      if (east.injured) injuries.push(east.shikona);
      if (west.injured) injuries.push(west.shikona);
    }
  }

  // Determine yusho winner with canonical tie-breaking
  const sortedStandings = Array.from(standings.entries())
    .map(([id, stats]) => ({ id, rikishi: world.rikishi.get(id), ...stats }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || stableTieBreak(a.id, b.id));

  const yushoEntry = sortedStandings[0];
  const yushoWinner = {
    id: yushoEntry?.id || "",
    shikona: yushoEntry?.rikishi?.shikona || "Unknown",
    wins: yushoEntry?.wins ?? 0,
    losses: yushoEntry?.losses ?? 0,
  };

  const second = sortedStandings[1];
  const junYushoTargetWins = second ? second.wins : -1;
  const junYusho = sortedStandings
    .filter((s) => s.id !== yushoEntry?.id && s.wins === junYushoTargetWins)
    .map((s) => s.rikishi?.shikona ?? "Unknown");

  let promotions: PromotionEvent[] = [];
  let demotions: DemotionEvent[] = [];

  if (opts?.banzukeUpdateHook) {
    const hookResult = opts.banzukeUpdateHook({
      world,
      bashoName,
      year: world.year,
      standings,
      seed: `${seed}-banzuke`,
    });
    promotions = hookResult.promotions;
    demotions = hookResult.demotions;
  }

  return {
    bashoName,
    year: world.year,
    yushoWinner,
    junYusho,
    standings,
    keyBouts,
    injuries: Array.from(new Set(injuries)),
    promotions,
    demotions,
  };
}

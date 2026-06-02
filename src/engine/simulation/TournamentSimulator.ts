import type { WorldState } from "../types/world";
import type { BashoName, BoutResult, BashoSimResult, BanzukeUpdateHook } from "../types/basho";
import type { PromotionEvent, DemotionEvent } from "../types/banzuke";
import { simulateBout } from "../bout/boutResolver";
import { RANK_HIERARCHY } from "../banzuke";
import { initializeBasho } from "../systems/generation/WorldFactory";
import { generateFullBashoSchedule, scheduleAllDivisionsDay } from "../schedule";
import { stableTieBreak } from "../utils/sort";
import { resolveImpacts } from "../core/ImpactResolver";
import { getRikishi } from "../queries";

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

  // Set currentBasho on world so the impact resolver can append matches to it
  world.currentBasho = basho;

  const standings = new Map<string, { wins: number; losses: number }>();
  const keyBouts: BoutResult[] = [];
  const injuries: string[] = [];

  // Initialize standings (sekitori only)
  for (const id of world.activeRikishiIds) {
    const rikishi = getRikishi(world, id);
    if (!rikishi) continue;
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

  // After schedule generation, read matches from world.currentBasho (impact resolver put them there)
  const activeBasho = world.currentBasho ?? basho;

  // Simulate all 15 days
  for (let day = 1; day <= 15; day++) {
    const dayMatches = activeBasho.matches.filter((m) => m.day === day && !m.result);

    for (let boutIndex = 0; boutIndex < dayMatches.length; boutIndex++) {
      const match = dayMatches[boutIndex];
      const east = getRikishi(world, match.eastRikishiId);
      const west = getRikishi(world, match.westRikishiId);

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
    .map(([id, stats]) => ({ id, rikishi: getRikishi(world, id), ...stats }))
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

  // --- STATE PERSISTENCE ---
  const nextRikishiMap = new Map(world.rikishi);
  const nextHeyaMap = new Map(world.heyas);

  // 1. Update all rikishi who participated
  standings.forEach((stats, id) => {
    const r = nextRikishiMap.get(id);
    if (r) {
      const updated = {
        ...r,
        careerWins: (r.careerWins || 0) + stats.wins,
        careerLosses: (r.careerLosses || 0) + stats.losses,
        careerAbsences: (r.careerAbsences || 0) + (stats.absences || 0),
        currentBashoWins: stats.wins,
        currentBashoLosses: stats.losses,
      };

      // Update division-specific records
      if (updated.divisionRecords?.[r.division]) {
        updated.divisionRecords[r.division].wins += stats.wins;
        updated.divisionRecords[r.division].losses += stats.losses;
      }

      nextRikishiMap.set(id, updated);
    }
  });

  // 2. Update Yusho Winner and their stable
  if (yushoWinner.id) {
    const winner = nextRikishiMap.get(yushoWinner.id);
    if (winner) {
      nextRikishiMap.set(yushoWinner.id, {
        ...winner,
        consecutiveYusho: (winner.consecutiveYusho || 0) + 1,
      });

      const heya = nextHeyaMap.get(winner.heyaId);
      if (heya) {
        nextHeyaMap.set(winner.heyaId, {
          ...heya,
          historicalYusho: (heya.historicalYusho || 0) + 1,
        });
      }
    }
  }

  // 3. Update Global Kimarite Stats
  const globalKimariteStats = { ...(world.globalKimariteStats || {}) };
  activeBasho.matches.forEach((m) => {
    if (m.result?.kimarite) {
      globalKimariteStats[m.result.kimarite] = (globalKimariteStats[m.result.kimarite] || 0) + 1;
    }
  });

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
    world: {
      ...world,
      rikishi: nextRikishiMap,
      heyas: nextHeyaMap,
      globalKimariteStats,
    },
  };
}

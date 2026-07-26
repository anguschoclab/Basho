import type { WorldState } from "../types/world";
import type {
  BashoName,
  BoutResult,
  BashoSimResult,
  BanzukeUpdateHook,
  MatchSchedule,
} from "../types/basho";
import type { PromotionEvent, DemotionEvent } from "../types/banzuke";
import { simulateBout } from "../bout/boutResolver";
import { RANK_HIERARCHY } from "../banzuke";
import { initializeBasho } from "../systems/generation/WorldFactory";
import { generateFullBashoSchedule, scheduleAllDivisionsDay } from "../schedule";
import { stableTieBreak, sortStandings } from "../utils/sort";
import { resolveImpacts } from "../core/ImpactResolver";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
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

  // Work on a shallow clone to avoid mutating the caller's world
  let workingWorld: WorldState = {
    ...world,
    rikishi: new Map(world.rikishi),
    heyas: new Map(world.heyas),
    currentBasho: basho,
  };

  const standings = new Map<string, { wins: number; losses: number; absences?: number }>();
  const keyBouts: BoutResult[] = [];
  const injuries: string[] = [];

  // Initialize standings (sekitori only)
  for (const id of workingWorld.activeRikishiIds) {
    const rikishi = getRikishi(workingWorld, id);
    if (!rikishi) continue;
    if (isSekitoriDivision(rikishi.division)) {
      standings.set(id, { wins: 0, losses: 0 });
      const nextRikishi = { ...rikishi, currentBashoWins: 0, currentBashoLosses: 0 };
      workingWorld.rikishi.set(id, nextRikishi);
    }
  }

  // Pre-generate all 15 days of schedules at once for efficiency
  try {
    const scheduleImpact = generateFullBashoSchedule({ world: workingWorld, basho, seed });
    workingWorld = resolveImpacts(workingWorld, [scheduleImpact]);
  } catch {
    for (let day = 1; day <= 15; day++) {
      const daySeed = `${seed}-day${day}`;
      const { impact } = scheduleAllDivisionsDay({
        world: workingWorld,
        basho,
        day,
        seed: daySeed,
      });
      workingWorld = resolveImpacts(workingWorld, [impact]);
    }
  }

  // After schedule generation, read matches from workingWorld.currentBasho (impact resolver put them there)
  const activeBasho = workingWorld.currentBasho ?? basho;

  // Pre-group matches by day for O(1) lookup instead of O(N*M) filter per day
  const matchesByDay = new Map<number, MatchSchedule[]>();
  for (const m of activeBasho.matches) {
    let dayArr = matchesByDay.get(m.day);
    if (!dayArr) {
      dayArr = [];
      matchesByDay.set(m.day, dayArr);
    }
    dayArr.push(m);
  }

  // Simulate all 15 days
  for (let day = 1; day <= 15; day++) {
    const dayMatches = (matchesByDay.get(day) ?? []).filter((m) => !m.result);

    for (let boutIndex = 0; boutIndex < dayMatches.length; boutIndex++) {
      const match = dayMatches[boutIndex];
      const east = getRikishi(workingWorld, match.eastRikishiId);
      const west = getRikishi(workingWorld, match.westRikishiId);

      if (!east || !west) continue;

      if (east.injured || west.injured || east.isKyujo || west.isKyujo || east.isRetired || west.isRetired) {
        // Fusen-sho / Fusen-paku (standardization point)
        const eastAbsent = east.injured || east.isKyujo || east.isRetired;
        const winner = eastAbsent ? west : east;
        const loser = eastAbsent ? east : west;

        winner.currentBashoWins = (winner.currentBashoWins ?? 0) + 1;
        loser.currentBashoLosses = (loser.currentBashoLosses ?? 0) + 1;

        const winnerStanding = standings.get(winner.id);
        const loserStanding = standings.get(loser.id);
        if (winnerStanding) winnerStanding.wins++;
        if (loserStanding) {
          loserStanding.losses++;
          loserStanding.absences = (loserStanding.absences ?? 0) + 1;
        }

        // Add fake bout result for stats consistency
        match.result = {
          boutId: match.boutId,
          winner: eastAbsent ? "west" : "east",
          winnerRikishiId: winner.id,
          loserRikishiId: loser.id,
          kimarite: "fusensho",
          kimariteName: "Fusensh\u014d",
          stance: "no-grip",
          tachiaiWinner: eastAbsent ? "west" : "east",
          duration: 0,
          upset: false,
          kenshoEnvelopes: 0,
          log: [],
        };
        continue;
      }

      const boutSeed = `${seed}-d${day}-b${boutIndex}`;
      const { result } = simulateBout(east, west, boutSeed);
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
  const sortedStandings: Array<{ id: string; rikishi: ReturnType<typeof getRikishi>; wins: number; losses: number }> = [];
  for (const [id, stats] of standings.entries()) {
    sortedStandings.push({ id, rikishi: getRikishi(workingWorld, id), wins: stats.wins, losses: stats.losses });
  }
  const finalStandings = sortStandings(sortedStandings, (a, b) => stableTieBreak(a.id, b.id));

  const yushoEntry = finalStandings[0];
  const yushoWinner = {
    id: yushoEntry?.id || "",
    shikona: yushoEntry?.rikishi?.shikona || "Unknown",
    wins: yushoEntry?.wins ?? 0,
    losses: yushoEntry?.losses ?? 0,
  };

  const second = finalStandings[1];
  const junYushoTargetWins = second ? second.wins : -1;
  const junYusho: string[] = [];
  for (const s of finalStandings) {
    if (s.id !== yushoEntry?.id && s.wins === junYushoTargetWins) {
      junYusho.push(s.id);
    }
  }

  let promotions: PromotionEvent[] = [];
  let demotions: DemotionEvent[] = [];

  if (opts?.banzukeUpdateHook) {
    const hookResult = opts.banzukeUpdateHook({
      world: workingWorld,
      bashoName,
      year: workingWorld.year,
      standings,
      seed: `${seed}-banzuke`,
    });
    promotions = hookResult.promotions;
    demotions = hookResult.demotions;
  }

  // --- STATE PERSISTENCE ---
  const nextRikishiMap = new Map(workingWorld.rikishi);
  const nextHeyaMap = new Map(workingWorld.heyas);

  // 1. Update all rikishi who participated
  standings.forEach((stats, id) => {
    const r = nextRikishiMap.get(id);
    if (r) {
      const updated = {
        ...r,
        careerWins: (r.careerWins ?? 0) + stats.wins,
        careerLosses: (r.careerLosses ?? 0) + stats.losses,
        careerAbsences: (r.careerAbsences ?? 0) + (stats.absences ?? 0),
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
  const globalKimariteStats = { ...(workingWorld.globalKimariteStats || {}) };
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
    finalWorld: {
      ...workingWorld,
      rikishi: nextRikishiMap,
      heyas: nextHeyaMap,
      globalKimariteStats,
    },
  };
}

import type { WorldState } from "../types/world";
import type {
  BashoName,
  BoutResult,
  BashoSimResult,
  BanzukeUpdateHook,
  MatchSchedule,
  BashoState,
} from "../types/basho";
import type { PromotionEvent, DemotionEvent } from "../types/banzuke";
import { simulateBout } from "../bout/boutResolver";
import { RANK_HIERARCHY } from "../banzuke";
import { initializeBasho } from "../systems/generation/WorldFactory";
import { scheduleAllDivisionsDay } from "../schedule";
import { stableTieBreak, sortStandings } from "../utils/sort";
import { resolveImpacts } from "../core/ImpactResolver";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { getRikishi } from "../queries";
import { resolvePlayoffs } from "../lifecycle/PlayoffResolver";

interface StandingEntry {
  id: string;
  rikishi: ReturnType<typeof getRikishi>;
  wins: number;
  losses: number;
}

/**
 * Crown the headline yusho winner. The yusho race is makuuchi-only
 * (standings include juryo) — mirrors concludeBashoCompetition. A shared
 * top record resolves via canonical kettei-sen (resolvePlayoffs), not an
 * arbitrary stable tie-break (V10-B15).
 */
function crownYushoWinner(
  world: WorldState,
  basho: BashoState,
  sortedStandings: StandingEntry[]
): {
  yushoEntry: StandingEntry | undefined;
  finalStandings: StandingEntry[];
  playoffMatches: MatchSchedule[];
} {
  const makuuchi = sortedStandings.filter((s) => s.rikishi?.division === "makuuchi");
  const finalStandings = sortStandings(makuuchi.length > 0 ? makuuchi : sortedStandings, (a, b) =>
    stableTieBreak(a.id, b.id)
  );

  const topWins = finalStandings[0]?.wins ?? -1;
  const tied = finalStandings.filter((s) => s.wins === topWins).map((s) => s.id);
  const playoffMatches: MatchSchedule[] = [];
  let yushoEntry = finalStandings[0];
  if (tied.length > 1) {
    const playoff = resolvePlayoffs(world, basho, tied);
    playoffMatches.push(...playoff.matches);
    yushoEntry = finalStandings.find((s) => s.id === playoff.winner) ?? yushoEntry;
  }
  return { yushoEntry, finalStandings, playoffMatches };
}

/**
 * Rebuild basho.standings from played results so Swiss pairing sees real
 * records for every division (the local `standings` map only tracks
 * sekitori for the sim result).
 */
function syncBashoStandings(basho: BashoState): void {
  const table = new Map<string, { wins: number; losses: number }>();
  for (const m of basho.matches) {
    if (!m.result) continue;
    const w = table.get(m.result.winnerRikishiId) ?? { wins: 0, losses: 0 };
    w.wins++;
    table.set(m.result.winnerRikishiId, w);
    const l = table.get(m.result.loserRikishiId) ?? { wins: 0, losses: 0 };
    l.losses++;
    table.set(m.result.loserRikishiId, l);
  }
  basho.standings = table;
}

type StandingsMap = Map<string, { wins: number; losses: number; absences?: number }>;

/**
 * Fusen-sho / Fusen-paku (standardization point): record an absence-based
 * default win and write a fake bout result for stats consistency.
 */
function applyFusensho(
  match: MatchSchedule,
  east: NonNullable<ReturnType<typeof getRikishi>>,
  west: NonNullable<ReturnType<typeof getRikishi>>,
  standings: StandingsMap
): void {
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

  match.result = {
    boutId: match.boutId,
    winner: eastAbsent ? "west" : "east",
    winnerRikishiId: winner.id,
    loserRikishiId: loser.id,
    kimarite: "fusensho",
    kimariteName: "Fusenshō",
    stance: "no-grip",
    tachiaiWinner: eastAbsent ? "west" : "east",
    duration: 0,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };
}

/**
 * Simulate one day: schedule against current standings, then resolve each
 * unplayed match. Returns the (possibly replaced) basho state.
 */
function simulateDay(
  workingWorld: WorldState,
  activeBasho: BashoState,
  day: number,
  seed: string,
  standings: StandingsMap,
  keyBouts: BoutResult[],
  injuries: string[]
): { world: WorldState; basho: BashoState } {
  activeBasho.day = day;
  syncBashoStandings(activeBasho);
  const { impact } = scheduleAllDivisionsDay({
    world: workingWorld,
    basho: activeBasho,
    day,
    seed,
  });
  workingWorld = resolveImpacts(workingWorld, [impact]);
  activeBasho = workingWorld.currentBasho ?? activeBasho;
  const dayMatches = activeBasho.matches.filter((m) => m.day === day && !m.result);

  for (let boutIndex = 0; boutIndex < dayMatches.length; boutIndex++) {
    const match = dayMatches[boutIndex];
    const east = getRikishi(workingWorld, match.eastRikishiId);
    const west = getRikishi(workingWorld, match.westRikishiId);

    if (!east || !west) continue;

    const eitherAbsent =
      east.injured ||
      west.injured ||
      east.isKyujo ||
      west.isKyujo ||
      east.isRetired ||
      west.isRetired;
    if (eitherAbsent) {
      applyFusensho(match, east, west, standings);
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

  return { world: workingWorld, basho: activeBasho };
}

/**
 * Persist basho outcomes back into a final WorldState snapshot: career
 * records, yusho/heya honors, and global kimarite tallies.
 */
function persistBashoState(
  workingWorld: WorldState,
  activeBasho: BashoState,
  standings: StandingsMap,
  yushoWinnerId: string
): {
  rikishi: Map<string, NonNullable<ReturnType<typeof getRikishi>>>;
  heyas: WorldState["heyas"];
  globalKimariteStats: Record<string, number>;
  allTimeKimariteStats: Record<string, number>;
} {
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
  if (yushoWinnerId) {
    const winner = nextRikishiMap.get(yushoWinnerId);
    if (winner) {
      nextRikishiMap.set(yushoWinnerId, {
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

  // 3. Update Global Kimarite Stats (era + never-reset all-time accumulator)
  const globalKimariteStats = { ...(workingWorld.globalKimariteStats || {}) };
  const allTimeKimariteStats = { ...(workingWorld.allTimeKimariteStats || {}) };
  activeBasho.matches.forEach((m) => {
    if (m.result?.kimarite) {
      globalKimariteStats[m.result.kimarite] = (globalKimariteStats[m.result.kimarite] || 0) + 1;
      allTimeKimariteStats[m.result.kimarite] = (allTimeKimariteStats[m.result.kimarite] || 0) + 1;
    }
  });

  return {
    rikishi: nextRikishiMap,
    heyas: nextHeyaMap,
    globalKimariteStats,
    allTimeKimariteStats,
  };
}

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

  const standings: StandingsMap = new Map();
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

  // Adaptive per-day torikumi (V10-R11): schedule each day against the
  // current standings so Swiss pairing reacts to results — mirrors the
  // interactive path (ensureDaySchedule). A fully pre-generated schedule
  // let multiple rikishi finish undefeated without meeting.
  let activeBasho = workingWorld.currentBasho ?? basho;

  // Simulate all 15 days
  for (let day = 1; day <= 15; day++) {
    const out = simulateDay(workingWorld, activeBasho, day, seed, standings, keyBouts, injuries);
    workingWorld = out.world;
    activeBasho = out.basho;
  }

  // Determine yusho winner with canonical tie-breaking
  const sortedStandings: Array<{
    id: string;
    rikishi: ReturnType<typeof getRikishi>;
    wins: number;
    losses: number;
  }> = [];
  for (const [id, stats] of standings.entries()) {
    sortedStandings.push({
      id,
      rikishi: getRikishi(workingWorld, id),
      wins: stats.wins,
      losses: stats.losses,
    });
  }
  const { yushoEntry, finalStandings, playoffMatches } = crownYushoWinner(
    workingWorld,
    activeBasho,
    sortedStandings
  );

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
  const persisted = persistBashoState(workingWorld, activeBasho, standings, yushoWinner.id);

  return {
    bashoName,
    year: world.year,
    yushoWinner,
    junYusho,
    standings,
    keyBouts,
    playoffMatches,
    injuries: Array.from(new Set(injuries)),
    promotions,
    demotions,
    finalWorld: {
      ...workingWorld,
      rikishi: persisted.rikishi,
      heyas: persisted.heyas,
      globalKimariteStats: persisted.globalKimariteStats,
      allTimeKimariteStats: persisted.allTimeKimariteStats,
    },
  };
}

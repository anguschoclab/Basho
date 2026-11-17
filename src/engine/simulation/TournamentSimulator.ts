import type { WorldState } from "@/engine/types/world";
import type {
  BashoName,
  BoutResult,
  BashoSimResult,
  BanzukeUpdateHook,
  MatchSchedule,
  BashoState,
} from "@/engine/types/basho";
import type { PromotionEvent, DemotionEvent } from "@/engine/types/banzuke";
import { resolveAndApplyBout } from "@/engine/bout/boutPipeline";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { initializeBasho } from "@/engine/generation/WorldFactory";
import { scheduleAllDivisionsDay } from "@/engine/calendar/schedule";
import { stableTieBreak, sortStandings } from "@/engine/utils/sort";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { evaluateNpcMorningKyujo } from "@/engine/tick/phases/phase01_basho_npc_tactics";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { getRikishi } from "@/engine/core/queries";
import { resolvePlayoffs } from "@/engine/lifecycle/PlayoffResolver";

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
  const tied: string[] = [];
  for (let i = 0; i < finalStandings.length; i++) {
    if (finalStandings[i].wins === topWins) {
      tied.push(finalStandings[i].id);
    }
  }
  const playoffMatches: MatchSchedule[] = [];
  let yushoEntry = finalStandings[0];
  if (tied.length > 1) {
    const playoff = resolvePlayoffs(world, basho, tied);
    playoffMatches.push(...playoff.matches);
    yushoEntry = finalStandings.find((s) => s.id === playoff.winner) ?? yushoEntry;
  }
  return { yushoEntry, finalStandings, playoffMatches };
}

type StandingsMap = Map<string, { wins: number; losses: number; absences?: number }>;

/**
 * Simulate one day: schedule against current standings, then resolve each
 * unplayed match through the SHARED bout pipeline (resolveAndApplyBout —
 * the same path the interactive and batch resolvers take). Absence,
 * fusensho, standings, career records, h2h, injury application, and media
 * all come from the canonical applier — no sim-local bookkeeping.
 * Returns the (possibly replaced) basho state.
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
  const { impact } = scheduleAllDivisionsDay({
    world: workingWorld,
    basho: activeBasho,
    day,
    seed,
  });
  workingWorld = resolveImpacts(workingWorld, [impact]);
  activeBasho = workingWorld.currentBasho ?? activeBasho;

  // NPC day-of kyujo evaluation (W A parity): injured NPCs on the new
  // card withdraw per the same matrix the tick + interactive paths use —
  // their bouts become fusensho through the canonical absence gate.
  const morningBuilder = createImpactBuilder("simMorningKyujo");
  evaluateNpcMorningKyujo(workingWorld, morningBuilder);
  workingWorld = resolveImpacts(workingWorld, [morningBuilder.build()]);

  const dayMatches = activeBasho.matches.filter((m) => m.day === day && !m.result);

  for (let boutIndex = 0; boutIndex < dayMatches.length; boutIndex++) {
    const match = dayMatches[boutIndex];
    const east = getRikishi(workingWorld, match.eastRikishiId);
    const west = getRikishi(workingWorld, match.westRikishiId);

    if (!east || !west) continue;
    const eastWasInjured = !!east.injured;
    const westWasInjured = !!west.injured;

    const {
      world: nextWorld,
      result,
      updatedStandings,
    } = resolveAndApplyBout(
      workingWorld,
      activeBasho,
      match,
      undefined,
      `${seed}-d${day}-b${boutIndex}`
    );
    workingWorld = nextWorld;
    activeBasho = workingWorld.currentBasho ?? activeBasho;
    if (!result) continue;

    match.result = result;

    // Persist authoritative standings back onto the basho so the next day's
    // Swiss pairing sees real records (W0: replaces the sim-local rebuild,
    // which diverged, and the final day's results were never synced).
    if (updatedStandings) {
      activeBasho = { ...activeBasho, standings: updatedStandings };
      workingWorld = { ...workingWorld, currentBasho: activeBasho };
    }

    // Track key bouts (upsets, high-rank, senshuraku)
    const eastTier = RANK_HIERARCHY[east.rank]?.tier ?? 999;
    const westTier = RANK_HIERARCHY[west.rank]?.tier ?? 999;

    if (result.upset || day === 15 || eastTier <= 2 || westTier <= 2) {
      keyBouts.push(result);
    }

    // Injury channel (W0/V18-T2): previously dead code — the absent-check
    // filtered injured rikishi before this read. Now fed by the real
    // in-bout injury payload plus post-bout injury rolls applied through
    // applyBoutResult → InjuryService.
    if (result.inBoutInjury) {
      const hurt =
        workingWorld.rikishi.get(result.inBoutInjury.rikishiId) ??
        (result.inBoutInjury.rikishiId === east.id ? east : west);
      injuries.push(hurt.shikona);
    }
    for (const [wasInjured, r] of [
      [eastWasInjured, east],
      [westWasInjured, west],
    ] as const) {
      if (!wasInjured && workingWorld.rikishi.get(r.id)?.injured) {
        injuries.push(r.shikona);
      }
    }
  }

  // Sync the sekitori-only return map from the authoritative basho
  // standings at day end. A fusenshō sits in the losses column (fusenpai
  // convention); the days missed after withdrawal are the absence count.
  for (const [id, entry] of standings) {
    const rec = activeBasho.standings.get(id);
    if (rec) {
      entry.wins = rec.wins;
      entry.losses = rec.losses;
      entry.absences = Math.max(0, day - rec.wins - rec.losses);
    }
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
  yushoWinnerId: string
): {
  rikishi: Map<string, NonNullable<ReturnType<typeof getRikishi>>>;
  heyas: WorldState["heyas"];
  globalKimariteStats: Record<string, number>;
  allTimeKimariteStats: Record<string, number>;
} {
  const nextRikishiMap = new Map(workingWorld.rikishi);
  const nextHeyaMap = new Map(workingWorld.heyas);
  // NOTE: career W/L + divisionRecords were previously accumulated here from
  // the local standings map; applyBoutResult now writes them per-bout (W0).

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

    // Every other rikishi's title streak ends when the basho concludes —
    // including kyujo / non-participants, so the sweep covers the full map.
    for (const [id, r] of nextRikishiMap) {
      if (id !== yushoWinnerId && r.consecutiveYusho) {
        nextRikishiMap.set(id, { ...r, consecutiveYusho: 0 });
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
  const bashoBase = initializeBasho(world, bashoName);
  // Fold the caller's seed into basho.id once — physics seeds derive from
  // basho.id + year + day + sorted rikishi ids, so this keeps the production
  // seed *shape* while preserving per-sim seed variance (W0).
  const basho: BashoState = { ...bashoBase, id: `${bashoBase.id}-sim-${seed}` };

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

  // Initialize standings (sekitori only) and clone EVERY participant into
  // the working map — not just sekitori. Bout resolution routes through
  // resolveAndApplyBout → applyBoutResult, which writes career/basho records
  // via impacts; uncloned lower-division entries are the caller's own objects
  // and would leak sim state back (V18-T1).
  for (const id of workingWorld.activeRikishiIds) {
    const rikishi = getRikishi(workingWorld, id);
    if (!rikishi) continue;
    workingWorld.rikishi.set(id, {
      ...rikishi,
      currentBashoWins: 0,
      currentBashoLosses: 0,
    });
    if (isSekitoriDivision(rikishi.division)) {
      standings.set(id, { wins: 0, losses: 0 });
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
  const persisted = persistBashoState(workingWorld, activeBasho, yushoWinner.id);

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

import { EventBus } from "../events";
import { stableTieBreak } from "../utils/sort";
import { determineSpecialPrizes } from "../banzuke";
import { onBashoEnded } from "../records";
import { buildAlmanacSnapshot } from "../almanac";
import { snapshotMediaHeatForBasho } from "../systems/media/MediaService";
import { autosave } from "../saveload";
import { safeCall } from "../utils/safe";
import { enterPostBasho } from "../tick/tickDaily";
import { rngForWorld, rngFromSeed } from "../rng";
import { BardEngine } from "../narrative/BardEngine";
import { resolveBout } from "../bout/boutResolver";
import type { WorldState } from "../types/world";
import type { BashoState, BashoResult, MatchSchedule } from "../types/basho";
import type { Id } from "../types/common";

/**
 * Run a single-elimination playoff among tied yūshō candidates.
 * Uses resolveBout (physics + narrative + rivalry update) but skips the
 * full applyBoutResult side-effects (no standings mutation, no kenshō).
 * The bracket is deterministically shuffled via the world seed.
 */
function resolvePlayoffs(
  world: WorldState,
  basho: BashoState,
  candidates: Id[]
): { winner: Id; matches: MatchSchedule[] } {
  const allMatches: MatchSchedule[] = [];
  const rng = rngForWorld(world, "combat", `playoff::${basho.bashoName}::${world.year}`);
  let round = rng.shuffle(candidates.slice());
  let day = 16;

  while (round.length > 1) {
    const next: Id[] = [];
    const bouts: Array<[Id, Id]> = [];

    for (let i = 0; i + 1 < round.length; i += 2) {
      bouts.push([round[i], round[i + 1]]);
    }
    const bye = round.length % 2 === 1 ? round[round.length - 1] : null;

    for (const [eastId, westId] of bouts) {
      const east = world.rikishi.get(eastId);
      const west = world.rikishi.get(westId);
      if (!east || !west) {
        next.push(eastId);
        continue;
      }
      const boutId = `playoff-${world.year}-${basho.bashoName}-d${day}-${eastId}-${westId}`;
      const result = resolveBout(
        { id: boutId, day, rikishiEastId: eastId, rikishiWestId: westId },
        east, west, basho, undefined, world
      );
      allMatches.push({ boutId, day, eastRikishiId: eastId, westRikishiId: westId, result });
      next.push(result.winnerRikishiId);
    }

    if (bye) next.push(bye);
    round = next;
    day++;
  }

  return { winner: round[0], matches: allMatches };
}



function calculateStandings(basho: BashoState): { topCandidates: Id[], bestWins: number, table: Array<{id: Id, wins: number, losses: number}> } {
  const table: Array<{id: Id, wins: number, losses: number}> = [];
  const standingsEntries = basho.standings instanceof Map 
    ? Array.from(basho.standings.entries()) 
    : Object.entries(basho.standings);

  for (const [id, rec] of standingsEntries) {
    const s = rec as { wins: number; losses: number };
    table.push({ id, wins: s.wins, losses: s.losses });
  }

  table.sort((a, b) => b.wins - a.wins || a.losses - b.losses || stableTieBreak(a.id, b.id));

  if (table.length === 0) return { topCandidates: [], bestWins: 0, table };

  const bestWins = table[0].wins;
  const topCandidates = table.reduce<Id[]>((acc, t) => {
    if (t.wins === bestWins) acc.push(t.id);
    return acc;
  }, []);

  return { topCandidates, bestWins, table };
}

function distributePrizes(world: WorldState, basho: BashoState, yusho: Id) {
  const prizes = determineSpecialPrizes(basho.matches, world.rikishi, yusho);

  const SANSHO_PRIZE_AMOUNT = 2000000;
  const awardTypes = {
    shukunsho: 'Shukun',
    kantosho: 'Kanto',
    ginoSho: 'Gino'
  } as const;

  for (const [key, type] of Object.entries(awardTypes)) {
    const rikishiId = (prizes as Record<string, any>)[key] as string | undefined;
    if (rikishiId) {
      const r = world.rikishi.get(rikishiId);
      if (r) {
        if (r.stats?.achievements?.specialPrizes) {
          const sp = r.stats.achievements.specialPrizes;
          if (type === 'Shukun') sp.shukunSho++;
          else if (type === 'Kanto') sp.kantoSho++;
          else if (type === 'Gino') sp.ginoSho++;
        }
        
        EventBus.awardConferred(world, {
          rikishiId: r.id,
          heyaId: r.heyaId,
          money: SANSHO_PRIZE_AMOUNT,
          status: "special_prize",
          regimen: type as string // e.g. 'Shukun'
        });
        const heya = world.heyas.get(r.heyaId);
        if (heya) heya.funds += SANSHO_PRIZE_AMOUNT;
      }
    }
  }

  return prizes;
}

function recordBashoHistory(
  world: WorldState,
  basho: BashoState,
  yusho: Id,
  topCandidates: Id[],
  playoffMatches: MatchSchedule[],
  prizes: ReturnType<typeof determineSpecialPrizes>,
  bestWins: number
) {
  const rng = rngForWorld(world, "history", `basho_result_${world.year}_${basho.bashoName}`);
  
  const result: BashoResult = {
    id: rng.uuid('HI'),
    year: world.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    yusho,
    junYusho: topCandidates.filter(id => id !== yusho),
    ...prizes,
    playoffMatches,
    prizes: {
      yushoAmount: 10000000,
      junYushoAmount: 2000000,
      specialPrizes: 2000000
    }
  };

  if (!world.history) world.history = [];
  world.history.push(result);

  safeCall(() => {
    const snapshot = buildAlmanacSnapshot(world);
    if (snapshot) {
      if (!world.almanacSnapshots) world.almanacSnapshots = [];
      world.almanacSnapshots.push(snapshot);
    }
  });

  onBashoEnded(world);
  const yushoRikishi = world.rikishi.get(yusho);
  EventBus.bashoStatus(world, {
    status: "ended",
    incident: basho.bashoName,
    winner: yushoRikishi?.shikona || 'Unknown',
    winnerRikishiId: yusho
  });

  safeCall(() => {
    if (world.mediaState) {
      world.mediaState = snapshotMediaHeatForBasho(world.mediaState, basho.bashoName);
    }
  });

  if (world.ftue?.isActive) {
    world.ftue.bashoCompleted += 1;
    if (world.ftue.bashoCompleted >= 1) world.ftue.isActive = false;
  }

  EventBus.bashoStatus(world, {
    status: "concluded_summary",
    incident: basho.bashoName,
    shikona: yushoRikishi?.shikona || 'Unknown',
    score: bestWins,
    delta: 15 - bestWins
  });

  enterPostBasho(world);

  safeCall(() => { autosave(world); });
}

/**
 * Conclude Tournament Competition — handles yusho, prizes, and playoffs.
 * Extracted from world.ts for architectural purity.
 *
 * @param world Current WorldState
 * @returns Updated WorldState with BashoResult recorded
 */
export function concludeBashoCompetition(world: WorldState): WorldState {
  const basho = world.currentBasho;
  if (!basho) return world;

  const { topCandidates, bestWins } = calculateStandings(basho);

  if (topCandidates.length === 0) return world;

  let yusho = topCandidates[0];
  const playoffMatches: MatchSchedule[] = [];

  if (topCandidates.length > 1) {
    const playoffResult = resolvePlayoffs(world, basho, topCandidates);
    yusho = playoffResult.winner;
    playoffMatches.push(...playoffResult.matches);

    const champ = world.rikishi.get(yusho);
    EventBus.bashoStatus(world, {
      status: "playoff_result",
      shikona: champ?.shikona ?? yusho,
      score: topCandidates.length,
      delta: bestWins
    });
  }

  const prizes = distributePrizes(world, basho, yusho);

  recordBashoHistory(world, basho, yusho, topCandidates, playoffMatches, prizes, bestWins);

  return world;
}



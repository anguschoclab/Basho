import { EventBus, logEngineEvent } from "../events";
import { stableTieBreak } from "../utils/sort";
import { determineSpecialPrizes } from "../banzuke";
import { onBashoEnded } from "../records";
import { buildAlmanacSnapshot } from "../almanac";
import { snapshotMediaHeatForBasho } from "../systems/media/MediaService";
import { autosave } from "../saveload";
import { safeCall } from "../utils/safe";
import { enterPostBasho } from "../tick/tickDaily";
import type { WorldState } from "../types/world";
import type { BashoState, BashoResult, MatchSchedule } from "../types/basho";
import type { Id } from "../types/common";


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

  const table: Array<{id: Id, wins: number, losses: number}> = [];
  const standingsEntries = basho.standings instanceof Map 
    ? Array.from(basho.standings.entries()) 
    : Object.entries(basho.standings);

  for (const [id, rec] of standingsEntries) {
    const s = rec as { wins: number; losses: number };
    table.push({ id, wins: s.wins, losses: s.losses });
  }

  table.sort((a, b) => b.wins - a.wins || a.losses - b.losses || stableTieBreak(a.id, b.id));

  if (table.length === 0) return world;

  const bestWins = table[0].wins;
  const topCandidates = table.reduce<Id[]>((acc, t) => {
    if (t.wins === bestWins) acc.push(t.id);
    return acc;
  }, []);
  
  let yusho = topCandidates[0];
  const playoffMatches: MatchSchedule[] = [];
  
  // === PLAYOFF RESOLUTION (Stub for now) ===
  if (topCandidates.length > 1) {
    // In a future update, we can re-inject a Mini-Simulator here to resolve ties.
    // For now, we use the stable tie-breaker (id-based).
    yusho = topCandidates[0]; 
  }

  // Determine Special Prizes
  const prizes = determineSpecialPrizes(basho.matches, world.rikishi, yusho);


  const result: BashoResult = {
    year: world.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    yusho,
    junYusho: topCandidates.slice(1),
    ...prizes,
    playoffMatches,
    prizes: {
      yushoAmount: 10000000,
      junYushoAmount: 2000000,
      specialPrizes: 2000000
    }
  };

  // Apply Special Prizes (Prizes, Treasury, Stats)
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
        
        EventBus.specialPrizesAwarded(world, r.id, r.heyaId, type as any, SANSHO_PRIZE_AMOUNT);
        const heya = world.heyas.get(r.heyaId);
        if (heya) heya.funds += SANSHO_PRIZE_AMOUNT;
      }
    }
  }

  // Record history
  if (!world.history) world.history = [];
  world.history.push(result);


  // --- ALMANAC SNAPSHOT ---
  safeCall(() => {
    const snapshot = buildAlmanacSnapshot(world);
    if (snapshot) {
      if (!world.almanacSnapshots) world.almanacSnapshots = [];
      world.almanacSnapshots.push(snapshot);
    }
  });

  // Broadcast
  onBashoEnded(world);
  const yushoRikishi = world.rikishi.get(yusho);
  EventBus.bashoEnded(world, basho.bashoName, yusho, yushoRikishi?.shikona || 'Unknown');

  // --- MEDIA SNAPSHOT ---
  safeCall(() => {
    if (world.mediaState) {
      world.mediaState = snapshotMediaHeatForBasho(world.mediaState, basho.bashoName);
    }
  });

  // --- FTUE UPDATE ---
  if (world.ftue?.isActive) {
    world.ftue.bashoCompleted += 1;
    if (world.ftue.bashoCompleted >= 1) world.ftue.isActive = false;
  }

  logEngineEvent(world, {
    type: "BASHO_CONCLUDED",
    category: "basho",
    importance: "major",
    scope: "world",
    title: `${basho.bashoName.toUpperCase()} Basho Concluded`,
    summary: `${yushoRikishi?.shikona || 'Unknown'} wins with ${bestWins} wins!`,
    data: {
      year: result.year,
      bashoName: result.bashoName,
      yushoId: result.yusho,
      wins: bestWins
    }
  });

  // Transition to post-basho
  enterPostBasho(world);

  // Autosave
  safeCall(() => { autosave(world); });

  return world;
}



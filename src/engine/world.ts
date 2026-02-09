/**
 * File Name: src/engine/world.ts
 * Notes:
 * - Orchestrates the game simulation using high-fidelity types.
 * - 'advanceDay' runs bouts for the current day using 'resolveBout' (which handles H2H).
 * - 'endBasho' handles rankings, prizes, and crucially, the LIFECYCLE check (retirements/new recruits).
 * - 'advanceInterim' handles between-basho ticks (AI, scouting, economics).
 */

import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { WorldState, BashoName, BoutResult, Id, MatchSchedule, BashoPerformance, BanzukeEntry, BashoState } from "./types";
import { initializeBasho } from "./worldgen";
import { getNextBasho } from "./calendar";
import { resolveBout } from "./bout";

import * as schedule from "./schedule";
import * as events from "./events";
import * as injuries from "./injuries";
import * as rivalries from "./rivalries";
import * as economics from "./economics";
import * as governance from "./governance";
import * as welfare from "./welfare";
import * as npcAI from "./npcAI";
import * as scoutingStore from "./scoutingStore";
import * as historyIndex from "./historyIndex";
import * as training from "./training"; 
import * as talentpool from "./talentpool";
import { determineSpecialPrizes, updateBanzuke } from "./banzuke"; 
import { checkRetirement } from "./lifecycle";

// Type guard or helper to access current basho
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

export function startBasho(world: WorldState, bashoName?: BashoName): WorldState {
  if (world.cyclePhase === "active_basho") return world;

  const name: BashoName =
    bashoName || world.currentBashoName || "hatsu"; // Default fall back

  // Initialize new basho state
  const basho = initializeBasho(world, name);

  world.currentBasho = basho;
  world.cyclePhase = "active_basho"; 

  ensureDaySchedule(world, basho.day);
  safeCall(() => (events as any).emit?.(world, { type: "BASHO_STARTED", bashoName: name }));

  return world;
}

export function ensureDaySchedule(world: WorldState, day: number): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const already = basho.matches.some((m) => m.day === day);
  if (already) return world;

  // Assuming schedule module is updated or compatible hooks exist
  // For now, we stub a basic schedule generator if external one fails
  if (typeof (schedule as any).generateDaySchedule === "function") {
    (schedule as any).generateDaySchedule(world, basho, day, world.seed);
  } else {
      // Basic fallback scheduling
      const rikishiIds = Array.from(world.rikishi.keys());
      // Simple random pairing
      for(let i=0; i<rikishiIds.length; i+=2) {
          if (i+1 < rikishiIds.length) {
              basho.matches.push({
                  day,
                  eastRikishiId: rikishiIds[i],
                  westRikishiId: rikishiIds[i+1]
              });
          }
      }
  }
  return world;
}

export function advanceBashoDay(world: WorldState): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const nextDay = basho.day + 1;
  basho.day = nextDay;
  // Legacy sync
  basho.currentDay = nextDay;

  if (nextDay <= 15) ensureDaySchedule(world, nextDay);

  safeCall(() => (events as any).emit?.(world, { type: "BASHO_DAY_ADVANCED", day: nextDay }));
  return world;
}

export function simulateBoutForToday(
  world: WorldState,
  unplayedIndex: number
): { world: WorldState; result?: BoutResult } {
  const basho = getCurrentBasho(world);
  if (!basho) return { world };

  const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
  const match = todays[unplayedIndex];
  if (!match) return { world };

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return { world };

  const boutContext = {
      id: `d${basho.day}-b${unplayedIndex}`,
      day: basho.day,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
      division: east.division
  };

  const result = resolveBout(boutContext, east, west, basho);

  applyBoutResult(world, match, result);
  return { world, result };
}

export function applyBoutResult(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult,
  _opts?: { boutSeed?: string }
): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  match.result = result;

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return world;

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // Safe increments handled in resolveBout mostly, but ensures world consistency here
  // Standings update
  const standings = basho.standings;
  const wRec = standings.get(winner.id) || { wins: 0, losses: 0 };
  const lRec = standings.get(loser.id) || { wins: 0, losses: 0 };
  standings.set(winner.id, { wins: wRec.wins + 1, losses: wRec.losses });
  standings.set(loser.id, { wins: lRec.wins, losses: lRec.losses + 1 });

  safeCall(() => (injuries as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (rivalries as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (economics as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (events as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (scoutingStore as any).onBoutResolved?.(world, { match, result, east, west }));

  return world;
}

export function endBasho(world: WorldState): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const table = Array.from(basho.standings.entries())
    .map(([id, rec]) => ({ id, wins: rec.wins, losses: rec.losses }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  if (table.length === 0) return world;

  const bestWins = table[0].wins;
  const topCandidates = table.filter(t => t.wins === bestWins).map(t => t.id);
  
  let yusho = topCandidates[0];
  const playoffMatches: MatchSchedule[] = [];
  
  // Simple playoff handling: winner is first candidate (expand logic for real playoff)
  if (topCandidates.length > 1) {
      yusho = topCandidates[0]; 
  }

  const runnerWins = bestWins - 1;
  const junYusho = table
    .filter(t => (t.wins === bestWins && t.id !== yusho) || t.wins === runnerWins)
    .map(t => t.id);

  const awards = determineSpecialPrizes(
    basho.matches, 
    world.rikishi as any, // Cast map to any to bypass strict type check if needed
    yusho
  );

  const bashoResult = {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    yusho,
    junYusho,
    ginoSho: awards.ginoSho,
    kantosho: awards.kantosho,
    shukunsho: awards.shukunsho,
    playoffMatches: playoffMatches.length > 0 ? playoffMatches : undefined,
    prizes: {
      yushoAmount: 10_000_000,
      junYushoAmount: 2_000_000,
      specialPrizes: 2_000_000
    }
  };

  world.history.push(bashoResult);

  safeCall(() => (historyIndex as any).indexBashoResult?.(world, bashoResult));
  safeCall(() => (events as any).emit?.(world, { type: "BASHO_ENDED", bashoName: basho.bashoName, yusho }));

  world.cyclePhase = "post_basho";

  // --- LIFECYCLE MANAGEMENT ---
  console.log("Processing End of Basho Lifecycle...");
  const retiredRikishiIds: string[] = [];
  const vacanciesByHeyaId: Record<string, number> = {};

  for (const [id, r] of world.rikishi) {
    const reason = checkRetirement(r as any, world.year, world.seed);
    if (reason) {
        console.log(`${r.shikona} has retired due to: ${reason}`);
        retiredRikishiIds.push(id);

        if (r.heyaId) vacanciesByHeyaId[r.heyaId] = (vacanciesByHeyaId[r.heyaId] || 0) + 1;

        world.rikishi.delete(id);
        // Clean up from heya
        const heya = world.heyas.get(r.heyaId);
        if (heya) {
            heya.rikishiIds = heya.rikishiIds.filter(rid => rid !== id);
        }
    }
  }

  // Persistent Talent Pools: NPC stables fill their own vacancies from the shared pool.
  safeCall(() => (talentpool as any).fillVacanciesForNPC?.(world, vacanciesByHeyaId));

  return world;
}

export function publishBanzukeUpdate(world: WorldState): WorldState {
  if (world.cyclePhase !== "post_basho") return world;

  const lastBasho = getCurrentBasho(world);
  if (!lastBasho) return world;

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const r of world.rikishi.values()) {
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: { rank: r.rank, rankNumber: r.rankNumber, side: r.side }
    });
  }

  const performanceList: BashoPerformance[] = [];
  for (const [id, stats] of lastBasho.standings.entries()) {
    const history = world.history[world.history.length - 1];
    const isYusho = history.yusho === id;
    const isJunYusho = history.junYusho.includes(id);

    let prizePoints = 0;
    if (history.ginoSho === id) prizePoints += 1;
    if (history.shukunsho === id) prizePoints += 1;
    if (history.kantosho === id) prizePoints += 1;

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: 0, 
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints
    });
  }

  const result = updateBanzuke(currentBanzukeList, performanceList, {}); 

  for (const newEntry of result.newBanzuke) {
    const rikishi = world.rikishi.get(newEntry.rikishiId);
    if (rikishi) {
      rikishi.division = newEntry.division;
      rikishi.rank = newEntry.position.rank;
      rikishi.rankNumber = newEntry.position.rankNumber;
      rikishi.side = newEntry.position.side;
      
      rikishi.currentBashoWins = 0;
      rikishi.currentBashoLosses = 0;
    }
  }

  const next = getNextBasho(lastBasho.bashoName);
  const nextYear = next === "hatsu" ? world.year + 1 : world.year;

  world.year = nextYear;
  world.currentBashoName = next;
  world.currentBasho = undefined;
  world.cyclePhase = "interim";

  return world;
}

export function advanceInterim(world: WorldState, weeks: number = 1): WorldState {
  if (world.cyclePhase !== "interim") return world;

  const w = Math.max(1, Math.trunc(weeks));

  for (let i = 0; i < w; i++) {
    world.week += 1; 
    
    // Subsystem ticks
    safeCall(() => (npcAI as any).tickWeek?.(world));
    safeCall(() => (training as any).tickWeek?.(world));
    safeCall(() => (economics as any).tickWeek?.(world));
    safeCall(() => (injuries as any).tickWeek?.(world));
    safeCall(() => (welfare as any).tickWeek?.(world));
    safeCall(() => (governance as any).tickWeek?.(world));
    safeCall(() => (rivalries as any).tickWeek?.(world));
    safeCall(() => (events as any).tickWeek?.(world));
    safeCall(() => (scoutingStore as any).tickWeek?.(world));
    safeCall(() => (talentpool as any).tickWeek?.(world));

    // Talent pools tick: refresh cohorts, NPC recruitment, offer resolution
    safeCall(() => (talentpool as any).tickWeek?.(world));

    safeCall(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tb = require("./timeBoundary");
      if (typeof tb.tickWeek === "function") tb.tickWeek(world);
      else if (typeof tb.advanceWeek === "function") tb.advanceWeek(world);
      else if (typeof tb.applyTimeBoundary === "function") tb.applyTimeBoundary(world);
    });
  }

  return world;
}

function safeCall(fn: () => void) {
  try {
    fn();
  } catch {
    // Intentionally swallow
  }
}
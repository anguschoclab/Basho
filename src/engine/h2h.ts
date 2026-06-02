/**
 * File Name: src/engine/h2h.ts
 * Notes:
 * - Implements Head-to-Head record keeping.
 * - Implements Narrative generation based on historical records.
 * - Provides 'updateH2H' to be called after bouts.
 * - Provides 'generateH2HCommentary' for Pre-Bout and UI display.
 */

import { rngFromSeed, SeededRNG } from "./rng";
import { Rikishi } from "./types/rikishi";
import { H2HRecord, H2HReport, H2HRecentMeeting } from "./types/records";
import { BoutResult } from "./types/basho";
import type { BoutTactic, TacticalResult } from "./types/combat";
import { BardEngine } from "./narrative/BardEngine";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

/**
 * Updates the Head-to-Head records for two rikishi after a bout.
 * Returns StateImpact describing the H2H updates instead of mutating state directly.
 */
export function updateH2H(
  winner: Rikishi,
  loser: Rikishi,
  result: BoutResult,
  bashoId: string,
  year: number,
  day: number
): StateImpact {
  const builder = createImpactBuilder("updateH2H");

  // Get existing H2H maps or create empty ones
  const winnerH2h = winner.h2h || {};
  const loserH2h = loser.h2h || {};

  // Update Winner's record against Loser
  const winnerRecord = winnerH2h[loser.id] || createEmptyH2H();
  winnerRecord.wins++;
  winnerRecord.streak = winnerRecord.streak > 0 ? winnerRecord.streak + 1 : 1;
  winnerRecord.lastMatch = {
    winnerId: winner.id,
    kimarite: result.kimarite,
    bashoId,
    day,
    year,
  };

  // Update Loser's record against Winner
  const loserRecord = loserH2h[winner.id] || createEmptyH2H();
  loserRecord.losses++;
  loserRecord.streak = loserRecord.streak < 0 ? loserRecord.streak - 1 : -1;
  loserRecord.lastMatch = {
    winnerId: winner.id,
    kimarite: result.kimarite,
    bashoId,
    day,
    year,
  };

  // Build the update objects
  const winnerUpdate = {
    h2h: {
      ...winnerH2h,
      [loser.id]: winnerRecord,
    },
  };

  const loserUpdate = {
    h2h: {
      ...loserH2h,
      [winner.id]: loserRecord,
    },
  };

  builder.updateRikishi(winner.id, winnerUpdate);
  builder.updateRikishi(loser.id, loserUpdate);

  return builder.build();
}

/**
 * Create empty h2 h.
 *  * @returns The result.
 */
function createEmptyH2H(): H2HRecord {
  return {
    wins: 0,
    losses: 0,
    lastMatch: null,
    streak: 0,
  };
}

/**
 * Get random from array.
 *  * @param rng - The Rng.
 *  * @param arr - The Arr.
 *  * @returns The result.
 */
function getRandomFromArray(rng: SeededRNG, arr: string[]): string {
  return arr[rng.int(0, arr.length - 1)];
}

/**
 * Generates a rich, context-aware narrative intro based on H2H history.
 */
export function generateH2HCommentary(r1: Rikishi, r2: Rikishi): string {
  const recordSeed = `${r1.id}::${r2.id}::${r1.h2h?.[r2.id]?.wins ?? 0}::${r1.h2h?.[r2.id]?.losses ?? 0}`;
  const rng = rngFromSeed("h2h", "h2h", recordSeed);

  // Guard clause if h2h is undefined
  if (!r1.h2h) r1.h2h = {};

  const record = r1.h2h[r2.id];

  // Case 0: First meeting
  if (!record || (record.wins === 0 && record.losses === 0)) {
    return BardEngine.resolve(rng, "h2h.first_meeting").text;
  }

  const total = record.wins + record.losses;
  const p1Name = r1.shikona;
  const p2Name = r2.shikona;
  const last = record.lastMatch;

  // Case 1: Lopsided Domination (Win rate > 75% with 4+ matches)
  if (total >= 4 && record.wins / total > 0.75) {
    return BardEngine.resolve(rng, "h2h.domination", {
      P1: p1Name,
      P2: p2Name,
      WINS: record.wins.toString(),
      LOSSES: record.losses.toString(),
      TOTAL: total.toString(),
    }).text;
  }
  if (total >= 4 && record.losses / total > 0.75) {
    // Note: domain 'domination' templates handle P2 struggling as well.
    return BardEngine.resolve(rng, "h2h.domination", {
      P1: p2Name,
      P2: p1Name,
      WINS: record.losses.toString(),
      LOSSES: record.wins.toString(),
      TOTAL: total.toString(),
    }).text;
  }

  // Case 2: Deadlock (Exact tie or off by 1)
  if (Math.abs(record.wins - record.losses) <= 1 && total > 2) {
    return BardEngine.resolve(rng, "h2h.deadlock", {
      WINS: record.wins.toString(),
      LOSSES: record.losses.toString(),
    }).text;
  }

  // Case 3: Streak Narrative
  if (Math.abs(record.streak) >= 3) {
    return BardEngine.resolve(rng, "h2h.streak", {
      P1: p1Name,
      P2: p2Name,
      STREAK: Math.abs(record.streak).toString(),
    }).text;
  }

  // Case 4: Recent History Specifics (Last match commentary)
  if (last) {
    const winnerName = last.winnerId === r1.id ? p1Name : p2Name;
    const loserName = last.winnerId === r1.id ? p2Name : p1Name;

    return BardEngine.resolve(rng, "h2h.recent", {
      DAY: last.day.toString(),
      WINNER: winnerName,
      LOSER: loserName,
      KIMARITE: last.kimarite,
    }).text;
  }

  // Fallback generic
  return `${p1Name} leads the series ${record.wins} to ${record.losses}.`;
}

/**
 * Build a structured H2H report for two rikishi.
 * Reads from rikishi.history[] (MatchResultLog[]) — the authoritative per-bout source.
 * Returns up to 5 recent meetings sorted newest-first.
 */
export function getH2HReport(rA: Rikishi, rB: Rikishi): H2HReport {
  const aHistory = (rA.history ?? []).filter((m) => m.opponentId === rB.id);
  const bHistory = (rB.history ?? []).filter((m) => m.opponentId === rA.id);

  const aWins = aHistory.filter((m) => m.win).length;
  const bWins = bHistory.filter((m) => m.win).length;

  // Build recent meetings from rA's perspective (covers all shared bouts)
  const meetings: H2HRecentMeeting[] = aHistory.map((m) => ({
    bashoId: m.bashoId,
    year: m.year,
    day: m.day,
    winnerId: m.win ? rA.id : rB.id,
    kimarite: m.kimarite,
  }));

  // Sort newest first (year desc, then day desc)
  meetings.sort((a, b) => (b.year !== a.year ? b.year - a.year : b.day - a.day));

  return {
    aId: rA.id,
    aWins,
    bId: rB.id,
    bWins,
    totalMeetings: aWins + bWins,
    recentMeetings: meetings.slice(0, 5),
  };
}

/**
 * Determine the CPU rikishi's bout tactic based on their stats and archetype.
 */
export function determineCPUTactic(cpu: Rikishi, rng: SeededRNG): BoutTactic {
  const isYotsu = cpu.style === "yotsu";
  const isOshi = cpu.style === "oshi";

  const roll = rng.next();

  if (isYotsu) {
    if (roll < 0.65) return "YOTSU_BELT";
    if (roll < 0.85) return "STANDARD";
    if (roll < 0.95) return "OSHI_THRUST";
    return "HENKA";
  } else if (isOshi) {
    if (roll < 0.7) return "OSHI_THRUST";
    if (roll < 0.85) return "STANDARD";
    if (roll < 0.95) return "YOTSU_BELT";
    return "HENKA";
  } else {
    // Hybrid / Other
    if (roll < 0.4) return "YOTSU_BELT";
    if (roll < 0.8) return "OSHI_THRUST";
    if (roll < 0.95) return "STANDARD";
    return "HENKA";
  }
}

/**
 * Resolves the rock-paper-scissors tactical clash between two rikishi.
 * RPS Rules:
 * YOTSU (Belt) counters OSHI (Thrust)
 * OSHI (Thrust) counters HENKA
 * HENKA counters YOTSU (Belt)
 * STANDARD provides no modifiers.
 */
export function resolveTacticalClash(
  playerTactic: BoutTactic,
  cpuTactic: BoutTactic
): TacticalResult {
  const result: TacticalResult = {
    playerTactic,
    cpuTactic,
    advantage: "NEUTRAL",
    winProbabilityShift: 0,
  };

  if (playerTactic === cpuTactic || playerTactic === "STANDARD" || cpuTactic === "STANDARD") {
    return result; // Neutral, no shift
  }

  if (
    (playerTactic === "YOTSU_BELT" && cpuTactic === "OSHI_THRUST") ||
    (playerTactic === "OSHI_THRUST" && cpuTactic === "HENKA") ||
    (playerTactic === "HENKA" && cpuTactic === "YOTSU_BELT")
  ) {
    result.advantage = "PLAYER";
    result.winProbabilityShift = 0.15; // 15% boost
  } else {
    result.advantage = "CPU";
    result.winProbabilityShift = -0.15; // 15% penalty
  }

  return result;
}

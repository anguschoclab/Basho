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
import { H2HRecord } from "./types/records";
import { BoutResult } from "./types/basho";
import type { BoutTactic, TacticalResult } from "./types/combat";

/**
 * Updates the Head-to-Head records for two rikishi after a bout.
 */
export function updateH2H(
  winner: Rikishi,
  loser: Rikishi,
  result: BoutResult,
  bashoId: string,
  year: number,
  day: number
): void {
  // Ensure H2H maps exist
  if (!winner.h2h) winner.h2h = {};
  if (!loser.h2h) loser.h2h = {};

  // Update Winner's record against Loser
  if (!winner.h2h[loser.id]) {
    winner.h2h[loser.id] = createEmptyH2H();
  }
  const winRec = winner.h2h[loser.id];
  winRec.wins++;
  winRec.streak = winRec.streak > 0 ? winRec.streak + 1 : 1;
  winRec.lastMatch = {
    winnerId: winner.id,
    kimarite: result.kimarite,
    bashoId,
    day,
    year,
  };

  // Update Loser's record against Winner
  if (!loser.h2h[winner.id]) {
    loser.h2h[winner.id] = createEmptyH2H();
  }
  const loseRec = loser.h2h[winner.id];
  loseRec.losses++;
  loseRec.streak = loseRec.streak < 0 ? loseRec.streak - 1 : -1;
  loseRec.lastMatch = {
    winnerId: winner.id,
    kimarite: result.kimarite,
    bashoId,
    day,
    year,
  };
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
  const recordSeed = `${r1.id}::${r2.id}::${(r1.h2h?.[r2.id]?.wins ?? 0)}::${(r1.h2h?.[r2.id]?.losses ?? 0)}`;
  const rng = rngFromSeed("h2h", "h2h", recordSeed);
  
  // Guard clause if h2h is undefined
  if (!r1.h2h) r1.h2h = {};
  
  const record = r1.h2h[r2.id];

  // Case 0: First meeting
  if (!record || (record.wins === 0 && record.losses === 0)) {
    return getRandomFromArray(rng, [
      "These two are meeting for the very first time in the ring.",
      "A fresh matchup today; no prior history between these two.",
      "The crowd leans forward for this first-ever encounter.",
      "No data exists for this matchup - it's a complete unknown.",
    ]);
  }

  const total = record.wins + record.losses;
  const p1Name = r1.shikona;
  const p2Name = r2.shikona;
  const last = record.lastMatch;
  
  // Case 1: Lopsided Domination (Win rate > 75% with 4+ matches)
  if (total >= 4 && record.wins / total > 0.75) {
    return getRandomFromArray(rng, [
      `${p1Name} has absolutely dominated this matchup, leading the series ${record.wins}-${record.losses}.`,
      `${p2Name} has struggled historically here, winning only ${record.losses} of their ${total} meetings.`,
      `History is heavily on ${p1Name}'s side today with a commanding ${record.wins}-${record.losses} record.`,
      `${p1Name} owns this rivalry, having won ${Math.floor((record.wins/total)*100)}% of their bouts.`,
    ]);
  }
  if (total >= 4 && record.losses / total > 0.75) {
    return getRandomFromArray(rng, [
      `${p1Name} has a mountain to climb today, trailing ${record.wins}-${record.losses} in head-to-head bouts.`,
      `${p2Name} seems to have ${p1Name}'s number, winning nearly every time they meet.`,
      `Can ${p1Name} finally turn the tide? They are ${record.wins}-${record.losses} lifetime against ${p2Name}.`,
    ]);
  }

  // Case 2: Deadlock (Exact tie or off by 1)
  if (Math.abs(record.wins - record.losses) <= 1 && total > 2) {
    return getRandomFromArray(rng, [
      `This is as close as it gets—a ${record.wins}-${record.losses} career split between them.`,
      `A true rivalry! The record stands at ${record.wins} wins to ${record.losses}.`,
      `Neither man has been able to gain a decisive edge in this series, currently standing at ${record.wins}-${record.losses}.`,
    ]);
  }

  // Case 3: Streak Narrative
  if (record.streak >= 3) {
    return `${p1Name} enters the ring confident, having won the last ${record.streak} meetings against ${p2Name}.`;
  }
  if (record.streak <= -3) {
    return `${p1Name} is desperate to snap a ${Math.abs(record.streak)}-bout losing streak against ${p2Name}.`;
  }

  // Case 4: Recent History Specifics (Last match commentary)
  if (last) {
    const winnerName = last.winnerId === r1.id ? p1Name : p2Name;
    const loserName = last.winnerId === r1.id ? p2Name : p1Name;
    
    // If last match was recent (same year)
    const templates = [
      `Last time they met on Day ${last.day}, ${winnerName} won decisively by ${last.kimarite}.`,
      `${loserName} will be looking for revenge after that ${last.kimarite} loss in the previous basho.`,
      `Fans remember their last bout well—a crushing ${last.kimarite} victory for ${winnerName}.`,
    ];
    
    return getRandomFromArray(rng, templates);
  }

  // Fallback generic
  return `${p1Name} leads the series ${record.wins} to ${record.losses}.`;
}


/**
 * Determine the CPU rikishi's bout tactic based on their stats and archetype.
 */
export function determineCPUTactic(cpu: Rikishi, rng: SeededRNG): BoutTactic {
  const isYotsu = cpu.style === "yotsu" || cpu.archetype === "yotsu_specialist";
  const isOshi = cpu.style === "oshi" || cpu.archetype === "oshi_specialist";

  const roll = rng.next();

  if (isYotsu) {
    if (roll < 0.65) return "YOTSU_BELT";
    if (roll < 0.85) return "STANDARD";
    if (roll < 0.95) return "OSHI_THRUST";
    return "HENKA";
  } else if (isOshi) {
    if (roll < 0.70) return "OSHI_THRUST";
    if (roll < 0.85) return "STANDARD";
    if (roll < 0.95) return "YOTSU_BELT";
    return "HENKA";
  } else {
    // Hybrid / Other
    if (roll < 0.40) return "YOTSU_BELT";
    if (roll < 0.80) return "OSHI_THRUST";
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
export function resolveTacticalClash(playerTactic: BoutTactic, cpuTactic: BoutTactic): TacticalResult {
  const result: TacticalResult = {
    playerTactic,
    cpuTactic,
    advantage: 'NEUTRAL',
    winProbabilityShift: 0
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

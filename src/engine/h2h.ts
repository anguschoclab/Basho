/**
 * File Name: src/engine/h2h.ts
 * Notes:
 * - Implements Head-to-Head record keeping.
 * - Implements Narrative generation based on historical records.
 * - Provides 'updateH2H' to be called after bouts.
 * - Provides 'generateH2HCommentary' for Pre-Bout and UI display.
 */

import { rngFromSeed } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import { Rikishi, H2HRecord, BoutResult } from "./types";

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

function createEmptyH2H(): H2HRecord {
  return {
    wins: 0,
    losses: 0,
    lastMatch: null,
    streak: 0,
  };
}

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

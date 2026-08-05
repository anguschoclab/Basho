/**
 * src/engine/bout/kachiNokori.ts
 * ==============================
 * Kachi-nokori (勝ち残り) — "Remaining wins" after kachi-koshi.
 *
 * Once a rikishi achieves kachi-koshi (8 wins in a 15-day basho),
 * any additional wins are "kachi-nokori" — surplus wins that determine
 * yusho race position, jun-yusho (runner-up) qualification, and
 * mochikyukin bonus points. This module surfaces the kachi-nokori
 * value for standings display and post-basho calculations.
 */

import type { Id } from "../types/common";

/** Wins needed for kachi-koshi in a 15-day basho. */
export const KACHI_KOSHI_WINS = 8;

/** Maximum days in a standard honbasho. */
export const BASHO_DAYS = 15;

/**
 * Calculates kachi-nokori (surplus wins above kachi-koshi) for a rikishi.
 *
 * @returns The number of wins beyond 8, or 0 if kachi-koshi has not been achieved.
 */
export function calculateKachiNokori(wins: number, losses: number, absences: number = 0): number {
  const totalBouts = wins + losses + absences;
  if (totalBouts === 0) return 0;
  if (wins < KACHI_KOSHI_WINS) return 0;
  return wins - KACHI_KOSHI_WINS;
}

/**
 * Returns true if the rikishi has achieved kachi-koshi.
 */
export function hasKachiKoshi(wins: number): boolean {
  return wins >= KACHI_KOSHI_WINS;
}

/**
 * Returns true if the rikishi is mathematically eliminated from kachi-koshi.
 * With 15 days and needing 8 wins, a rikishi with 8 losses cannot kachi-koshi.
 */
export function isMakeKoshiConfirmed(losses: number, absences: number = 0): boolean {
  return losses + absences >= BASHO_DAYS - KACHI_KOSHI_WINS + 1;
}

/**
 * Calculates kachi-nokori for all rikishi in a standings map.
 * Returns a map of rikishi ID → kachi-nokori value.
 */
export function calculateKachiNokoriForStandings(
  standings: Map<Id, { wins: number; losses: number; absences?: number }>
): Map<Id, number> {
  const result = new Map<Id, number>();
  for (const [id, record] of standings) {
    result.set(id, calculateKachiNokori(record.wins, record.losses, record.absences ?? 0));
  }
  return result;
}

/**
 * Returns the yusho race leaders — rikishi with the highest kachi-nokori.
 * Ties are broken by fewest losses.
 */
export function getYushoRaceLeaders(
  standings: Map<Id, { wins: number; losses: number; absences?: number }>,
  limit: number = 5
): Array<{ id: Id; wins: number; losses: number; kachiNokori: number }> {
  const entries: Array<{ id: Id; wins: number; losses: number; kachiNokori: number }> = [];
  for (const [id, record] of standings) {
    const kn = calculateKachiNokori(record.wins, record.losses, record.absences ?? 0);
    entries.push({
      id,
      wins: record.wins,
      losses: record.losses,
      kachiNokori: kn,
    });
  }
  entries.sort((a, b) => {
    if (b.kachiNokori !== a.kachiNokori) return b.kachiNokori - a.kachiNokori;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.wins - a.wins;
  });
  return entries.slice(0, limit);
}

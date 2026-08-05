/**
 * Kachi-nokori (勝ち残り) — Surplus Wins Calculation
 *
 * Kachi-nokori is the surplus of wins above 8 for sekitori rikishi.
 * This is used for:
 * - Mochikyukin bonus calculation (wins above 8, not net wins)
 * - Post-basho UI display as a player-visible stat
 * - Promotion consideration context
 *
 * The real JSA system uses kachi-nokori (wins - 8) rather than netWins
 * (wins - losses) for mochikyukin accumulation.
 */

import type { Rikishi } from "../../types/rikishi";

/** Minimum wins for kachi-nokori to be positive (kachikoshi threshold for sekitori) */
export const KACHI_NOKORI_THRESHOLD = 8;

/**
 * Calculate kachi-nokori (surplus wins above 8).
 * For sekitori (makuuchi + juryo), kachikoshi is 8 wins.
 * Returns max(0, wins - 8).
 */
export function calculateKachiNokori(wins: number): number {
  return Math.max(0, wins - KACHI_NOKORI_THRESHOLD);
}

/**
 * Calculate kachi-nokori from a rikishi's basho record.
 * Only applies to sekitori divisions (makuuchi and juryo).
 */
export function getKachiNokoriForRikishi(rikishi: Rikishi): number {
  if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") {
    return 0;
  }
  const wins = rikishi.currentBashoWins ?? 0;
  return calculateKachiNokori(wins);
}

/**
 * Post-basho UI payload including kachi-nokori.
 * This surfaces the stat for player visibility.
 */
export interface PostBashoPayload {
  rikishiId: string;
  shikona: string;
  wins: number;
  losses: number;
  kachiNokori: number;
  isKachikoshi: boolean;
  isMakekoshi: boolean;
}

/**
 * Build a post-basho payload for UI display, including kachi-nokori.
 */
export function buildPostBashoPayload(
  rikishi: Rikishi,
  wins: number,
  losses: number
): PostBashoPayload {
  return {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona ?? rikishi.name ?? rikishi.id,
    wins,
    losses,
    kachiNokori: calculateKachiNokori(wins),
    isKachikoshi: wins > losses,
    isMakekoshi: wins < losses,
  };
}

/**
 * Convert kachi-nokori to mochikyukin points.
 * Uses the same per-win rate as the existing system, but based on
 * wins above 8 instead of net wins.
 */
export function kachiNokoriToMochikyukinPoints(
  kachiNokori: number,
  pointsPerWin: number
): number {
  return kachiNokori * pointsPerWin;
}

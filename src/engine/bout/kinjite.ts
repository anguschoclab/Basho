/**
 * src/engine/bout/kinjite.ts
 * ===========================
 * Kinjite (禁止手) — Forbidden techniques disqualification system.
 *
 * In real sumo, certain techniques (hair-pulling, eye-gouging, choking)
 * result in an instant hansoku (foul/disqualification). This module
 * implements a small DQ chance for high-aggression/low-technique rikishi
 * in desperate positions, creating dramatic upset losses and scandal events.
 */

import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { BoutContext } from "./boutUtils";
import { rngFromSeed } from "../rng";

/** Minimum aggression/technique ratio to trigger foul risk. */
const MIN_RATIO_FOR_FOUL_RISK = 1.4;

/** Base DQ probability before desperation scaling. */
const BASE_DQ_CHANCE = 0.002;

/** Additional DQ probability on senshuraku weekend (days 14-15). */
const SENSHURAKU_BONUS = 0.003;

/** Additional DQ probability when winner is 7-7 (must-win pressure). */
const SEVEN_SEVEN_BONUS = 0.005;

/** Additional DQ probability when winner is kadoban ozeki. */
const KADOBAN_BONUS = 0.004;

/** Maximum DQ probability cap. */
const MAX_DQ_CHANCE = 0.05;

/**
 * Calculates the probability that the winner of a bout commits a foul
 * (hansoku) based on their aggression/technique ratio and bout context.
 *
 * @returns Probability between 0 and MAX_DQ_CHANCE.
 */
export function calculateHansokuChance(
  winner: Rikishi,
  bout: BoutContext,
  basho: BashoState
): number {
  const aggression = winner.stats?.aggression ?? 50;
  const technique = winner.stats?.technique ?? 50;

  const ratio = aggression / Math.max(1, technique);
  if (ratio < MIN_RATIO_FOR_FOUL_RISK) return 0;

  let dqChance = BASE_DQ_CHANCE;

  const day = bout.day ?? 1;
  if (day >= 14) dqChance += SENSHURAKU_BONUS;

  const winnerRecord = basho.standings?.get(winner.id);
  if (winnerRecord?.wins === 7 && winnerRecord?.losses === 7) {
    dqChance += SEVEN_SEVEN_BONUS;
  }

  if (winner.rank === "ozeki" && day >= 10 && (winnerRecord?.wins ?? 0) < 8) {
    dqChance += KADOBAN_BONUS;
  }

  dqChance *= (ratio - 1.0) / 2;

  return Math.min(dqChance, MAX_DQ_CHANCE);
}

/**
 * Attempts to apply a hansoku (forbidden technique DQ) to a bout result.
 * If the winner has high aggression / low technique and the RNG hits,
 * the result is flipped: the original winner is disqualified and the
 * original loser wins by hansoku.
 *
 * @returns The (possibly modified) bout result and the heyaId of the
 *          fouled rikishi (null if no DQ occurred).
 */
export function tryHansoku(
  bout: BoutContext,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  rngSeed: string
): { result: BoutResult; fouledHeyaId: string | null } {
  if (result.kimarite === "fusensho") return { result, fouledHeyaId: null };

  const winner = result.winner === "east" ? east : west;

  const dqChance = calculateHansokuChance(winner, bout, basho);
  if (dqChance <= 0) return { result, fouledHeyaId: null };

  const rng = rngFromSeed(rngSeed, "kinjite", "hansoku");
  if (rng.next() >= dqChance) return { result, fouledHeyaId: null };

  const newWinnerSide: Side = result.winner === "east" ? "west" : "east";
  const newWinner = newWinnerSide === "east" ? east : west;
  const newLoser = newWinnerSide === "east" ? west : east;

  const dqResult: BoutResult = {
    ...result,
    winner: newWinnerSide,
    winnerRikishiId: newWinner.id,
    loserRikishiId: newLoser.id,
    kimarite: "hansoku",
    kimariteName: "Hansoku",
    upset: true,
    log: [
      ...result.log,
      { phase: "finish", data: { event: "hansoku", fouledRikishiId: winner.id } },
    ],
  };

  return { result: dqResult, fouledHeyaId: winner.heyaId ?? null };
}

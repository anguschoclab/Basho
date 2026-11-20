/**
 * src/engine/bout/kinjite.ts
 * ===========================
 * Kinjite (禁止手) — Forbidden techniques foul system.
 *
 * In real sumo, forbidden techniques (hair-pulling, eye-gouging, closed-fist
 * strikes) can earn an instant hansoku (foul disqualification) — but only
 * after the shimpan panel reviews the incident. This module implements the
 * three deterministic stages:
 *
 *   1. rollFoulSuspicion — did the apparent winner commit a suspect act?
 *   2. pickFoulType      — which kinjite category the panel reviews
 *   3. resolveFoulVerdict — does the shimpan panel confirm the foul?
 *
 * Only a confirmed verdict flips the bout to hansoku; officiating.ts owns
 * the flip so it can record the full FoulReview on the result.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult, KinjiteFoul } from "@/engine/types/basho";
import type { Side } from "@/engine/types/banzuke";
import type { Id } from "@/engine/types/common";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { ShimpanPanel } from "@/engine/types/gyoji";
import { rngFromSeed } from "@/engine/core/rng";
import {
  KINJITE_MIN_RATIO_FOR_FOUL_RISK,
  KINJITE_SUSPICION_BASE,
  KINJITE_RATIO_SCALE,
  KINJITE_SENSHURAKU_BONUS,
  KINJITE_SEVEN_SEVEN_BONUS,
  KINJITE_KADOBAN_BONUS,
  KINJITE_MAX_SUSPICION,
  KINJITE_SENSHURAKU_START_DAY,
  KINJITE_KADOBAN_DAY_THRESHOLD,
  KINJITE_KADOBAN_WIN_THRESHOLD,
  KINJITE_RATIO_SUBTRACTION,
  KINJITE_FOUL_WEIGHTS,
  FOUL_REVIEW_BASE_CONFIRM,
  FOUL_REVIEW_ACCURACY_CENTER,
  FOUL_REVIEW_ACCURACY_SCALE,
  FOUL_REVIEW_MIN_CONFIRM,
  FOUL_REVIEW_MAX_CONFIRM,
} from "@/constants/engine/bout";
import { clamp } from "@/engine/utils/math";

/** Broadcast-friendly label for each kinjite category. */
export const KINJITE_FOUL_LABELS: Record<KinjiteFoul, string> = {
  topknot_grab: "topknot grab",
  closed_fist: "closed-fist strike",
  eye_poke: "eye poke",
  throat_grab: "throat grab",
  ear_strike: "ear strike",
  low_blow: "low blow",
  finger_bend: "finger bend",
  kick: "kick",
};

/**
 * A suspected kinjite awaiting panel review. The suspect is always the
 * apparent winner — only a rikishi who "won" needs a foul to be overturned.
 */
export interface FoulSuspicion {
  suspectSide: Side;
  suspectRikishiId: Id;
  victimRikishiId: Id;
  foul: KinjiteFoul;
}

/**
 * Calculates the probability that the apparent winner of a bout committed a
 * suspect foul, based on their aggression/technique ratio and bout context.
 *
 * Every bout carries a small baseline risk — real kinjite (the topknot grab,
 * the stray closed fist) happen in scrambles, not only in desperation spots.
 * Brawlers (high aggression / low technique) add risk on top, and must-win
 * desperation spots add more.
 *
 * @returns Probability between 0 and KINJITE_MAX_SUSPICION.
 */
export function calculateHansokuChance(
  winner: Rikishi,
  bout: BoutContext,
  basho: BashoState
): number {
  const aggression = winner.stats?.aggression ?? 50;
  const technique = winner.stats?.technique ?? 50;

  let suspicion = KINJITE_SUSPICION_BASE;

  const ratio = aggression / Math.max(1, technique);
  if (ratio >= KINJITE_MIN_RATIO_FOR_FOUL_RISK) {
    suspicion += (ratio - KINJITE_RATIO_SUBTRACTION) * KINJITE_RATIO_SCALE;
  }

  const day = bout.day ?? 1;
  if (day >= KINJITE_SENSHURAKU_START_DAY) suspicion += KINJITE_SENSHURAKU_BONUS;

  const winnerRecord = basho.standings?.get(winner.id);
  if (winnerRecord?.wins === 7 && winnerRecord?.losses === 7) {
    suspicion += KINJITE_SEVEN_SEVEN_BONUS;
  }

  if (
    winner.rank === "ozeki" &&
    day >= KINJITE_KADOBAN_DAY_THRESHOLD &&
    (winnerRecord?.wins ?? 0) < KINJITE_KADOBAN_WIN_THRESHOLD
  ) {
    suspicion += KINJITE_KADOBAN_BONUS;
  }

  return Math.min(suspicion, KINJITE_MAX_SUSPICION);
}

/**
 * Pick the kinjite category under review. Topknot grabs dominate (real
 * hansoku are overwhelmingly hair-pulls); the rest spread across the other
 * banned contact types.
 */
export function pickFoulType(rng: { next: () => number }): KinjiteFoul {
  const roll = rng.next();
  let cumulative = 0;
  for (const [foul, weight] of KINJITE_FOUL_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return foul as KinjiteFoul;
  }
  return KINJITE_FOUL_WEIGHTS[KINJITE_FOUL_WEIGHTS.length - 1][0] as KinjiteFoul;
}

/**
 * Stage 1 — roll whether the apparent winner committed a suspect foul the
 * judges must review. Returns null when nothing suspicious happened (the
 * overwhelmingly common case, plus ineligible results like fusensho).
 */
export function rollFoulSuspicion(
  bout: BoutContext,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  rngSeed: string
): FoulSuspicion | null {
  if (result.kimarite === "fusensho") return null;

  const winner = result.winner === "east" ? east : west;
  const dqChance = calculateHansokuChance(winner, bout, basho);
  if (dqChance <= 0) return null;

  const rng = rngFromSeed(rngSeed, "kinjite", "hansoku");
  if (rng.next() >= dqChance) return null;

  const suspectSide: Side = result.winner;
  return {
    suspectSide,
    suspectRikishiId: winner.id,
    victimRikishiId: suspectSide === "east" ? west.id : east.id,
    foul: pickFoulType(rng),
  };
}

/**
 * Stage 3 — the shimpan panel rules on the suspected foul. High-accuracy
 * panels are better at spotting real fouls; even a sharp panel can let a
 * borderline case stand (and a poor one can convict wrongly).
 *
 * @returns true when the foul is confirmed (hansoku), false when cleared.
 */
export function resolveFoulVerdict(
  suspicion: FoulSuspicion,
  panel: ShimpanPanel,
  rngSeed: string
): boolean {
  const panelAvg =
    (panel.chief.accuracy + panel.panelists.reduce((s, p) => s + p.accuracy, 0)) /
    (1 + panel.panelists.length);
  const confirmChance = clamp(
    FOUL_REVIEW_BASE_CONFIRM +
      (panelAvg - FOUL_REVIEW_ACCURACY_CENTER) * FOUL_REVIEW_ACCURACY_SCALE,
    FOUL_REVIEW_MIN_CONFIRM,
    FOUL_REVIEW_MAX_CONFIRM
  );
  const rng = rngFromSeed(rngSeed, "kinjite", `foul-review-${suspicion.suspectRikishiId}`);
  return rng.next() < confirmChance;
}

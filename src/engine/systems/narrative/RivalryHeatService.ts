/**
 * src/engine/systems/narrative/RivalryHeatService.ts
 * =================================================
 * Pure math logic for Rivalry evolution.
 *
 * Contains deterministic algorithms for:
 * 1. Heat & Spite Growth
 * 2. Tone Derivation
 * 3. Narrative Labeling
 *
 * Goal: Decouple business rules from state management.
 */

import { clamp } from "../../utils/math";
import { type SeededRNG } from "../../rng";
import type { Id } from "../../types/common";
import type {
  RivalryPairState,
  RivalriesState,
  RivalryTone,
  RivalryTrigger,
} from "../../../constants/engine/rivalry";
import {
  RIVALRY_STATE_DIVISOR,
  SAME_HEYA_RESPECT_HEAT_THRESHOLD,
  SAME_HEYA_RESPECT_SPITE_THRESHOLD,
  BAD_BLOOD_SPITE_THRESHOLD,
  BAD_BLOOD_HEAT_THRESHOLD,
  GRUDGE_SPITE_THRESHOLD,
  GRUDGE_HEAT_THRESHOLD,
  RESPECT_CLOSENESS_THRESHOLD,
  RESPECT_HEAT_THRESHOLD,
  UNSTABLE_CLOSENESS_THRESHOLD,
  UNSTABLE_SPITE_THRESHOLD,
  UNSTABLE_HEAT_THRESHOLD,
  PUBLIC_HYPE_MEETINGS_THRESHOLD,
  PUBLIC_HYPE_HEAT_THRESHOLD,
  PUBLIC_HYPE_SPITE_THRESHOLD,
  HEAT_BASE_GROWTH,
  HEAT_REPEAT_BONUS_MAX,
  HEAT_REPEAT_MULTIPLIER,
  HEAT_CLOSE_BONUS_MULTIPLIER,
  HEAT_UPSET_BONUS,
  HEAT_TITLE_BONUS,
  HEAT_KINBOSHI_BONUS,
  HEAT_FINAL_DAY_BONUS,
  HEAT_YUSHO_RACE_BONUS,
  CLOSENESS_GAIN_MULTIPLIER,
  SPITE_GAIN_MULTIPLIER,
  SPITE_UPSET_BONUS,
  TRIGGER_REPEAT_BASE,
  TRIGGER_REPEAT_DIVISOR,
  CLOSE_FINISH_THRESHOLD,
  CLOSE_FINISH_TRIGGER_BONUS,
  UPSET_TRIGGER_BONUS,
  KINBOSHI_TRIGGER_BONUS,
  TITLE_STAKES_TRIGGER_BONUS,
} from "../../../constants/engine/narrative";
import { RIVALRY_HEAT_SPICE_CHANCE } from "../../../constants/engine/rivalry";

/**
 * Determine the narrative tone from current state.
 */
export function deriveTone(pair: RivalryPairState): RivalryTone {
  const heat01 = pair.heat / RIVALRY_STATE_DIVISOR;
  const spite01 = pair.spite / RIVALRY_STATE_DIVISOR;
  const close01 = pair.closeness / RIVALRY_STATE_DIVISOR;

  if (
    pair.sameHeya &&
    pair.heat < SAME_HEYA_RESPECT_HEAT_THRESHOLD &&
    pair.spite < SAME_HEYA_RESPECT_SPITE_THRESHOLD
  )
    return "respect";

  if (spite01 > BAD_BLOOD_SPITE_THRESHOLD && heat01 > BAD_BLOOD_HEAT_THRESHOLD) return "bad_blood";
  if (spite01 > GRUDGE_SPITE_THRESHOLD && heat01 > GRUDGE_HEAT_THRESHOLD) return "grudge";

  if (close01 > RESPECT_CLOSENESS_THRESHOLD && heat01 > RESPECT_HEAT_THRESHOLD) return "respect";

  // volatile if both closeness and spite are meaningful
  if (
    close01 > UNSTABLE_CLOSENESS_THRESHOLD &&
    spite01 > UNSTABLE_SPITE_THRESHOLD &&
    heat01 > UNSTABLE_HEAT_THRESHOLD
  )
    return "unstable";

  // public hype is medium heat, lots of repeats, low spite
  if (
    pair.meetings >= PUBLIC_HYPE_MEETINGS_THRESHOLD &&
    pair.heat >= PUBLIC_HYPE_HEAT_THRESHOLD &&
    pair.spite < PUBLIC_HYPE_SPITE_THRESHOLD
  )
    return "public_hype";

  return "respect";
}

/**
 * Helper to bump a trigger value.
 */
export function bumpTrigger(
  triggers: Record<string, number>,
  t: RivalryTrigger,
  amt: number
): void {
  triggers[t] = (triggers[t] ?? 0) + amt;
}

/**
 * Apply a bout result to a rivalry pair's numerical state.
 */
export function applyBoutToPairState(
  pair: RivalryPairState,
  args: {
    rng: SeededRNG;
    isWinForA: boolean;
    isLossForA: boolean;
    isKinboshi: boolean;
    isTitleStakes: boolean;
    closeness01: number;
    domination01: number;
    isUpset: boolean;
    isFinalDay?: boolean;
    isYushoRace?: boolean;
    week: number;
    kimarite?: string;
    winnerId?: Id;
  }
): RivalryPairState {
  const { rng, isWinForA, isKinboshi, isTitleStakes, week, isFinalDay, isYushoRace } = args;

  let { aWins, bWins, heat, closeness, spite, meetings } = pair;

  if (isWinForA) aWins++;
  else bWins++;

  meetings++;

  // Heat growth
  const base = HEAT_BASE_GROWTH;
  const repeatBonus = Math.min(HEAT_REPEAT_BONUS_MAX, meetings * HEAT_REPEAT_MULTIPLIER);
  const closeBonus = Math.round(args.closeness01 * HEAT_CLOSE_BONUS_MULTIPLIER);
  const upsetBonus = args.isUpset ? HEAT_UPSET_BONUS : 0;
  const titleBonus = isTitleStakes ? HEAT_TITLE_BONUS : 0;
  const kinboshiBonus = isKinboshi ? HEAT_KINBOSHI_BONUS : 0;
  const highStakesBonus =
    (isFinalDay ? HEAT_FINAL_DAY_BONUS : 0) + (isYushoRace ? HEAT_YUSHO_RACE_BONUS : 0);

  // Closeness vs Spite
  const closenessGain = Math.round(args.closeness01 * CLOSENESS_GAIN_MULTIPLIER);
  const spiteGain =
    Math.round(args.domination01 * SPITE_GAIN_MULTIPLIER) + (args.isUpset ? SPITE_UPSET_BONUS : 0);

  // Deterministic spice
  const spice = rng.next() < RIVALRY_HEAT_SPICE_CHANCE ? 1 : 0;

  heat = clamp(
    heat +
      base +
      repeatBonus +
      closeBonus +
      upsetBonus +
      titleBonus +
      kinboshiBonus +
      highStakesBonus +
      spice,
    0,
    RIVALRY_STATE_DIVISOR
  );
  closeness = clamp(closeness + closenessGain, 0, RIVALRY_STATE_DIVISOR);
  spite = clamp(spite + spiteGain, 0, RIVALRY_STATE_DIVISOR);

  const triggers = { ...pair.triggers };
  bumpTrigger(
    triggers,
    "repeat_matches",
    TRIGGER_REPEAT_BASE + repeatBonus / TRIGGER_REPEAT_DIVISOR
  );
  if (args.closeness01 > CLOSE_FINISH_THRESHOLD)
    bumpTrigger(triggers, "close_finish", CLOSE_FINISH_TRIGGER_BONUS);
  if (args.isUpset) bumpTrigger(triggers, "upset", UPSET_TRIGGER_BONUS);
  if (isKinboshi) bumpTrigger(triggers, "kinboshi", KINBOSHI_TRIGGER_BONUS);
  if (isTitleStakes) bumpTrigger(triggers, "title_stakes", TITLE_STAKES_TRIGGER_BONUS);

  const next: RivalryPairState = {
    ...pair,
    meetings,
    lastMetWeek: week,
    aWins,
    bWins,
    heat,
    closeness,
    spite,
    triggers,
    lastKimarite: args.kimarite ?? pair.lastKimarite,
    lastWinnerId: args.winnerId ?? pair.lastWinnerId,
  };

  const tone = deriveTone(next);
  return { ...next, tone };
}

/**
 * Derive bout modifier values from a rivalry pair.
 * Returns tension in the 0.0–1.0 range (pair.heat / RIVALRY_STATE_DIVISOR).
 * Returns { tension: 0 } if the pair has never met.
 */
export function getRivalryBoutModifiers(args: { state: RivalriesState; aId: Id; bId: Id }): {
  tension: number;
} {
  const key = args.aId < args.bId ? `${args.aId}|${args.bId}` : `${args.bId}|${args.aId}`;
  const pair = args.state.pairs[key];
  if (!pair) return { tension: 0 };
  return { tension: pair.heat / RIVALRY_STATE_DIVISOR };
}

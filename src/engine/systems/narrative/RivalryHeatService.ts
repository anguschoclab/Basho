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

/**
 * Determine the narrative tone from current state.
 */
export function deriveTone(pair: RivalryPairState): RivalryTone {
  const heat01 = pair.heat / 100;
  const spite01 = pair.spite / 100;
  const close01 = pair.closeness / 100;

  if (pair.sameHeya && pair.heat < 50 && pair.spite < 40) return "respect";

  if (spite01 > 0.7 && heat01 > 0.65) return "bad_blood";
  if (spite01 > 0.45 && heat01 > 0.4) return "grudge";

  if (close01 > 0.65 && heat01 > 0.5) return "respect";

  // volatile if both closeness and spite are meaningful
  if (close01 > 0.45 && spite01 > 0.35 && heat01 > 0.55) return "unstable";

  // public hype is medium heat, lots of repeats, low spite
  if (pair.meetings >= 4 && pair.heat >= 35 && pair.spite < 35) return "public_hype";

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
  }
): RivalryPairState {
  const { rng, isWinForA, isKinboshi, isTitleStakes, week, isFinalDay, isYushoRace } = args;

  let { aWins, bWins, heat, closeness, spite, meetings } = pair;

  if (isWinForA) aWins++;
  else bWins++;

  meetings++;

  // Heat growth
  const base = 6;
  const repeatBonus = Math.min(10, meetings * 0.8);
  const closeBonus = Math.round(args.closeness01 * 10);
  const upsetBonus = args.isUpset ? 12 : 0;
  const titleBonus = isTitleStakes ? 6 : 0;
  const kinboshiBonus = isKinboshi ? 10 : 0;
  const highStakesBonus = (isFinalDay ? 8 : 0) + (isYushoRace ? 12 : 0);

  // Closeness vs Spite
  const closenessGain = Math.round(args.closeness01 * 8);
  const spiteGain = Math.round(args.domination01 * 6) + (args.isUpset ? 4 : 0);

  // Deterministic spice
  const spice = rng.next() < 0.25 ? 1 : 0;

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
    100
  );
  closeness = clamp(closeness + closenessGain, 0, 100);
  spite = clamp(spite + spiteGain, 0, 100);

  const triggers = { ...pair.triggers };
  bumpTrigger(triggers, "repeat_matches", 2 + repeatBonus / 4);
  if (args.closeness01 > 0.55) bumpTrigger(triggers, "close_finish", 4);
  if (args.isUpset) bumpTrigger(triggers, "upset", 6);
  if (isKinboshi) bumpTrigger(triggers, "kinboshi", 8);
  if (isTitleStakes) bumpTrigger(triggers, "title_stakes", 4);

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
  };

  const tone = deriveTone(next);
  return { ...next, tone };
}

/**
 * Derive bout modifier values from a rivalry pair.
 * Returns tension in the 0.0–1.0 range (pair.heat / 100).
 * Returns { tension: 0 } if the pair has never met.
 */
export function getRivalryBoutModifiers(args: { state: RivalriesState; aId: Id; bId: Id }): {
  tension: number;
} {
  const key = args.aId < args.bId ? `${args.aId}|${args.bId}` : `${args.bId}|${args.aId}`;
  const pair = args.state.pairs[key];
  if (!pair) return { tension: 0 };
  return { tension: pair.heat / 100 };
}

/**
 * src/engine/bout/boutTacticAftermath.ts
 * =======================================
 * Tactic aftermath: fatigue, momentum, and injury multiplier computation.
 * Extracted from boutResolver.ts for SRP separation.
 *
 * Per-side model (WS1): tactics are resolved per side (east/west) and their
 * costs apply to whichever rikishi held them — including both sides of an
 * NPC-vs-NPC bout.
 */

import type { Rikishi } from "../types/rikishi";
import type { BoutResult } from "../types/basho";
import { sideTactics, type BoutContext, type SideTactics } from "./boutUtils";
import type { BoutTactic } from "../types/combat";
import { getTacticProfile } from "./tacticProfiles";
import { clamp } from "../utils/math";
import {
  HENKA_MOMENTUM_PENALTY,
  STAT_CLAMP_MIN,
  STAT_CLAMP_MAX,
} from "../../constants/engine/physics";

function aftermathForSide(
  rikishi: Rikishi,
  isWinner: boolean,
  tactic: BoutTactic | undefined,
  kimarite: string
): { update: Partial<Rikishi>; injuryMultiplier: number } {
  let injuryMultiplier = 1.0;
  let update: Partial<Rikishi> = {};

  if (!tactic || kimarite === "fusensho") return { update, injuryMultiplier };

  const profile = getTacticProfile(tactic);

  if (profile.fatigueCost > 0) {
    const currentFatigue = rikishi.fatigue ?? 0;
    update = {
      ...update,
      fatigue: clamp(currentFatigue + profile.fatigueCost, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    };
  }

  const momentumDelta = isWinner ? profile.momentumOnWin : profile.momentumOnLoss;
  if (momentumDelta !== 0) {
    const currentMomentum = rikishi.momentum ?? 50;
    update = {
      ...update,
      momentum: clamp(currentMomentum + momentumDelta, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    };
  }

  // Winning by sidestep carries a momentum stigma (crowd dislikes henka wins).
  if (isWinner && tactic === "HENKA" && update.momentum === undefined) {
    const currentMomentum = rikishi.momentum ?? 50;
    update = {
      ...update,
      momentum: clamp(currentMomentum - HENKA_MOMENTUM_PENALTY, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    };
  }

  if (!isWinner) {
    injuryMultiplier = Math.max(injuryMultiplier, profile.injuryRiskMultiplier);
  }

  return { update, injuryMultiplier };
}

/**
 * Compute post-bout tactic costs for both sides.
 * Returns rikishi partial updates keyed by side plus the post-bout injury
 * risk multiplier (applied to the loser's injury roll downstream).
 */
export function computeTacticAftermath(
  bout: BoutContext,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  tactics?: SideTactics
): {
  eastUpdate: Partial<Rikishi>;
  westUpdate: Partial<Rikishi>;
  injuryMultiplier: number;
} {
  const resolved: SideTactics = tactics ?? sideTactics(bout);

  const eastResult = aftermathForSide(
    east,
    result.winner === "east",
    resolved.east,
    result.kimarite
  );
  const westResult = aftermathForSide(
    west,
    result.winner === "west",
    resolved.west,
    result.kimarite
  );

  return {
    eastUpdate: eastResult.update,
    westUpdate: westResult.update,
    injuryMultiplier: Math.max(eastResult.injuryMultiplier, westResult.injuryMultiplier),
  };
}

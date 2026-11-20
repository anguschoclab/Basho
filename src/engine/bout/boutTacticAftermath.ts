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

import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";
import { sideTactics, type BoutContext, type SideTactics } from "@/engine/bout/boutUtils";
import type { BoutTactic } from "@/engine/types/combat";
import { getTacticProfile } from "@/engine/bout/tacticProfiles";
import { clamp } from "@/engine/utils/math";
import { HENKA_MOMENTUM_PENALTY, STAT_CLAMP_MIN, STAT_CLAMP_MAX } from "@/constants/engine/physics";

function aftermathForSide(
  rikishi: Rikishi,
  isWinner: boolean,
  tactic: BoutTactic | undefined,
  kimarite: string,
  wonByHenka: boolean
): { update: Partial<Rikishi>; injuryMultiplier: number } {
  let injuryMultiplier = 1.0;
  let update: Partial<Rikishi> = {};

  if (kimarite === "fusensho") return { update, injuryMultiplier };
  if (!tactic && !wonByHenka) return { update, injuryMultiplier };

  // No declared tactic — only the spontaneous-henka stigma can still apply.
  if (!tactic) {
    if (isWinner && wonByHenka) {
      update = {
        momentum: clamp(
          (rikishi.momentum ?? 50) - HENKA_MOMENTUM_PENALTY,
          STAT_CLAMP_MIN,
          STAT_CLAMP_MAX
        ),
      };
    }
    return { update, injuryMultiplier };
  }

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

  // Winning by sidestep carries a momentum stigma (crowd dislikes henka
  // wins). A log-confirmed decisive sidestep (wonByHenka) earns the penalty
  // outright — it overrides the tactic profile's win momentum, spontaneous
  // or declared; the tactic-style win never happened.
  if (isWinner && (wonByHenka || (tactic === "HENKA" && update.momentum === undefined))) {
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

  // W N — a spontaneous henka leaves a `henka_success` log entry even when no
  // HENKA tactic was declared; the winner's side still earned the stigma.
  const henkaSide = result.log?.find((e) => e.data?.event === "henka_success")?.data
    ?.attackerSide as "east" | "west" | undefined;

  const eastWon = !result.isDraw && result.winner === "east";
  const westWon = !result.isDraw && result.winner === "west";
  const eastResult = aftermathForSide(
    east,
    eastWon,
    resolved.east,
    result.kimarite,
    eastWon && henkaSide === "east"
  );
  const westResult = aftermathForSide(
    west,
    westWon,
    resolved.west,
    result.kimarite,
    westWon && henkaSide === "west"
  );

  return {
    eastUpdate: eastResult.update,
    westUpdate: westResult.update,
    injuryMultiplier: Math.max(eastResult.injuryMultiplier, westResult.injuryMultiplier),
  };
}

/**
 * src/engine/bout/boutTacticAftermath.ts
 * =======================================
 * Tactic aftermath: fatigue, momentum, and injury multiplier computation.
 * Extracted from boutResolver.ts for SRP separation.
 */

import type { Rikishi } from "../types/rikishi";
import type { BoutResult } from "../types/basho";
import type { BoutContext } from "./boutPhysics";
import type { BoutTactic } from "../types/combat";
import { getTacticProfile } from "./tacticProfiles";
import { clamp } from "../utils/math";
import {
  HENKA_MOMENTUM_PENALTY,
  STAT_CLAMP_MIN,
  STAT_CLAMP_MAX,
} from "../../constants/engine/physics";

export function computeTacticAftermath(
  bout: BoutContext,
  result: BoutResult,
  winner: Rikishi,
  loser: Rikishi,
  cpuTacticOverride: BoutTactic | undefined
): {
  playerUpdate: Partial<Rikishi>;
  cpuUpdate: Partial<Rikishi>;
  injuryMultiplier: number;
} {
  let injuryMultiplier = 1.0;
  let playerUpdate: Partial<Rikishi> = {};
  let cpuUpdate: Partial<Rikishi> = {};

  const playerIsWinner = result.winner === bout.playerSide;
  const playerRikishi = playerIsWinner ? winner : loser;

  if (bout.playerTactic && bout.playerSide && result.kimarite !== "fusensho") {
    const profile = getTacticProfile(bout.playerTactic);

    if (profile.fatigueCost > 0) {
      const currentFatigue = playerRikishi.fatigue ?? 0;
      playerUpdate = {
        ...playerUpdate,
        fatigue: clamp(currentFatigue + profile.fatigueCost, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
      };
    }

    const momentumDelta = playerIsWinner ? profile.momentumOnWin : profile.momentumOnLoss;
    if (momentumDelta !== 0) {
      const currentMomentum = playerRikishi.momentum ?? 50;
      playerUpdate = {
        ...playerUpdate,
        momentum: clamp(currentMomentum + momentumDelta, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
      };
    }

    if (!playerIsWinner) {
      injuryMultiplier = Math.max(injuryMultiplier, profile.injuryRiskMultiplier);
    }
  }

  if (cpuTacticOverride && result.kimarite !== "fusensho") {
    const profile = getTacticProfile(cpuTacticOverride);
    const cpuIsWinner =
      (bout.playerSide === "east" && result.winner === "west") ||
      (bout.playerSide === "west" && result.winner === "east") ||
      !bout.playerSide;
    const cpuRikishi = cpuIsWinner ? winner : loser;

    if (profile.fatigueCost > 0) {
      const currentFatigue = cpuRikishi.fatigue ?? 0;
      cpuUpdate = {
        ...cpuUpdate,
        fatigue: clamp(currentFatigue + profile.fatigueCost, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
      };
    }

    const momentumDelta = cpuIsWinner ? profile.momentumOnWin : profile.momentumOnLoss;
    if (momentumDelta !== 0) {
      const currentMomentum = cpuRikishi.momentum ?? 50;
      cpuUpdate = {
        ...cpuUpdate,
        momentum: clamp(currentMomentum + momentumDelta, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
      };
    }

    if (!cpuIsWinner) {
      injuryMultiplier = Math.max(injuryMultiplier, profile.injuryRiskMultiplier);
    }
  }

  const playerHenkaWon =
    bout.playerTactic === "HENKA" &&
    result.winner === bout.playerSide &&
    result.kimarite !== "fusensho";
  if (playerHenkaWon && !playerUpdate?.momentum) {
    const currentMomentum = playerRikishi.momentum ?? 50;
    playerUpdate = {
      ...playerUpdate,
      momentum: clamp(currentMomentum - HENKA_MOMENTUM_PENALTY, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    };
  }

  return { playerUpdate, cpuUpdate, injuryMultiplier };
}

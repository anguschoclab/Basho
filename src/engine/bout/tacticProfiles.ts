/**
 * src/engine/bout/tacticProfiles.ts
 * ==================================
 * Single source-of-truth for bout tactic risk/reward profiles.
 *
 * Tactics affect:
 * - tachiaiPowerModifier: applied to the player-side rikishi's initial force
 * - kimariteWeightBias: flavor bias for kimarite family selection
 * - fatigueCost: flat fatigue delta applied post-bout to the player rikishi
 * - injuryRiskMultiplier: scales the post-bout injury roll for the loser
 * - momentumOnWin / momentumOnLoss: momentum delta applied post-bout
 */

import type { BoutTactic, TacticalFamily } from "../types/combat";
import {
  KIMARITE_BIAS_BELT_YOTSU,
  KIMARITE_BIAS_PUSH_YOTSU,
  KIMARITE_BIAS_PUSH_OSHI,
  KIMARITE_BIAS_BELT_OSHI,
  KIMARITE_BIAS_TRICK_HENKA,
  KIMARITE_BIAS_TRICK_DEFENSIVE,
  KIMARITE_BIAS_SPEED_DEFENSIVE,
  KIMARITE_BIAS_PUSH_ALL_OUT,
  KIMARITE_BIAS_TRICK_NEKODAMASHI,
  KIMARITE_BIAS_SPEED_NEKODAMASHI,
  INJURY_RISK_MULT_NORMAL,
  INJURY_RISK_MULT_OSHI_THRUST,
  INJURY_RISK_MULT_HENKA,
  INJURY_RISK_MULT_DEFENSIVE,
  INJURY_RISK_MULT_ALL_OUT,
  TACHIAI_POWER_MOD_YOTSU,
  TACHIAI_POWER_MOD_OSHI,
  TACHIAI_POWER_MOD_HENKA,
  TACHIAI_POWER_MOD_DEFENSIVE,
  TACHIAI_POWER_MOD_ALL_OUT,
  FATIGUE_COST_YOTSU,
  FATIGUE_COST_OSHI,
  FATIGUE_COST_LIGHT,
  FATIGUE_COST_ALL_OUT,
  MOMENTUM_WIN_YOTSU,
  MOMENTUM_LOSS_YOTSU,
  MOMENTUM_WIN_OSHI,
  MOMENTUM_LOSS_OSHI,
  MOMENTUM_WIN_HENKA,
  MOMENTUM_LOSS_HENKA,
  MOMENTUM_WIN_ALL_OUT,
  MOMENTUM_LOSS_ALL_OUT,
} from "../../constants/engine/bout";

export interface TacticProfile {
  id: BoutTactic;
  label: string;
  desc: string;
  /** Flavor bias for kimarite family selection (multiplicative). */
  kimariteWeightBias: Partial<Record<TacticalFamily, number>>;
  /** Primary win-probability lever: modifies the player-side rikishi's tachiai power. */
  tachiaiPowerModifier: number;
  /** Flat fatigue cost applied to the player rikishi after the bout (0-100 scale). */
  fatigueCost: number;
  /** Multiplier applied to the loser's post-bout injury chance. */
  injuryRiskMultiplier: number;
  /** Momentum delta applied to the player rikishi on win. */
  momentumOnWin: number;
  /** Momentum delta applied to the player rikishi on loss. */
  momentumOnLoss: number;
}

export const TACTIC_PROFILES: Record<BoutTactic, TacticProfile> = {
  STANDARD: {
    id: "STANDARD",
    label: "Standard",
    desc: "Balanced — no modifiers",
    kimariteWeightBias: {},
    tachiaiPowerModifier: 0,
    fatigueCost: 0,
    injuryRiskMultiplier: INJURY_RISK_MULT_NORMAL,
    momentumOnWin: 0,
    momentumOnLoss: 0,
  },
  YOTSU_BELT: {
    id: "YOTSU_BELT",
    label: "Yotsu (Belt)",
    desc: "Counters Thrust — favors belt kimarite",
    kimariteWeightBias: { belt: KIMARITE_BIAS_BELT_YOTSU, push: KIMARITE_BIAS_PUSH_YOTSU },
    tachiaiPowerModifier: TACHIAI_POWER_MOD_YOTSU,
    fatigueCost: FATIGUE_COST_YOTSU,
    injuryRiskMultiplier: INJURY_RISK_MULT_NORMAL,
    momentumOnWin: MOMENTUM_WIN_YOTSU,
    momentumOnLoss: MOMENTUM_LOSS_YOTSU,
  },
  OSHI_THRUST: {
    id: "OSHI_THRUST",
    label: "Oshi (Thrust)",
    desc: "Counters Henka — favors push kimarite",
    kimariteWeightBias: { push: KIMARITE_BIAS_PUSH_OSHI, belt: KIMARITE_BIAS_BELT_OSHI },
    tachiaiPowerModifier: TACHIAI_POWER_MOD_OSHI,
    fatigueCost: FATIGUE_COST_OSHI,
    injuryRiskMultiplier: INJURY_RISK_MULT_OSHI_THRUST,
    momentumOnWin: MOMENTUM_WIN_OSHI,
    momentumOnLoss: MOMENTUM_LOSS_OSHI,
  },
  HENKA: {
    id: "HENKA",
    label: "Henka",
    desc: "Counters Belt — sidestep gamble",
    kimariteWeightBias: { trick: KIMARITE_BIAS_TRICK_HENKA },
    tachiaiPowerModifier: TACHIAI_POWER_MOD_HENKA,
    fatigueCost: FATIGUE_COST_LIGHT,
    injuryRiskMultiplier: INJURY_RISK_MULT_HENKA,
    momentumOnWin: MOMENTUM_WIN_HENKA,
    momentumOnLoss: MOMENTUM_LOSS_HENKA,
  },
  DEFENSIVE_PULL: {
    id: "DEFENSIVE_PULL",
    label: "Defensive Pull",
    desc: "Absorb pressure, punish overcommit — lower win chance, lower risk",
    kimariteWeightBias: { trick: KIMARITE_BIAS_TRICK_DEFENSIVE, speed: KIMARITE_BIAS_SPEED_DEFENSIVE },
    tachiaiPowerModifier: TACHIAI_POWER_MOD_DEFENSIVE,
    fatigueCost: FATIGUE_COST_LIGHT,
    injuryRiskMultiplier: INJURY_RISK_MULT_DEFENSIVE,
    momentumOnWin: 0,
    momentumOnLoss: 0,
  },
  ALL_OUT: {
    id: "ALL_OUT",
    label: "All Out",
    desc: "Maximum aggression — higher win chance, higher fatigue and injury risk",
    kimariteWeightBias: { push: KIMARITE_BIAS_PUSH_ALL_OUT },
    tachiaiPowerModifier: TACHIAI_POWER_MOD_ALL_OUT,
    fatigueCost: FATIGUE_COST_ALL_OUT,
    injuryRiskMultiplier: INJURY_RISK_MULT_ALL_OUT,
    momentumOnWin: MOMENTUM_WIN_ALL_OUT,
    momentumOnLoss: MOMENTUM_LOSS_ALL_OUT,
  },
  NEKODAMASHI: {
    id: "NEKODAMASHI",
    label: "Nekodamashi",
    desc: "Cat-like fake-out — unorthodox tachiai clap trick that confuses belt specialists",
    kimariteWeightBias: { trick: KIMARITE_BIAS_TRICK_NEKODAMASHI, speed: KIMARITE_BIAS_SPEED_NEKODAMASHI },
    tachiaiPowerModifier: TACHIAI_POWER_MOD_HENKA,
    fatigueCost: FATIGUE_COST_LIGHT,
    injuryRiskMultiplier: INJURY_RISK_MULT_HENKA,
    momentumOnWin: MOMENTUM_WIN_HENKA,
    momentumOnLoss: MOMENTUM_LOSS_HENKA,
  },
};

/** Get the profile for a given tactic, defaulting to STANDARD if unknown. */
export function getTacticProfile(tactic: BoutTactic | undefined): TacticProfile {
  return TACTIC_PROFILES[tactic ?? "STANDARD"] ?? TACTIC_PROFILES.STANDARD;
}

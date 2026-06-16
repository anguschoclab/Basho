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
    injuryRiskMultiplier: 1.0,
    momentumOnWin: 0,
    momentumOnLoss: 0,
  },
  YOTSU_BELT: {
    id: "YOTSU_BELT",
    label: "Yotsu (Belt)",
    desc: "Counters Thrust — favors belt kimarite",
    kimariteWeightBias: { belt: 1.3, push: 0.8 },
    tachiaiPowerModifier: 1, // was 2 — bounded swing
    fatigueCost: 2,
    injuryRiskMultiplier: 1.0,
    momentumOnWin: 1,
    momentumOnLoss: -1,
  },
  OSHI_THRUST: {
    id: "OSHI_THRUST",
    label: "Oshi (Thrust)",
    desc: "Counters Henka — favors push kimarite",
    kimariteWeightBias: { push: 1.3, belt: 0.8 },
    tachiaiPowerModifier: 2, // was 4 — bounded swing
    fatigueCost: 3,
    injuryRiskMultiplier: 1.1,
    momentumOnWin: 2,
    momentumOnLoss: -2,
  },
  HENKA: {
    id: "HENKA",
    label: "Henka",
    desc: "Counters Belt — sidestep gamble",
    kimariteWeightBias: { trick: 1.5 },
    tachiaiPowerModifier: -10,
    fatigueCost: 1,
    injuryRiskMultiplier: 0.8,
    momentumOnWin: -3, // prestige penalty
    momentumOnLoss: -2,
  },
  DEFENSIVE_PULL: {
    id: "DEFENSIVE_PULL",
    label: "Defensive Pull",
    desc: "Absorb pressure, punish overcommit — lower win chance, lower risk",
    kimariteWeightBias: { trick: 1.2, speed: 1.1 },
    tachiaiPowerModifier: -3, // was -6 — bounded swing
    fatigueCost: 1,
    injuryRiskMultiplier: 0.7,
    momentumOnWin: 0,
    momentumOnLoss: 0,
  },
  ALL_OUT: {
    id: "ALL_OUT",
    label: "All Out",
    desc: "Maximum aggression — higher win chance, higher fatigue and injury risk",
    kimariteWeightBias: { push: 1.4 },
    tachiaiPowerModifier: 3, // was 10 — bounded swing
    fatigueCost: 8,
    injuryRiskMultiplier: 1.5,
    momentumOnWin: 4,
    momentumOnLoss: -4,
  },
};

/** Get the profile for a given tactic, defaulting to STANDARD if unknown. */
export function getTacticProfile(tactic: BoutTactic | undefined): TacticProfile {
  return TACTIC_PROFILES[tactic ?? "STANDARD"] ?? TACTIC_PROFILES.STANDARD;
}

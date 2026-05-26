// @ts-nocheck
/**
 * MediaImpactService.ts — Pure logic for calculating media heat, pressure, and impact.
 */

import { Rikishi } from "../../types/rikishi";
import { MediaHeadline, MediaTone, MediaBeat, HeadlineTier } from "../../types/media";
import { SIMULATION_CONFIG } from "../../core/SimulationConfig";
import { clampInt } from "../../utils/math";
import { assertNever } from "../../utils/types";
import {
  BASE_MEDIA_IMPACT,
  UPSET_IMPACT_BONUS,
  RIVALRY_TENSION_IMPACT_MULTIPLIER,
  MAX_MEDIA_IMPACT,
  YOKOZUNA_TIER_IMPACT,
  MAIN_EVENT_IMPACT_THRESHOLD,
  NATIONAL_IMPACT_THRESHOLD,
  MAIN_EVENT_TIER_BONUS,
  NATIONAL_TIER_BONUS,
  LOW_TIER_BONUS,
  HIGH_HEAT_DECAY_RATE,
  MEDIUM_HEAT_DECAY_RATE,
  LOW_HEAT_DECAY_RATE,
  HIGH_HEAT_THRESHOLD,
  MEDIUM_HEAT_THRESHOLD,
  MAX_HEAT,
  PRESSURE_DECAY_RATE,
  MAX_PRESSURE,
} from "../../../constants/engine/mediaImpact";

export function calculateBoutImpact(args: {
  upset: boolean;
  rivalryTension: number;
  winnerRank?: string;
  loserRank?: string;
}): number {
  let impact = BASE_MEDIA_IMPACT;
  if (args.upset) impact += UPSET_IMPACT_BONUS;

  impact += Math.round(args.rivalryTension * RIVALRY_TENSION_IMPACT_MULTIPLIER);

  impact += getRankImpact(args.winnerRank);
  impact += getRankImpact(args.loserRank);

  return clampInt(impact, 0, MAX_MEDIA_IMPACT);
}

const RANK_IMPACT_MAP: Record<string, number> = {
  yokozuna: YOKOZUNA_TIER_IMPACT,
  ozeki: 8,
  sekiwake: 6,
  komusubi: 5,
  maegashira: 3,
  juryo: 2,
  makushita: 0,
  sandanme: 0,
  jonidan: 0,
  jonokuchi: 0,
};

export function getRankImpact(rank?: string): number {
  if (!rank) return 0;
  return RANK_IMPACT_MAP[rank] ?? 0;
}

export function determineTier(impact: number): HeadlineTier {
  if (impact >= MAIN_EVENT_IMPACT_THRESHOLD) return "main_event";
  if (impact >= NATIONAL_IMPACT_THRESHOLD) return "national";
  return "local";
}

export function calculateHeatBump(impact: number): number {
  if (impact >= MAIN_EVENT_IMPACT_THRESHOLD) return MAIN_EVENT_TIER_BONUS;
  if (impact >= NATIONAL_IMPACT_THRESHOLD) return NATIONAL_TIER_BONUS;
  return LOW_TIER_BONUS;
}

const PRESSURE_BUMP_MAP: Record<MediaTone, number> = {
  concern: 8,
  controversy: 8,
  disrespect: 6,
  hype: 2,
  praise: 2,
  neutral: 2,
  feature: 2,
  narrative: 2,
  analysis: 2,
  interview: 2,
  rumor: 2,
};

export function calculatePressureBump(tone: MediaTone): number {
  return PRESSURE_BUMP_MAP[tone] ?? 2;
}

export function decayHeat(currentHeat: number): number {
  const decay = currentHeat >= HIGH_HEAT_THRESHOLD ? HIGH_HEAT_DECAY_RATE : currentHeat >= MEDIUM_HEAT_THRESHOLD ? MEDIUM_HEAT_DECAY_RATE : LOW_HEAT_DECAY_RATE;
  return clampInt(currentHeat - decay, 0, MAX_HEAT);
}

export function decayPressure(currentPressure: number): number {
  return clampInt(currentPressure - PRESSURE_DECAY_RATE, 0, MAX_PRESSURE);
}

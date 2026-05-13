// @ts-nocheck
/**
 * MediaImpactService.ts — Pure logic for calculating media heat, pressure, and impact.
 */

import { Rikishi } from "../../types/rikishi";
import { MediaHeadline, MediaTone, MediaBeat, HeadlineTier } from "../../types/media";
import { SIMULATION_CONFIG } from "../../core/SimulationConfig";
import { clampInt } from "../../utils/math";
import { assertNever } from "../../utils/types";

export function calculateBoutImpact(args: {
  upset: boolean;
  rivalryTension: number;
  winnerRank?: string;
  loserRank?: string;
}): number {
  let impact = 18;
  if (args.upset) impact += 20;

  impact += Math.round(args.rivalryTension * 22);

  impact += getRankImpact(args.winnerRank);
  impact += getRankImpact(args.loserRank);

  return clampInt(impact, 0, 100);
}

const RANK_IMPACT_MAP: Record<string, number> = {
  yokozuna: 10,
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
  if (impact >= 70) return "main_event";
  if (impact >= 40) return "national";
  return "local";
}

export function calculateHeatBump(impact: number): number {
  if (impact >= 70) return 10;
  if (impact >= 40) return 6;
  return 3;
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
  const decay = currentHeat >= 70 ? 4 : currentHeat >= 40 ? 3 : 2;
  return clampInt(currentHeat - decay, 0, 100);
}

export function decayPressure(currentPressure: number): number {
  return clampInt(currentPressure - 3, 0, 100);
}

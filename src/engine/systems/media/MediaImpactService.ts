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

export function getRankImpact(rank?: string): number {
  switch (rank) {
    case "yokozuna":
      return 10;
    case "ozeki":
      return 8;
    case "sekiwake":
      return 6;
    case "komusubi":
      return 5;
    case "maegashira":
      return 3;
    case "juryo":
      return 2;
    case "makushita":
      return 0;
    case "sandanme":
      return 0;
    case "jonidan":
      return 0;
    case "jonokuchi":
      return 0;
    case undefined:
      return 0;
    default:
      assertNever(rank as never);
      return 0;
  }
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

export function calculatePressureBump(tone: MediaTone): number {
  switch (tone) {
    case "concern":
    case "controversy":
      return 8;
    case "disrespect":
      return 6;
    case "hype":
    case "praise":
    case "neutral":
    case "feature":
    case "narrative":
    case "analysis":
    case "interview":
    case "rumor":
      return 2;
    default:
      assertNever(tone);
      return 2;
  }
}

export function decayHeat(currentHeat: number): number {
  const decay = currentHeat >= 70 ? 4 : currentHeat >= 40 ? 3 : 2;
  return clampInt(currentHeat - decay, 0, 100);
}

export function decayPressure(currentPressure: number): number {
  return clampInt(currentPressure - 3, 0, 100);
}

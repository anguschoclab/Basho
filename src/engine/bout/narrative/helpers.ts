/**
 * helpers.ts — shared helpers for bout narration.
 * Moved verbatim from boutNarrative.ts during the narrative pipeline split.
 */
import { rngFromSeed } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { Rank } from "../../types/banzuke";
import type { BoutResult } from "../../types/basho";
import { BardEngine } from "../../bard/BardEngine";
import { type VoiceStyle } from "../../bard/narrativeContext";
import {
  INTENSITY_DRAMATIC,
  INTENSITY_UNDERSTATED,
  INTENSITY_FORMAL,
  CAREER_WIN_MILESTONES,
} from "../../../constants/engine/generation";
import { NOTABLE_NARRATIVE_TAGS, NOTABLE_NARRATIVE_PHASES } from "../../almanac/types";
import type { PbpLine } from "./pbpTypes";

export function countMakuuchiTournaments(history: { division?: string }[] | undefined): number {
  if (!history) return 0;
  let count = 0;
  for (const s of history) {
    if (s.division === "makuuchi") count++;
  }
  return count;
}

const FOCUS_BIAS_TO_STYLE: Record<string, string> = {
  power: "oshi",
  technique: "yotsu",
  speed: "speedster",
  balanced: "hybrid",
};

export function focusBiasToStyleKey(focusBias: string): string | undefined {
  return FOCUS_BIAS_TO_STYLE[focusBias];
}

export const SANYAKU_RANKS: readonly Rank[] = ["sekiwake", "komusubi"];

export function isSanyakuPromotionByRank(currentRank: Rank, prevRank: Rank): boolean {
  return (
    SANYAKU_RANKS.includes(currentRank) &&
    !SANYAKU_RANKS.includes(prevRank) &&
    prevRank !== "yokozuna" &&
    prevRank !== "ozeki"
  );
}

export function getIntensity(voiceStyle: VoiceStyle): number {
  if (voiceStyle === "dramatic") return INTENSITY_DRAMATIC;
  if (voiceStyle === "understated") return INTENSITY_UNDERSTATED;
  return INTENSITY_FORMAL;
}

/**
 * Generate narrative lines for kyujo (withdrawal) events.
 * Used by HealthActions.withdrawRikishi and LoopDecisionEngine for withdrawal decisions.
 */
export function generateKyujoNarrative(
  rikishi: Rikishi,
  type: "injury_withdrawal" | "pre_basho_withdrawal" | "return_from_kyujo",
  context: { area?: string; day?: number; reason?: string; bashosMissed?: number },
  seed: string
): PbpLine[] {
  const rng = rngFromSeed(seed, "kyujo", type);
  const lines: PbpLine[] = [];

  const path = `kyujo.${type}`;
  if (!BardEngine.has(path)) return lines;

  const res = BardEngine.resolve(rng, path, {
    SHIKONA: rikishi.shikona,
    AREA: context.area ?? "leg",
    DAY: (context.day ?? 1).toString(),
    REASON: context.reason ?? "injury",
    BASHOS_MISSED: (context.bashosMissed ?? 1).toString(),
    rikishiId: rikishi.id,
  });

  if (res.text && !res.text.includes("[MISSING:")) {
    lines.push({
      text: res.text,
      id: `kyujo-${rikishi.id}-${type}-${lines.length}`,
      phase: "kyujo",
      tags: ["injury"],
    });
  }

  return lines;
}

export function extractNotableNarrativeLines(lines: PbpLine[]): string[] {
  const tagSet = new Set<string>(NOTABLE_NARRATIVE_TAGS);
  const phaseSet = new Set<string>(NOTABLE_NARRATIVE_PHASES);
  const result: string[] = [];
  for (const line of lines) {
    const hasTag = line.tags?.some((t) => tagSet.has(t));
    const hasPhase = line.phase != null && phaseSet.has(line.phase);
    if (hasTag || hasPhase) {
      result.push(line.text);
    }
  }
  return result;
}

export function isNotableBout(
  result: BoutResult,
  lines: PbpLine[],
  winnerCareerWins: number
): boolean {
  if (result.isKinboshi === true) return true;
  if (result.isYushoRace === true) return true;
  if (result.upset === true) return true;
  if (lines.some((l) => l.tags?.includes("milestone") || l.tags?.includes("career_high")))
    return true;
  if (result.excitementScore != null && result.excitementScore > 30) return true;
  if (CAREER_WIN_MILESTONES.includes(winnerCareerWins + 1)) return true;
  return false;
}

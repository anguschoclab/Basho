/**
 * helpers.ts — shared helpers for bout narration.
 * Moved verbatim from boutNarrative.ts during the narrative pipeline split.
 */
import { rngFromSeed } from "@/engine/core/rng";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Division, Rank } from "@/engine/types/banzuke";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import { BardEngine } from "@/engine/bard/BardEngine";
import { type VoiceStyle } from "@/engine/bard/narrativeContext";
import {
  INTENSITY_DRAMATIC,
  INTENSITY_UNDERSTATED,
  INTENSITY_FORMAL,
  CAREER_WIN_MILESTONES,
} from "@/constants/engine/generation";
import { NOTABLE_NARRATIVE_TAGS, NOTABLE_NARRATIVE_PHASES } from "@/engine/almanac/types";
import type { PbpLine } from "@/engine/bout/narrative/pbpTypes";
import { isKachiKoshi } from "@/engine/banzuke/banzukeHelpers";
import { isSanyakuRank } from "@/constants/engine/rankDisplay";

/** Count trailing non-kachi-koshi tournaments in a rikishi's career history. */
export function countKachiKoshiDrought(
  history: { wins: number; losses: number; rank: Rank }[] | undefined
): number {
  if (!history || history.length === 0) return 0;
  let drought = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i];
    if (isKachiKoshi(s.wins, s.losses, s.rank)) break;
    drought++;
  }
  return drought;
}

export function countMakuuchiTournaments(history: { division?: string }[] | undefined): number {
  if (!history) return 0;
  let count = 0;
  for (const s of history) {
    if (s.division === "makuuchi") count++;
  }
  return count;
}

/** W P — trailing strictly-alternating kachi-koshi/make-koshi bashos. */
export function countAlternatingRecords(
  history: { wins: number; losses: number }[] | undefined
): number {
  if (!history || history.length < 2) return 0;
  let streak = 1;
  for (let i = history.length - 1; i > 0; i--) {
    const cur = history[i].wins > history[i].losses;
    const prev = history[i - 1].wins > history[i - 1].losses;
    if (cur === prev) break;
    streak++;
  }
  return streak;
}

/**
 * W Z — find a sibling who tops (or co-leads) a DIFFERENT division's
 * standings. Shared by the pre-bout `sibling_lead` beat and the
 * sibling-lead interview question; previously the per-division maxima
 * loop lived inside `beatSiblingLead` alone.
 *
 * The standings map is flat across divisions, so "the lead" only means
 * anything per division — computed here in a single pass.
 */
export function findDivisionLeadingSibling(
  world: Pick<WorldState, "currentBasho" | "rikishi">,
  focal: Rikishi
): { sibling: Rikishi; wins: number } | undefined {
  const standings = world.currentBasho?.standings;
  if (!standings) return undefined;
  const divisionMax = new Map<Division, number>();
  for (const [rid, rec] of standings) {
    const rr = world.rikishi.get(rid);
    if (!rr?.division) continue;
    if (rec.wins > (divisionMax.get(rr.division) ?? 0)) {
      divisionMax.set(rr.division, rec.wins);
    }
  }
  for (const sibId of focal.siblingIds ?? []) {
    const sib = world.rikishi.get(sibId);
    if (!sib || sib.division === focal.division) continue;
    const sibWins = standings.get(sibId)?.wins ?? sib.currentBashoWins ?? 0;
    if (sibWins === 0) continue;
    if (sibWins < (divisionMax.get(sib.division) ?? 0)) continue;
    return { sibling: sib, wins: sibWins };
  }
  return undefined;
}

const SUB_JURYO_DIVISIONS = new Set(["makushita", "sandanme", "jonidan", "jonokuchi"]);

/** W P — career history shows a sanyaku stint followed by a sub-juryo trough. */
export function hasSanyakuToSubJuryoFall(
  history: { division?: string; rank?: string }[] | undefined
): boolean {
  if (!history) return false;
  let seenSanyaku = false;
  for (const s of history) {
    if (s.rank && isSanyakuRank(s.rank)) {
      seenSanyaku = true;
    } else if (seenSanyaku && s.division && SUB_JURYO_DIVISIONS.has(s.division)) {
      return true;
    }
  }
  return false;
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

/** Lower-sanyaku ranks that sit just below ozeki (sekiwake/komusubi). */
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

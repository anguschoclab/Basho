/**
 * resolution/enrichment.ts
 * ========================
 * Result enrichment after physics + officiating: kimarite display name,
 * kinboshi/award detection, winner career highlights, dramatic context,
 * narrative generation, and per-side tactic aftermath.
 */

import type { BoutContext } from "../boutPhysics";
import type { Rikishi } from "../../types/rikishi";
import type { BashoState, BoutResult, BashoName } from "../../types/basho";
import type { WorldState } from "../../types/world";
import type { BoutTactic } from "../../types/combat";
import type { ImpactBuilder } from "../../core/ImpactBuilder";
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
import { getKimarite } from "../../kimarite";
import { generateBoutNarrative } from "../boutNarrative";
import { detectKinboshi } from "../boutAchievements";
import { recordCareerHighlight, type CareerHighlight } from "../CareerHighlights";
import { computeTacticAftermath } from "../boutTacticAftermath";

/**
 * 2. Achievement Detection (Gold & Silver Stars - v2)
 * Must run BEFORE generateBoutNarrative so awardFact is set when
 * the narrative generator checks for kinboshi/ginboshi award lines.
 * Detection is pure: awards are stamped on the result here, and the
 * applier owns all counter/state side-effects exactly once.
 */
function detectAwards(result: BoutResult, winner: Rikishi, loser: Rikishi, bout: BoutContext) {
  const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser, {
    isPlayoff: bout.isPlayoff,
  });
  result.isKinboshi = !!kinboshiDelta;
  if (awards.length > 0) {
    result.awards = awards;
  }
  return kinboshiDelta;
}

/** 2.1. Record career highlights for the winner (debut, 7-7, kinboshi). */
function recordWinnerHighlights(
  winner: Rikishi,
  loser: Rikishi,
  bout: BoutContext,
  bashoLabel: string,
  kinboshiDelta: boolean,
  builder: ImpactBuilder
) {
  const winnerHighlights: CareerHighlight[] = [];
  const winnerWins = winner.currentBashoWins ?? 0;
  const winnerLosses = winner.currentBashoLosses ?? 0;

  // Debut win
  if (!winner.careerHistory || winner.careerHistory.length === 0) {
    winnerHighlights.push({
      type: "debut_win",
      basho: bashoLabel,
      opponent: loser.id,
      description: `First career win over ${loser.shikona}`,
    });
  }
  // 7-7 pressure win
  if (winnerWins === 7 && winnerLosses === 7) {
    winnerHighlights.push({
      type: "seven_seven_win",
      basho: bashoLabel,
      opponent: loser.id,
      description: `Won 7-7 pressure bout on day ${bout.day}`,
    });
  }
  // Kinboshi
  if (kinboshiDelta) {
    winnerHighlights.push({
      type: "kinboshi",
      basho: bashoLabel,
      opponent: loser.id,
      description: `Upset win over ${loser.shikona} (${loser.rank ?? "unknown"})`,
    });
  }
  // Apply highlights to winner
  if (winnerHighlights.length > 0) {
    let updatedWinner = winner;
    for (const hl of winnerHighlights) {
      updatedWinner = recordCareerHighlight(updatedWinner, hl);
    }
    builder.updateRikishi(winner.id, {
      careerHighlights: updatedWinner.careerHighlights,
    });
  }
}

/**
 * Enrich the bout result in place: resolved tactics observability, kimarite
 * display name, achievements, winner highlights, dramatic context, and the
 * generated narrative.
 */
export function enrichResult(
  bout: BoutContext,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  winner: Rikishi,
  loser: Rikishi,
  basho: BashoState,
  world: WorldState | undefined,
  builder: ImpactBuilder
) {
  // Enrich kimariteName from registry (classifier returns id; registry has display name)
  // ⚡ Bolt: Replace O(N) array find with O(1) Map lookup in boutResolver
  const k = getKimarite(result.kimarite);
  if (k) result.kimariteName = k.name;

  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;

  const kinboshiDelta = detectAwards(result, winner, loser, bout);

  const bashoLabel = `${basho.year ?? world?.year ?? DEFAULT_START_YEAR}-${bashoName ?? "unknown"}`;
  recordWinnerHighlights(winner, loser, bout, bashoLabel, kinboshiDelta, builder);

  // 2.5. Copy dramatic context from match schedule onto result
  const match = basho.matches?.find((m) => m.boutId === result.boutId);
  if (match?.dramaticContext) {
    result.dramaticContext = match.dramaticContext;
  }

  // 2.6. Generate narrative based on data frames
  generateBoutNarrative(
    result,
    east,
    west,
    bashoName,
    bout.day,
    `${result.boutId}-pbp`,
    world || ({} as WorldState)
  );
}

/**
 * 3. Tactic aftermath (fatigue, momentum, injury multiplier) — per side.
 */
export function applyTacticAftermath(
  bout: BoutContext,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  eastTactic: BoutTactic | undefined,
  westTactic: BoutTactic | undefined,
  builder: ImpactBuilder
) {
  const { eastUpdate, westUpdate, injuryMultiplier } = computeTacticAftermath(
    bout,
    result,
    east,
    west,
    { east: eastTactic, west: westTactic }
  );
  if (Object.keys(eastUpdate).length > 0) {
    builder.updateRikishi(east.id, eastUpdate);
  }
  if (Object.keys(westUpdate).length > 0) {
    builder.updateRikishi(west.id, westUpdate);
  }
  result.tacticInjuryRiskMultiplier = injuryMultiplier;
}

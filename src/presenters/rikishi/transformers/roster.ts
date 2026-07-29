/**
 * Roster Transformer
 * ===================
 * Projects a Rikishi into a UIRosterEntry for banzuke/roster views.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { WorldState } from "../../../engine/types/world";
import { SeededRNG } from "../../../engine/rng";
import { NarrativeService } from "../../../engine/systems/narrative/NarrativeService";
import { toPotentialBand } from "../../../engine/descriptorBands";
import { getCitizenshipStatus, yearsUntilNaturalization } from "../../../engine/utils/citizenshipUtils";
import { resolveRegistryLabel, resolveRegistryLabelJa } from "../../uiUtilities";
import type { UIRosterEntry, UIRankDelta } from "../types";
import { rankScore, calculateStreak } from "./career";
import type { KeshoMawashi } from "../../../engine/types/keshoMawashi";

/**
 * Project a rikishi into a roster entry for banzuke/roster display.
 */
export function projectRosterEntry(
  r: Rikishi,
  world?: WorldState,
  prevScore?: number
): UIRosterEntry {
  const rankLabel = resolveRegistryLabel("ranks", r.rank);
  const rankLabelJa = resolveRegistryLabelJa("ranks", r.rank);
  let rankDelta: UIRankDelta | undefined;

  const rng = world?.rng || new SeededRNG(world?.seed || r.id);

  if (prevScore !== undefined) {
    const currScore = rankScore(r.rank, r.rankNumber, r.side);
    const diff = prevScore - currScore;
    if (Math.abs(diff) < 1) {
      rankDelta = { type: "unchanged", steps: 0 };
    } else {
      const steps = Math.round(Math.abs(diff) / 2);
      rankDelta = { type: diff > 0 ? "up" : "down", steps };
    }
  } else if (world && world.history && world.history.length > 0) {
    rankDelta = { type: "new", steps: 0 };
  }

  const heya = world ? world.heyas.get(r.heyaId) : null;
  const isPlayerOwned = heya?.isPlayerOwned ?? false;

  return {
    id: r.id,
    shikona: r.shikona,
    heyaId: r.heyaId,
    isPlayerOwned,
    rank: r.rank,
    rankLabel,
    rankLabelJa,
    rankNumber: r.rankNumber,
    division: r.division,
    side: r.side,
    record: `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    careerRecord: (r.careerAbsences ?? 0) > 0
      ? `${r.careerWins}-${r.careerLosses}-${r.careerAbsences}`
      : `${r.careerWins}-${r.careerLosses}`,
    currentBashoWins: r.currentBashoWins ?? 0,
    currentBashoLosses: r.currentBashoLosses ?? 0,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    careerAbsences: r.careerAbsences ?? 0,
    isInjured: r.injured,
    condition: r.condition,
    fatigue: r.fatigue,
    powerBand: NarrativeService.getStatLabelForValue(rng, r.stats.power),
    techniqueBand: NarrativeService.getStatLabelForValue(rng, r.stats.technique),
    speedBand: NarrativeService.getStatLabelForValue(rng, r.stats.speed),
    balanceBand: NarrativeService.getStatLabelForValue(rng, r.stats.balance),
    momentum: r.momentum,
    potentialBand: toPotentialBand(r.talentSeed ?? 50),
    archetypeLabel: resolveRegistryLabel("archetypes", r.combatProfile?.archetype ?? "hybrid"),
    rankDelta,
    avatarConfig: r.avatarConfig,
    keshoMawashi: world?.customKeshoConfigs?.[r.id]
      ? ({ ...r.keshoMawashi, ...world.customKeshoConfigs[r.id] } as KeshoMawashi)
      : r.keshoMawashi,
    consecutiveStrongOzeki: r.consecutiveStrongOzeki ?? 0,
    consecutiveStrongSekiwake: r.consecutiveStrongSekiwake ?? 0,
    consecutiveMakeKoshi: r.consecutiveMakeKoshi ?? 0,
    consecutiveKyujo: r.consecutiveKyujo ?? 0,
    consecutiveKachiKoshi: r.consecutiveKachiKoshi ?? 0,
    councilWarnings: r.councilWarnings ?? 0,
    streakLabel: calculateStreak(r.history ?? []).label,
    winPercentage: r.careerWins / Math.max(1, r.careerWins + r.careerLosses),
    citizenshipStatus: getCitizenshipStatus(r, world?.year ?? 2020),
    yearsToNaturalization: yearsUntilNaturalization(r, world?.year ?? 2020),
  };
}

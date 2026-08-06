/**
 * src/engine/bout/yaocho.ts
 * ==========================
 * Yaocho (八百長) — Match-fixing scandal trigger.
 *
 * Detects suspicious bout patterns that may indicate match-fixing:
 * - Same-heyas rikishi with suspiciously predictable outcomes
 * - 7-7 rikishi winning disproportionately on senshuraku weekend
 * - Repeated identical kimarite patterns between the same pair
 *
 * When triggered, generates a major/critical scandal via the existing
 * governance system (reportScandal).
 */

import type { WorldState } from "../types/world";
import type { BoutResult, BashoState } from "../types/basho";
import { getRikishi } from "../queries";
import { reportScandal } from "../systems/governance/ScandalService";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { rngFromSeed } from "../rng";
import {
  YAOCHO_BASE_DETECTION_CHANCE,
  YAOCHO_PER_INDICATOR_CHANCE,
  YAOCHO_MAX_CHANCE,
  YAOCHO_REPEAT_KIMARITE_THRESHOLD,
  YAOCHO_H2H_DOMINANCE_MIN_MEETINGS,
  YAOCHO_H2H_DOMINANCE_WIN_RATE,
  YAOCHO_SENSHURAKU_START_DAY,
  YAOCHO_SAME_HEYA_77_BONUS,
  YAOCHO_SHORT_BOUT_THRESHOLD,
  YAOCHO_DEFAULT_DURATION,
  YAOCHO_SEVERITY_CRITICAL_INDICATORS,
  YAOCHO_SEVERITY_MAJOR_INDICATORS,
} from "../../constants/engine/bout";

export interface YaochoIndicators {
  /** Both rikishi are from the same heya (cross-stable fixing is rare). */
  sameHeya: boolean;
  /** Loser is 7-7 on senshuraku weekend (days 14-15) — high pressure to win. */
  loserIs77OnSenshuraku: boolean;
  /** Winner has suspiciously high win rate vs this opponent historically. */
  h2hDominance: boolean;
  /** Same kimarite repeated 3+ times in H2H history. */
  repeatedKimarite: boolean;
  /** Bout was suspiciously short (under 3 seconds). */
  suspiciouslyShort: boolean;
}

/**
 * Evaluates yaocho indicators for a given bout result.
 */
export function evaluateYaochoIndicators(
  world: WorldState,
  result: BoutResult,
  basho: BashoState,
  day: number
): YaochoIndicators {
  const winner = getRikishi(world, result.winnerRikishiId);
  const loser = getRikishi(world, result.loserRikishiId);
  if (!winner || !loser) {
    return {
      sameHeya: false,
      loserIs77OnSenshuraku: false,
      h2hDominance: false,
      repeatedKimarite: false,
      suspiciouslyShort: false,
    };
  }

  const sameHeya = winner.heyaId === loser.heyaId && winner.heyaId !== undefined;

  const loserRecord = basho.standings?.get(loser.id);
  const loserIs77OnSenshuraku =
    day >= YAOCHO_SENSHURAKU_START_DAY && loserRecord?.wins === 7 && loserRecord?.losses === 7;

  // Check H2H dominance from winner's h2h record
  const h2hEntry = winner.h2h?.[loser.id];
  const h2hWins = h2hEntry?.wins ?? 0;
  const h2hLosses = h2hEntry?.losses ?? 0;
  const totalMeetings = h2hWins + h2hLosses;
  const h2hDominance =
    totalMeetings >= YAOCHO_H2H_DOMINANCE_MIN_MEETINGS &&
    h2hWins / totalMeetings >= YAOCHO_H2H_DOMINANCE_WIN_RATE;

  // Check repeated kimarite in H2H history (using lastMatch as indicator)
  const lastKimarite = h2hEntry?.lastMatch?.kimarite;
  const repeatedKimarite =
    lastKimarite === result.kimarite && totalMeetings >= YAOCHO_REPEAT_KIMARITE_THRESHOLD;

  const suspiciouslyShort =
    (result.duration ?? YAOCHO_DEFAULT_DURATION) < YAOCHO_SHORT_BOUT_THRESHOLD &&
    result.kimarite !== "fusensho";

  return {
    sameHeya,
    loserIs77OnSenshuraku,
    h2hDominance,
    repeatedKimarite,
    suspiciouslyShort,
  };
}

/**
 * Calculates the probability of yaocho detection based on indicators.
 */
export function calculateYaochoChance(indicators: YaochoIndicators): number {
  let count = 0;
  if (indicators.sameHeya) count++;
  if (indicators.loserIs77OnSenshuraku) count++;
  if (indicators.h2hDominance) count++;
  if (indicators.repeatedKimarite) count++;
  if (indicators.suspiciouslyShort) count++;

  if (count === 0) return 0;

  let chance = YAOCHO_BASE_DETECTION_CHANCE + count * YAOCHO_PER_INDICATOR_CHANCE;

  // Same-heya + 7-7 on senshuraku is the classic yaocho pattern
  if (indicators.sameHeya && indicators.loserIs77OnSenshuraku) {
    chance += YAOCHO_SAME_HEYA_77_BONUS;
  }

  return Math.min(chance, YAOCHO_MAX_CHANCE);
}

/**
 * Checks a bout result for yaocho indicators and potentially triggers
 * a scandal. Returns the StateImpact with any scandal reports merged in.
 */
export function checkYaocho(
  world: WorldState,
  result: BoutResult,
  basho: BashoState,
  day: number,
  rngSeed: string
): StateImpact {
  const builder = createImpactBuilder("yaochoCheck");

  if (result.kimarite === "fusensho" || result.kimarite === "hansoku") {
    return builder.build();
  }

  const indicators = evaluateYaochoIndicators(world, result, basho, day);
  const chance = calculateYaochoChance(indicators);
  if (chance <= 0) return builder.build();

  const rng = rngFromSeed(rngSeed, "yaocho", "detection");
  if (rng.next() >= chance) return builder.build();

  // Determine severity based on indicator count
  let indicatorCount = 0;
  if (indicators.sameHeya) indicatorCount++;
  if (indicators.loserIs77OnSenshuraku) indicatorCount++;
  if (indicators.h2hDominance) indicatorCount++;
  if (indicators.repeatedKimarite) indicatorCount++;
  if (indicators.suspiciouslyShort) indicatorCount++;
  const severity: "minor" | "major" | "critical" =
    indicatorCount >= YAOCHO_SEVERITY_CRITICAL_INDICATORS
      ? "critical"
      : indicatorCount >= YAOCHO_SEVERITY_MAJOR_INDICATORS
        ? "major"
        : "minor";

  // Report scandal for both heyas involved
  const winner = getRikishi(world, result.winnerRikishiId);
  const loser = getRikishi(world, result.loserRikishiId);

  if (loser?.heyaId) {
    builder.merge(reportScandal(world, loser.heyaId, severity, "Suspected match-fixing (yaocho)"));
  }
  if (winner?.heyaId && winner.heyaId !== loser?.heyaId) {
    builder.merge(
      reportScandal(
        world,
        winner.heyaId,
        severity === "critical" ? "major" : "minor",
        "Suspected match-fixing (yaocho) — winning stable"
      )
    );
  }

  builder.logEvent(
    "GOVERNANCE_RULING",
    "discipline",
    {
      incident: "yaocho_detected",
      yaochoSeverity: severity,
      indicators,
      boutId: result.boutId,
      winnerId: result.winnerRikishiId,
      loserId: result.loserRikishiId,
    },
    { importance: "headline" }
  );

  return builder.build();
}

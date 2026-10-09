/**
 * Retirement evaluation logic (extracted from the legacy lifecycle.ts flat file).
 * Implements retirement based on Age, Injury, and Rank performance.
 */

import { rngFromSeed } from "../rng";
import type { Rikishi } from "../types/rikishi";
import {
  RETIREMENT_MIN_AGE,
  RETIREMENT_MANDATORY_AGE,
  RETIREMENT_YOKOZUNA_MANDATORY_AGE,
  RETIREMENT_NATURAL_AGE_START,
  RETIREMENT_STAGNANT_AGE,
  RETIREMENT_WEAK_AGE,
  RETIREMENT_CRITICAL_WEAK_AGE,
  RETIREMENT_INJURY_WEEKS_THRESHOLD,
  RETIREMENT_COUNCIL_WARNINGS_FORCED,
  RETIREMENT_CONSECUTIVE_MAKE_KOSHI_WEAK,
  RETIREMENT_CONSECUTIVE_KYUJO_TOO_LONG,
  RETIREMENT_PRESSURE_BASE,
  RETIREMENT_PRESSURE_PER_WARNING,
  RETIREMENT_PRESSURE_MAX,
  RETIREMENT_NATURAL_RATE_PER_YEAR,
  RETIREMENT_PROB_STAGNANT,
  RETIREMENT_PROB_WEAK,
  RETIREMENT_PROB_CRITICAL,
  RETIREMENT_STAT_WEAK_POWER,
  RETIREMENT_STAT_CRITICAL_POWER,
  RETIREMENT_STAT_DIMINISHING_POWER,
  RETIREMENT_DEFAULT_POWER,
} from "../../constants/engine/career";

/**
 * Evaluates whether a rikishi should retire based on age, injuries, rank pressure, and performance.
 * Implements mandatory retirement at age 45 and Yokozuna-specific retirement rules.
 *
 * @param {Rikishi} rikishi - The rikishi to evaluate.
 * @param {number} currentYear - The current simulation year.
 * @param {string} seed - Seed for deterministic random generation.
 * @returns {string | null} A string describing the retirement reason, or null if the rikishi continues their career.
 */
export function checkRetirement(
  rikishi: Rikishi,
  currentYear: number,
  seed: string
): string | null {
  const rng = rngFromSeed(seed, "lifecycle", `retirement::${rikishi.id}`);
  const age = currentYear - rikishi.birthYear;

  // Defensive: block impossible young retirements
  if (age < RETIREMENT_MIN_AGE) {
    // Check injury retirement — the only plausible path for young rikishi
    const hasCareerEndingInjury =
      rikishi.injured &&
      rikishi.injuryStatus?.severity === "serious" &&
      (rikishi.injuryWeeksRemaining ?? 0) > RETIREMENT_INJURY_WEEKS_THRESHOLD;

    if (hasCareerEndingInjury) {
      return "Career-Ending Injury";
    }

    // Block all non-injury retirements for rikishi under 28
    return null;
  }

  // 1. Mandatory Retirement
  if (age >= RETIREMENT_MANDATORY_AGE) return "Mandatory Age Retirement";

  // 1.5. Yokozuna Mandatory Retirement (earlier due to intense pressure)
  // Real sumo: Yokozuna often retire earlier due to the pressure of maintaining their status
  if (rikishi.rank === "yokozuna" && age >= RETIREMENT_YOKOZUNA_MANDATORY_AGE)
    return "Yokozuna Mandatory Retirement";

  // 2. Injury Forced Retirement
  // Career-ending: serious injury (from weekly health phase) with >20 weeks remaining
  if (
    rikishi.injured &&
    rikishi.injuryStatus?.severity === "serious" &&
    (rikishi.injuryWeeksRemaining ?? 0) > RETIREMENT_INJURY_WEEKS_THRESHOLD
  ) {
    return "Career-Ending Injury";
  }

  // 3. Yokozuna Retirement Pressure (Council Recommendations)
  if (rikishi.rank === "yokozuna") {
    const warnings = rikishi.councilWarnings || 0;

    // 3.1 Council Warning Trigger (Binary)
    // 3 warnings = mandatory retirement
    if (warnings >= RETIREMENT_COUNCIL_WARNINGS_FORCED)
      return "Council Forced Retirement (Lack of Dignity)";

    // 3.2 Performance/Kyujo Pressure
    // Real sumo: Yokozuna who miss 3 consecutive basho or are consistently weak face pressure
    const isWeak =
      rikishi.consecutiveMakeKoshi &&
      rikishi.consecutiveMakeKoshi >= RETIREMENT_CONSECUTIVE_MAKE_KOSHI_WEAK;
    const isAbsentTooLong =
      (rikishi.consecutiveKyujo || 0) >= RETIREMENT_CONSECUTIVE_KYUJO_TOO_LONG;

    if (isWeak || isAbsentTooLong) {
      // Base chance increases by 30% per warning level
      const pressureChance = RETIREMENT_PRESSURE_BASE + warnings * RETIREMENT_PRESSURE_PER_WARNING;
      if (rng.bool(Math.min(RETIREMENT_PRESSURE_MAX, pressureChance))) {
        return isAbsentTooLong
          ? "Yokozuna Chronic Injury Retirement"
          : "Yokozuna Performance Retirement";
      }
    }
  }

  // 4. Natural Aging Curve (Probability increases with age)
  const baseRetireChance = Math.max(
    0,
    (age - RETIREMENT_NATURAL_AGE_START) * RETIREMENT_NATURAL_RATE_PER_YEAR
  );
  const roll = rng.next();

  if (roll < baseRetireChance) {
    return "Age & Fatigue";
  }

  // 5. Performance Drop (Rank & Stat based)
  const isStagnant = rikishi.rank === "jonokuchi" && age > RETIREMENT_STAGNANT_AGE;
  const isWeak =
    (rikishi.stats?.power ?? RETIREMENT_DEFAULT_POWER) < RETIREMENT_STAT_WEAK_POWER &&
    age > RETIREMENT_WEAK_AGE;
  const isCriticallyWeak =
    (rikishi.stats?.power ?? RETIREMENT_DEFAULT_POWER) < RETIREMENT_STAT_CRITICAL_POWER &&
    age > RETIREMENT_CRITICAL_WEAK_AGE;

  if (isStagnant || isWeak || isCriticallyWeak) {
    let retireProb = RETIREMENT_PROB_STAGNANT;
    if (isWeak) retireProb = RETIREMENT_PROB_WEAK;
    if (isCriticallyWeak) retireProb = RETIREMENT_PROB_CRITICAL;

    if (rng.bool(retireProb)) {
      return (rikishi.stats?.power ?? RETIREMENT_DEFAULT_POWER) < RETIREMENT_STAT_DIMINISHING_POWER
        ? "Diminishing Physicality"
        : "Lack of Performance";
    }
  }

  return null;
}

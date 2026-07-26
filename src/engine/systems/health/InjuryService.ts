/**
 * src/engine/systems/health/InjuryService.ts
 * ==========================================
 * Injury Service
 *
 * Responsibilities:
 * - Calculate weekly injury chances based on fatigue and durability
 * - Roll for injuries with severity, body area, and type
 * - Apply weekly injury ticks to all active rikishi
 * - Handle post-bout injury checks
 * - Manage injury recovery and clearance
 *
 * @see RecoveryService for injury healing logic
 * @see BodyDefinitions for injury type definitions
 */

import { SeededRNG } from "../../rng";
import { WorldState } from "../../types/world";
import { Rikishi } from "../../types/rikishi";
import type { MatchSchedule, BoutResult } from "../../types/basho";
import { SIMULATION_CONFIG } from "../../core/SimulationConfig";
import { clamp, clampInt } from "../../utils/math";
import { InjurySeverity, InjuryBodyArea, InjuryType, getBaseWeeksOut } from "./BodyDefinitions";
import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
  INJURY_FATIGUE_DIVISOR,
  DEFAULT_DURABILITY,
  DURABILITY_MULTIPLIER_BASE,
  DURABILITY_DIVISOR,
  DURABILITY_MULTIPLIER_MIN,
  MAX_WEEKS_OUT,
  MIN_WEEKS_OUT,
  POST_BOUT_INJURY_WEEKS_MAX,
  POST_BOUT_INJURY_WEEKS_MIN,
} from "../../../constants/engine/condition";

/**
 * Calculates a weekly injury chance for a rikishi.
 * Based on fatigue level, durability stat, and simulation configuration.
 *
 * @param {Rikishi} rikishi - The rikishi to calculate injury chance for.
 * @param {number} fatigue - The rikishi's current fatigue level (0-100).
 * @returns {number} The injury chance (0-1).
 *
 * @example
 * ```ts
 * const rikishi = getRikishi(world, rikishiId);
 * const fatigue = rikishi.fatigue || 0;
 * const chance = calculateWeeklyInjuryChance(rikishi, fatigue);
 * console.log(`Injury chance: ${(chance * 100).toFixed(1)}%`);
 * ```
 */
export function calculateWeeklyInjuryChance(rikishi: Rikishi, fatigue: number): number {
  const base = SIMULATION_CONFIG.injuries.weeklyBaseChance;
  const fatigueMult = 1 + clamp(fatigue, 0, 100) / INJURY_FATIGUE_DIVISOR;

  // Durability: using 'durability' property if it exists, default
  const durability =
    typeof rikishi.durability === "number" ? rikishi.durability : DEFAULT_DURABILITY;
  const durabilityMult = clamp(
    DURABILITY_MULTIPLIER_BASE - durability / DURABILITY_DIVISOR,
    DURABILITY_MULTIPLIER_MIN,
    DURABILITY_MULTIPLIER_BASE
  );

  const chance = base * fatigueMult * durabilityMult;
  return clamp(chance, 0, SIMULATION_CONFIG.injuries.maxWeeklyChance);
}

/**
 * Rolls for a weekly injury. Returns injury details if successful.
 * Determines severity, body area, injury type, and recovery time.
 *
 * @param {{ rng: SeededRNG; rikishi: Rikishi; fatigue: number }} args - The injury roll parameters.
 * @param {SeededRNG} args.rng - The RNG instance for deterministic rolls.
 * @param {Rikishi} args.rikishi - The rikishi to roll for.
 * @param {number} args.fatigue - The rikishi's current fatigue level.
 * @returns {{ severity: InjurySeverity; area: InjuryBodyArea; type: InjuryType; weeksOut: number } | null} Injury details if injury occurs, null otherwise.
 *
 * @example
 * ```ts
 * const rng = RNGRegistry.getSystemRNG(world, "health", `tick::${rikishiId}::${week}`);
 * const injury = rollWeeklyInjury({ rng, rikishi, fatigue: 80 });
 * if (injury) {
 *   console.log(`Injury: ${injury.type} on ${injury.area}, ${injury.weeksOut} weeks`);
 * }
 * ```
 */
export function rollWeeklyInjury(args: {
  rng: SeededRNG;
  rikishi: Rikishi;
  fatigue: number;
}): { severity: InjurySeverity; area: InjuryBodyArea; type: InjuryType; weeksOut: number } | null {
  const { rng, rikishi, fatigue } = args;

  const chance = calculateWeeklyInjuryChance(rikishi, fatigue);
  if (rng.next() >= chance) return null;

  const sevRoll = rng.next();
  const severity: InjurySeverity =
    sevRoll < 0.72 ? "minor" : sevRoll < 0.95 ? "moderate" : "serious";

  const area = pickArea(rng);
  const type = pickType(rng, severity);
  const { min, max } = getBaseWeeksOut(severity, area, type);
  const weeksOut = clampInt(
    min + Math.floor(rng.next() * (max - min + 1)),
    MIN_WEEKS_OUT,
    MAX_WEEKS_OUT
  );

  return { severity, area, type, weeksOut };
}

function pickArea(rng: SeededRNG): InjuryBodyArea {
  const areas: InjuryBodyArea[] = [
    "knee",
    "ankle",
    "back",
    "shoulder",
    "elbow",
    "wrist",
    "hip",
    "rib",
    "neck",
    "other",
  ];
  const weights = [0.18, 0.12, 0.12, 0.1, 0.08, 0.08, 0.08, 0.08, 0.06, 0.1];

  let r = rng.next();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return areas[i];
    r -= weights[i];
  }
  return "other";
}

function pickType(rng: SeededRNG, severity: InjurySeverity): InjuryType {
  const roll = rng.next();
  if (severity === "serious") {
    if (roll < 0.35) return "tear";
    if (roll < 0.65) return "fracture";
    return "nerve";
  }
  if (severity === "moderate") {
    if (roll < 0.35) return "sprain";
    if (roll < 0.7) return "strain";
    return "contusion";
  }
  return "inflammation"; // Default minor
}

/**
 * Weekly injury tick: rolls for injuries for all active, non-retired rikishi.
 * Returns StateImpact describing injury updates instead of mutating state directly.
 *
 * Algorithm:
 * 1. Iterate through all active rikishi
 * 2. Skip injured or retired rikishi
 * 3. Roll for injury based on fatigue and durability
 * 4. If injury occurs, update rikishi with injury details
 * 5. Log injury event for narrative
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Impact describing injury updates.
 *
 * @example
 * ```ts
 * const impact = tickWeekInjury(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function tickWeekInjury(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekInjury");

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi || rikishi.injured) continue;

    const seededRng = RNGRegistry.getSystemRNG(
      world,
      "health",
      `tick::${rikishi.id}::${world.week}`
    );

    const fatigue = rikishi.fatigue ?? 0;
    const result = rollWeeklyInjury({ rng: seededRng, rikishi, fatigue });

    if (result) {
      builder.updateRikishi(rikishi.id, {
        injured: true,
        injuryWeeksRemaining: result.weeksOut,
      });

      builder.updateRikishiNestedField(rikishi.id, "currentInjury", {
        id: seededRng.uuid("IJ"),
        severity: result.severity,
        area: result.area,
        type: result.type,
        weeksOut: result.weeksOut,
        weekOccurred: world.week ?? 0,
      });

      builder.logEvent(
        "LIFECYCLE_EVENT",
        "injury",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          shikona: rikishi.shikona || rikishi.name,
          status: "injury",
          reason: result.area,
          score: result.weeksOut,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }
  }

  return builder.build();
}

import { tickRikishiRecovery } from "./RecoveryService";
import { getHeyaStaffBonuses } from "../../staff";
import { getRikishi } from "../../queries";

/**
 * Weekly recovery tick: advanced recovery for all injured rikishi.
 * Staff bonuses (Medical Staff) are applied here.
 * Returns StateImpact describing recovery updates instead of mutating state directly.
 *
 * Algorithm:
 * 1. Iterate through all active rikishi
 * 2. For injured rikishi, calculate recovery with staff bonuses
 * 3. If fully recovered, clear injury status
 * 4. Log recovery event for narrative
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Impact describing recovery updates.
 *
 * @example
 * ```ts
 * const impact = tickWeekRecovery(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function tickWeekRecovery(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekRecovery");

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi || !rikishi.injured) continue;

    const staffBonuses = getHeyaStaffBonuses(world, rikishi.heyaId);
    const recoveryMultiplier = world.transientContext?.activeModifiers?.recoveryMultiplier ?? 1.0;
    const effectiveRecoveryMult = staffBonuses.medical * recoveryMultiplier;
    const recovered = tickRikishiRecovery(rikishi, effectiveRecoveryMult);

    if (recovered) {
      builder.updateRikishi(rikishi.id, {
        injured: false,
        injuryWeeksRemaining: 0,
      });

      builder.updateRikishiNestedField(rikishi.id, "currentInjury", undefined);

      builder.logEvent(
        "LIFECYCLE_EVENT",
        "injury",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          shikona: rikishi.shikona || rikishi.name,
          status: "recovery",
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }
  }

  return builder.build();
}

/**
 * Post-bout injury check: applies bout-induced injuries based on result severity.
 * Returns StateImpact describing injury updates instead of mutating state directly.
 *
 * Algorithm:
 * 1. Only applies to makuuchi/juryo bouts with high-intensity outcomes
 * 2. Determines loser of the bout
 * 3. Checks for violent kimarite (increases injury chance)
 * 4. Rolls for bout-induced injury (2-4% chance)
 * 5. If injury occurs, applies minor injury (1-2 weeks)
 *
 * @param {WorldState} world - The current world state.
 * @param {{ match: MatchSchedule; result: BoutResult | null; east: Rikishi | null; west: Rikishi | null }} ctx - The bout context.
 * @param {MatchSchedule} ctx.match - The bout match data.
 * @param {BoutResult | null} ctx.result - The bout result data.
 * @param {Rikishi | null} ctx.east - The east rikishi data.
 * @param {Rikishi | null} ctx.west - The west rikishi data.
 * @returns {StateImpact} Impact describing injury updates.
 *
 * @example
 * ```ts
 * const impact = onBoutResolvedInjury(world, { match, result, east, west });
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function onBoutResolvedInjury(
  world: WorldState,
  ctx: {
    match: MatchSchedule;
    result: BoutResult | null;
    east: Rikishi | null;
    west: Rikishi | null;
    injuryRiskMultiplier?: number;
    winnerInjuryRiskMultiplier?: number;
  }
): StateImpact {
  const { result, east, west, injuryRiskMultiplier, winnerInjuryRiskMultiplier } = ctx;
  const builder = createImpactBuilder("onBoutResolvedInjury");

  if (!result) return builder.build();

  // Only applies to makuuchi/juryo bouts with high-intensity outcomes
  const loser = result.winner === "east" ? west : east;
  const winner = result.winner === "east" ? east : west;
  if (!loser || loser.injured) return builder.build();

  // Bout-induced injury probability based on kimarite violence
  const violentKimarite = ["uwatenage", "shitatenage", "oshitaoshi", "tsukiotoshi", "hatakikomi"];
  const isViolentFinish = violentKimarite.includes(result.kimarite ?? "");

  const baseBoutInjuryChance = isViolentFinish ? 0.04 : 0.02; // 2-4% per bout
  const boutInjuryChance = baseBoutInjuryChance * (injuryRiskMultiplier ?? 1.0);
  const rngSeed = RNGRegistry.getSystemRNG(world, "health", `bout::${loser.id}::${world.week}`);
  const roll = rngSeed.next();

  if (roll < boutInjuryChance) {
    const injuryWeeksRemaining =
      POST_BOUT_INJURY_WEEKS_MIN +
      Math.floor(rngSeed.next() * (POST_BOUT_INJURY_WEEKS_MAX - POST_BOUT_INJURY_WEEKS_MIN + 1));

    builder.updateRikishi(loser.id, {
      injured: true,
      injuryWeeksRemaining,
    });

    builder.updateRikishiNestedField(loser.id, "currentInjury", {
      id: rngSeed.uuid("IJ"),
      severity: "minor",
      area: "other",
      type: "inflammation",
      weeksOut: injuryWeeksRemaining,
      weekOccurred: world.week ?? 0,
    });

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "injury",
      {
        rikishiId: loser.id,
        shikona: loser.shikona || loser.name,
        status: "injury_bout",
        reason: "Bout impact",
        score: injuryWeeksRemaining,
      },
      { rikishiId: loser.id, heyaId: loser.heyaId }
    );
  }

  // Winner injury roll: if the winner has an elevated injury risk (e.g. competing
  // while injured via kyujo_decision "compete"), roll for them at 50% of the base chance.
  if (winner && !winner.injured && winnerInjuryRiskMultiplier && winnerInjuryRiskMultiplier > 1.0) {
    const winnerBoutInjuryChance = baseBoutInjuryChance * 0.5 * winnerInjuryRiskMultiplier;
    const winnerRng = RNGRegistry.getSystemRNG(
      world,
      "health",
      `bout::${winner.id}::${world.week}`
    );
    const winnerRoll = winnerRng.next();

    if (winnerRoll < winnerBoutInjuryChance) {
      const winnerWeeksRemaining =
        POST_BOUT_INJURY_WEEKS_MIN +
        Math.floor(
          winnerRng.next() * (POST_BOUT_INJURY_WEEKS_MAX - POST_BOUT_INJURY_WEEKS_MIN + 1)
        );

      builder.updateRikishi(winner.id, {
        injured: true,
        injuryWeeksRemaining: winnerWeeksRemaining,
      });

      builder.updateRikishiNestedField(winner.id, "currentInjury", {
        id: winnerRng.uuid("IJ"),
        severity: "minor",
        area: "other",
        type: "inflammation",
        weeksOut: winnerWeeksRemaining,
        weekOccurred: world.week ?? 0,
      });

      builder.logEvent(
        "LIFECYCLE_EVENT",
        "injury",
        {
          rikishiId: winner.id,
          shikona: winner.shikona || winner.name,
          status: "injury_bout",
          reason: "Bout impact (competing while injured)",
          score: winnerWeeksRemaining,
        },
        { rikishiId: winner.id, heyaId: winner.heyaId }
      );
    }
  }

  return builder.build();
}

/**
 * Clears an active injury from a rikishi (UI action: doctor clearance).
 * Returns StateImpact describing injury clearance instead of mutating state directly.
 *
 * @param {string} rikishiId - The ID of the rikishi to clear injury for.
 * @returns {StateImpact} Impact describing injury clearance.
 *
 * @example
 * ```ts
 * const impact = clearInjury(rikishiId);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function clearInjury(rikishiId: string): StateImpact {
  const builder = createImpactBuilder("clearInjury");

  builder.updateRikishi(rikishiId, {
    injured: false,
    injuryWeeksRemaining: 0,
    isKyujo: false,
    kyujoReason: undefined,
    medicalCertificate: undefined,
  });

  builder.updateRikishiNestedField(rikishiId, "currentInjury", undefined);

  return builder.build();
}

/**
 * Converts a rikishi's current injury state to an engine event object for UI display.
 * Used to surface injury information in the event log and UI components.
 *
 * @param {Rikishi} rikishi - The rikishi to convert injury state for.
 * @returns {{ type: string; rikishiId: string; severity: string; weeksOut: number } | null} Injury event object or null if not injured.
 *
 * @example
 * ```ts
 * const event = toInjuryEvent(rikishi);
 * if (event) {
 *   console.log(`Injury: ${event.severity}, ${event.weeksOut} weeks remaining`);
 * }
 * ```
 */
export function toInjuryEvent(
  rikishi: Rikishi
): { type: string; rikishiId: string; severity: string; weeksOut: number } | null {
  if (!rikishi.injured || !rikishi.currentInjury) return null;
  const inj = rikishi.currentInjury;
  return {
    type: "INJURY",
    rikishiId: rikishi.id,
    severity: inj.severity ?? "minor",
    weeksOut: inj.weeksOut ?? 0,
  };
}

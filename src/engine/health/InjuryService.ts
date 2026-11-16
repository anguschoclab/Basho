/**
 * src/engine/health/InjuryService.ts
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

import { SeededRNG } from "@/engine/core/rng";
import { WorldState } from "@/engine/types/world";
import { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BoutResult } from "@/engine/types/basho";
import { SIMULATION_CONFIG } from "@/engine/core/SimulationConfig";
import { clamp, clampInt } from "@/engine/utils/math";
import {
  InjurySeverity,
  InjuryBodyArea,
  InjuryType,
  getBaseWeeksOut,
} from "@/engine/health/BodyDefinitions";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
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
} from "@/constants/engine/condition";
import {
  INJURY_SEVERITY_MINOR_THRESHOLD,
  INJURY_SEVERITY_MODERATE_THRESHOLD,
  INJURY_AREA_WEIGHTS,
  INJURY_SERIOUS_TEAR_THRESHOLD,
  INJURY_SERIOUS_FRACTURE_THRESHOLD,
  INJURY_MODERATE_SPRAIN_THRESHOLD,
  INJURY_MODERATE_STRAIN_THRESHOLD,
  BOUT_INJURY_VIOLENT_CHANCE,
  BOUT_INJURY_NORMAL_CHANCE,
  WINNER_INJURY_CHANCE_MULTIPLIER,
  AGGRAVATION_CHANCE_BY_SEVERITY,
  AGGRAVATION_EXTRA_WEEKS_MAX,
} from "@/constants/engine/health";

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
    sevRoll < INJURY_SEVERITY_MINOR_THRESHOLD
      ? "minor"
      : sevRoll < INJURY_SEVERITY_MODERATE_THRESHOLD
        ? "moderate"
        : "serious";

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
  const weights = INJURY_AREA_WEIGHTS;

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
    if (roll < INJURY_SERIOUS_TEAR_THRESHOLD) return "tear";
    if (roll < INJURY_SERIOUS_FRACTURE_THRESHOLD) return "fracture";
    return "nerve";
  }
  if (severity === "moderate") {
    if (roll < INJURY_MODERATE_SPRAIN_THRESHOLD) return "sprain";
    if (roll < INJURY_MODERATE_STRAIN_THRESHOLD) return "strain";
    return "contusion";
  }
  return "inflammation"; // Default minor
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

  const loser = result.winner === "east" ? west : east;
  const winner = result.winner === "east" ? east : west;

  // 1. Physics-produced in-bout injury (edge-crisis damage) — previously
  //    produced but never consumed; it now actually injures the rikishi.
  applyInBoutInjury(world, builder, result, east ?? null, west ?? null);
  const inBoutVictimId = result.inBoutInjury?.rikishiId;

  // Bout-induced injury probability based on kimarite violence
  const violentKimarite = ["uwatenage", "shitatenage", "oshitaoshi", "tsukiotoshi", "hatakikomi"];
  const isViolentFinish = violentKimarite.includes(result.kimarite ?? "");
  const baseBoutInjuryChance = isViolentFinish
    ? BOUT_INJURY_VIOLENT_CHANCE
    : BOUT_INJURY_NORMAL_CHANCE; // 2-4% per bout

  // 2. Loser post-bout roll — a rikishi who ENTERED the bout injured takes
  //    an aggravation roll instead of being skipped; the old `loser.injured`
  //    early-return made "fighting hurt" risk-free and starved the winner's
  //    roll below.
  if (loser && loser.id !== inBoutVictimId) {
    if (loser.injured) {
      applyAggravationRoll(world, builder, loser, injuryRiskMultiplier ?? 1.0);
    } else {
      applyFreshBoutInjury(
        world,
        builder,
        loser,
        baseBoutInjuryChance * (injuryRiskMultiplier ?? 1.0),
        "Bout impact"
      );
    }
  }

  // 3. Winner roll — only under elevated risk (e.g. kyujo_decision
  //    "compete"). An injured winner aggravates at the reduced rate; a
  //    healthy winner takes the standard reduced fresh-injury roll.
  if (
    winner &&
    winner.id !== inBoutVictimId &&
    winnerInjuryRiskMultiplier &&
    winnerInjuryRiskMultiplier > 1.0
  ) {
    if (winner.injured) {
      applyAggravationRoll(
        world,
        builder,
        winner,
        winnerInjuryRiskMultiplier * WINNER_INJURY_CHANCE_MULTIPLIER
      );
    } else {
      applyFreshBoutInjury(
        world,
        builder,
        winner,
        baseBoutInjuryChance * WINNER_INJURY_CHANCE_MULTIPLIER * winnerInjuryRiskMultiplier,
        "Bout impact (competing while injured)"
      );
    }
  }

  return builder.build();
}

/** Fresh minor bout injury — shared by the loser and elevated-winner paths. */
function applyFreshBoutInjury(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>,
  r: Rikishi,
  chance: number,
  reason: string
): void {
  const rngSeed = RNGRegistry.getSystemRNG(
    world,
    "health",
    `bout::${r.id}::${world.dayIndexGlobal}`
  );
  if (rngSeed.next() >= chance) return;

  const injuryWeeksRemaining =
    POST_BOUT_INJURY_WEEKS_MIN +
    Math.floor(rngSeed.next() * (POST_BOUT_INJURY_WEEKS_MAX - POST_BOUT_INJURY_WEEKS_MIN + 1));

  builder.updateRikishi(r.id, {
    injured: true,
    injuryWeeksRemaining,
  });
  builder.updateRikishiNestedField(r.id, "injuryStatus", {
    type: "inflammation",
    isInjured: true,
    severity: "minor",
    location: "other",
    weeksRemaining: injuryWeeksRemaining,
    weeksToHeal: injuryWeeksRemaining,
  });
  builder.updateRikishiNestedField(r.id, "currentInjury", {
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
      rikishiId: r.id,
      shikona: r.shikona || r.name,
      status: "injury_bout",
      reason,
      score: injuryWeeksRemaining,
    },
    { rikishiId: r.id, heyaId: r.heyaId }
  );
}

const SEVERITY_RANK: Record<string, number> = { none: 0, minor: 1, moderate: 2, serious: 3 };

/**
 * Aggravation roll for a rikishi who competed while already injured.
 * Chance scales with the existing severity and any override multiplier
 * (kyujo_decision "compete" writes one). On a hit, recovery lengthens by
 * 1–2 weeks; the injury keeps its type/area.
 */
function applyAggravationRoll(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>,
  r: Rikishi,
  multiplier: number
): void {
  const severity = r.injuryStatus?.severity ?? "moderate";
  const chance = (AGGRAVATION_CHANCE_BY_SEVERITY[severity] ?? 0.12) * multiplier;
  if (chance <= 0) return;

  const rng = RNGRegistry.getSystemRNG(
    world,
    "health",
    `aggrav::${r.id}::${world.dayIndexGlobal}`
  );
  if (rng.next() >= chance) return;

  const extraWeeks = 1 + Math.floor(rng.next() * AGGRAVATION_EXTRA_WEEKS_MAX);
  const newWeeks = (r.injuryWeeksRemaining ?? 0) + extraWeeks;

  builder.updateRikishi(r.id, { injuryWeeksRemaining: newWeeks });
  builder.updateRikishiNestedField(r.id, "injuryStatus", {
    ...(r.injuryStatus ?? { type: "sprain" as const, severity: "moderate" as const }),
    isInjured: true,
    weeksRemaining: newWeeks,
    weeksToHeal: Math.max(r.injuryStatus?.weeksToHeal ?? 0, newWeeks),
  });
  if (r.currentInjury) {
    builder.updateRikishiNestedField(r.id, "currentInjury", {
      ...r.currentInjury,
      weeksOut: newWeeks,
    });
  }
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "injury",
    {
      rikishiId: r.id,
      shikona: r.shikona || r.name,
      status: "injury_aggravated",
      reason: "Competed while injured",
      score: newWeeks,
    },
    { rikishiId: r.id, heyaId: r.heyaId }
  );
}

/**
 * Consume `result.inBoutInjury` — the physics-produced edge-crisis injury.
 * A healthy rikishi takes the named severity/area with recovery weeks from
 * getBaseWeeksOut; an already-injured rikishi aggravates (longer recovery,
 * severity escalates to the worse of the two).
 */
function applyInBoutInjury(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>,
  result: BoutResult,
  east: Rikishi | null,
  west: Rikishi | null
): void {
  const inj = result.inBoutInjury;
  if (!inj) return;
  const victim = inj.rikishiId === east?.id ? east : inj.rikishiId === west?.id ? west : null;
  if (!victim) return;

  const rng = RNGRegistry.getSystemRNG(
    world,
    "health",
    `inbout::${victim.id}::${result.boutId}`
  );

  let appliedWeeks = 0;
  if (victim.injured) {
    const newWeeks =
      (victim.injuryWeeksRemaining ?? 0) + 1 + Math.floor(rng.next() * AGGRAVATION_EXTRA_WEEKS_MAX);
    appliedWeeks = newWeeks;
    const prevSeverity = victim.injuryStatus?.severity ?? "moderate";
    const severity =
      (SEVERITY_RANK[inj.severity] ?? 0) > (SEVERITY_RANK[prevSeverity] ?? 0)
        ? inj.severity
        : prevSeverity;
    builder.updateRikishi(victim.id, { injured: true, injuryWeeksRemaining: newWeeks });
    builder.updateRikishiNestedField(victim.id, "injuryStatus", {
      ...(victim.injuryStatus ?? { type: "sprain" as const, severity: "moderate" as const }),
      isInjured: true,
      severity,
      weeksRemaining: newWeeks,
      weeksToHeal: Math.max(victim.injuryStatus?.weeksToHeal ?? 0, newWeeks),
    });
    if (victim.currentInjury) {
      builder.updateRikishiNestedField(victim.id, "currentInjury", {
        ...victim.currentInjury,
        severity,
        weeksOut: newWeeks,
      });
    }
  } else {
    const range = getBaseWeeksOut(inj.severity, inj.area, "strain");
    const span = Math.max(1, range.max - range.min + 1);
    const weeks = range.min + Math.floor(rng.next() * span);
    appliedWeeks = weeks;
    builder.updateRikishi(victim.id, { injured: true, injuryWeeksRemaining: weeks });
    builder.updateRikishiNestedField(victim.id, "injuryStatus", {
      type: "strain",
      isInjured: true,
      severity: inj.severity,
      location: inj.area,
      weeksRemaining: weeks,
      weeksToHeal: weeks,
    });
    builder.updateRikishiNestedField(victim.id, "currentInjury", {
      id: rng.uuid("IJ"),
      severity: inj.severity,
      area: inj.area,
      type: "strain",
      weeksOut: weeks,
      weekOccurred: world.week ?? 0,
    });
  }

  builder.logEvent(
    "LIFECYCLE_EVENT",
    "injury",
    {
      rikishiId: victim.id,
      shikona: victim.shikona || victim.name,
      status: "injury_bout",
      reason: inj.triggerEvent,
      score: appliedWeeks,
    },
    { rikishiId: victim.id, heyaId: victim.heyaId }
  );
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
    // Match the canonical recovery path's cleared shape
    // (RecoveryService.tickRikishiRecovery): a doctor-clearance leaves the
    // same post-recovery state — without this the cleared wrestler still
    // read as injured (type "tear", isInjured true) to injuryStatus readers.
    injuryStatus: { type: "none", severity: "none", weeksRemaining: 0 },
    injury: undefined,
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

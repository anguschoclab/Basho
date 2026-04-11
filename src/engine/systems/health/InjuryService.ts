/**
 * InjuryService.ts — Logic for rolling and applying injuries.
 */

import { SeededRNG } from "../../rng";
import { WorldState } from "../../types/world";
import { Rikishi } from "../../types/rikishi";
import { SIMULATION_CONFIG } from "../../core/SimulationConfig";
import { clamp, clampInt } from "../../utils/math";
import { seededPick } from "../../utils/random";
import { EventBus } from "../../events";
import {
  InjurySeverity,
  InjuryBodyArea,
  InjuryType,
  getBaseWeeksOut,
  BODY_AREA_LABELS,
  INJURY_TYPE_LABELS
} from "./BodyDefinitions";
import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

/**
 * Calculates a weekly injury chance for a rikishi.
 */
export function calculateWeeklyInjuryChance(rikishi: Rikishi, fatigue: number): number {
  const base = SIMULATION_CONFIG.injuries.weeklyBaseChance;
  const fatigueMult = 1 + clamp(fatigue, 0, 100) / 200;
  
  // Durability: using 'durability' property if it exists, default 60
  const durability = typeof rikishi.durability === "number" ? rikishi.durability : 60;
  const durabilityMult = clamp(1.35 - durability / 100, 0.6, 1.35);

  const chance = base * fatigueMult * durabilityMult;
  return clamp(chance, 0, SIMULATION_CONFIG.injuries.maxWeeklyChance);
}

/**
 * Rolls for a weekly injury. Returns injury details if successful.
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
  const severity: InjurySeverity = sevRoll < 0.72 ? "minor" : sevRoll < 0.95 ? "moderate" : "serious";
  
  const area = pickArea(rng);
  const type = pickType(rng, severity);
  const { min, max } = getBaseWeeksOut(severity, area, type);
  const weeksOut = clampInt(min + Math.floor(rng.next() * (max - min + 1)), 1, 26);

  return { severity, area, type, weeksOut };
}

function pickArea(rng: SeededRNG): InjuryBodyArea {
  const areas: InjuryBodyArea[] = ["knee", "ankle", "back", "shoulder", "elbow", "wrist", "hip", "rib", "neck", "other"];
  const weights = [0.18, 0.12, 0.12, 0.10, 0.08, 0.08, 0.08, 0.08, 0.06, 0.10];
  
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
    if (roll < 0.70) return "strain";
    return "contusion";
  }
  return "inflammation"; // Default minor
}

/**
 * Weekly injury tick: rolls for injuries for all active, non-retired rikishi.
 * Returns StateImpact describing injury updates instead of mutating state directly.
 */
export function tickWeekInjury(world: WorldState): StateImpact {
  const builder = createImpactBuilder('tickWeekInjury');

  for (const rikishi of world.rikishi.values()) {
    if (rikishi.isRetired || rikishi.injured) continue;

    const seededRng = RNGRegistry.getSystemRNG(world, "health", `tick::${rikishi.id}::${world.week}`);

    const fatigue = (rikishi as any).fatigue ?? 0;
    const result = rollWeeklyInjury({ rng: seededRng, rikishi, fatigue });

    if (result) {
      builder.updateRikishi(rikishi.id, {
        injured: true,
        injuryWeeksRemaining: result.weeksOut
      });

      builder.updateRikishiNestedField(rikishi.id, 'currentInjury', {
        id: seededRng.uuid('IJ'),
        severity: result.severity,
        area: result.area,
        type: result.type,
        weeksOut: result.weeksOut,
        weekOccurred: world.week ?? 0,
      });

      builder.logEvent(
        'LIFECYCLE_EVENT',
        'injury',
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          shikona: rikishi.shikona || rikishi.name,
          status: "injury",
          reason: result.area,
          score: result.weeksOut
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }
  }

  return builder.build();
}

import { tickRikishiRecovery } from "./RecoveryService";
import { getHeyaStaffBonuses } from "../../staff";

/**
 * Weekly recovery tick: advanced recovery for all injured rikishi.
 * Staff bonuses (Medical Staff) are applied here.
 * Returns StateImpact describing recovery updates instead of mutating state directly.
 */
export function tickWeekRecovery(world: WorldState): StateImpact {
  const builder = createImpactBuilder('tickWeekRecovery');

  for (const rikishi of world.rikishi.values()) {
    if (rikishi.isRetired || !rikishi.injured) continue;

    const staffBonuses = getHeyaStaffBonuses(world, rikishi.heyaId);
    const recovered = tickRikishiRecovery(rikishi, staffBonuses.medical);

    if (recovered) {
      builder.updateRikishi(rikishi.id, {
        injured: false,
        injuryWeeksRemaining: 0
      });

      builder.updateRikishiNestedField(rikishi.id, 'currentInjury', undefined);

      builder.logEvent(
        'LIFECYCLE_EVENT',
        'injury',
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          shikona: rikishi.shikona || rikishi.name,
          status: "recovery"
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
 */
export function onBoutResolvedInjury(
  world: WorldState,
  ctx: { match: any; result: any; east: any; west: any }
): StateImpact {
  const { result, east, west } = ctx;
  const builder = createImpactBuilder('onBoutResolvedInjury');

  if (!result) return builder.build();

  // Only applies to makuuchi/juryo bouts with high-intensity outcomes
  const loser = result.winner === "east" ? west : east;
  if (!loser || loser.injured) return builder.build();

  // Bout-induced injury probability based on kimarite violence
  const violentKimarite = ["uwatenage", "shitatenage", "oshitaoshi", "tsukiotoshi", "hatakikomi"];
  const isViolentFinish = violentKimarite.includes(result.kimarite ?? "");

  const boutInjuryChance = isViolentFinish ? 0.04 : 0.02; // 2-4% per bout
  const rngSeed = RNGRegistry.getSystemRNG(world, "health", `bout::${loser.id}::${world.week}`);
  const roll = rngSeed.next();

  if (roll < boutInjuryChance) {
    const injuryWeeksRemaining = 1 + Math.floor(rngSeed.next() * 2); // 1-2 weeks

    builder.updateRikishi(loser.id, {
      injured: true,
      injuryWeeksRemaining
    });

    builder.updateRikishiNestedField(loser.id, 'currentInjury', {
      id: rngSeed.uuid('IJ'),
      severity: "minor",
      area: "other",
      type: "inflammation",
      weeksOut: injuryWeeksRemaining,
      weekOccurred: world.week ?? 0,
    });

    builder.logEvent(
      'LIFECYCLE_EVENT',
      'injury',
      {
        status: "injury_bout",
        reason: "Bout impact",
        score: injuryWeeksRemaining
      },
      { rikishiId: loser.id, heyaId: loser.heyaId }
    );
  }

  return builder.build();
}

/**
 * Clears an active injury from a rikishi (UI action: doctor clearance).
 * Returns StateImpact describing injury clearance instead of mutating state directly.
 */
export function clearInjury(rikishiId: string): StateImpact {
  const builder = createImpactBuilder('clearInjury');

  builder.updateRikishi(rikishiId, {
    injured: false,
    injuryWeeksRemaining: 0
  });

  builder.updateRikishiNestedField(rikishiId, 'currentInjury', undefined);

  return builder.build();
}

/**
 * Converts a rikishi's current injury state to an engine event object for UI display.
 */
export function toInjuryEvent(rikishi: any): { type: string; rikishiId: string; severity: string; weeksOut: number } | null {
  if (!rikishi.injured || !(rikishi as any).currentInjury) return null;
  const inj = (rikishi as any).currentInjury;
  return {
    type: "INJURY",
    rikishiId: rikishi.id,
    severity: inj.severity ?? "minor",
    weeksOut: inj.weeksOut ?? 0,
  };
}

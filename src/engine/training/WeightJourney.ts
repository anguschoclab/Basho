/**
 * Weight Journey System (B3)
 *
 * Rikishi with potential weight significantly above current weight enter a
 * "bulking" phase. Training + adequate nutrition drives weight gain over
 * months. Progress stalls when heya funds are low or rikishi is injured.
 * Breakthrough at targetKg grants +3 power, +2 balance and a milestone event.
 */

import type { Rikishi } from "../types/rikishi";
import type { Heya } from "../types/heya";
import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum gap (kg) between current and target weight to enter bulking */
export const WEIGHT_JOURNEY_MIN_GAP = 15;

/** Weekly progress (kg) when nutrition is adequate */
export const WEIGHT_JOURNEY_WEEKLY_GAIN = 0.8;

/** Heya funds below this threshold stalls progress */
export const WEIGHT_JOURNEY_STALL_THRESHOLD = 5000;

/** Power bonus on breakthrough */
export const WEIGHT_JOURNEY_POWER_BOOST = 3;

/** Balance bonus on breakthrough */
export const WEIGHT_JOURNEY_BALANCE_BOOST = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determines whether a rikishi should enter a weight journey.
 * Returns true when the gap between potential and current weight exceeds the
 * minimum threshold.
 */
export function shouldEnterWeightJourney(rikishi: Rikishi): boolean {
  if (!rikishi.potential?.weightKg) return false;
  const currentWeight = rikishi.stats?.weight ?? 0;
  const gap = rikishi.potential.weightKg - currentWeight;
  return gap >= WEIGHT_JOURNEY_MIN_GAP;
}

// ── Core Tick ────────────────────────────────────────────────────────────────

/**
 * Apply a weekly weight-journey tick for a single rikishi.
 *
 * - If the rikishi is eligible but has no journey started, one is created.
 * - If heya funds are below the stall threshold or the rikishi is injured,
 *   progress stalls (no increase, `stalled` flag set).
 * - Otherwise `progressKg` increases by the weekly gain.
 * - When `progressKg >= targetKg`, a breakthrough fires: +3 power, +2 balance,
 *   and a `weight_milestone` event is logged. The journey is marked complete.
 *
 * @returns A StateImpact describing the updates (may be empty).
 */
export function applyWeightJourneyTick(
  rikishi: Rikishi,
  heya: Heya | undefined,
  _world: WorldState
): StateImpact {
  const builder = createImpactBuilder("applyWeightJourneyTick");

  // Auto-enter if eligible but no journey started
  if (!rikishi.weightJourney && shouldEnterWeightJourney(rikishi)) {
    const targetKg = rikishi.potential!.weightKg;
    builder.updateRikishi(rikishi.id, {
      weightJourney: {
        targetKg,
        progressKg: 0,
        stalled: false,
        phases: ["bulking"],
      },
    });
    // Fall through to process the first tick with the new journey
  }

  const journey = rikishi.weightJourney;
  if (!journey) return builder.build();

  const updates: Partial<Rikishi> = {
    weightJourney: { ...journey },
  };

  // Stall conditions
  const funds = heya?.funds ?? 0;
  const isStalled = rikishi.injured || funds < WEIGHT_JOURNEY_STALL_THRESHOLD;

  if (isStalled) {
    updates.weightJourney!.stalled = true;
    builder.updateRikishi(rikishi.id, updates);
    return builder.build();
  }

  // Normal progress
  updates.weightJourney!.stalled = false;
  updates.weightJourney!.progressKg = journey.progressKg + WEIGHT_JOURNEY_WEEKLY_GAIN;

  // Breakthrough check
  if (updates.weightJourney!.progressKg >= journey.targetKg) {
    updates.weightJourney!.phases = [...journey.phases, "complete"];
    updates.stats = {
      ...(rikishi.stats || {}),
      power: (rikishi.stats?.power ?? 50) + WEIGHT_JOURNEY_POWER_BOOST,
      balance: (rikishi.stats?.balance ?? 50) + WEIGHT_JOURNEY_BALANCE_BOOST,
    };
    builder.logEvent(
      "NARRATIVE_CRISIS_TRIGGERED",
      "narrative",
      {
        rikishiId: rikishi.id,
        heyaId: rikishi.heyaId,
        shikona: rikishi.shikona || rikishi.name,
        eventId: "weight_milestone",
        title: "Weight Milestone Reached",
        description: `${rikishi.shikona} reaches ${journey.targetKg}kg — the bulk journey pays off.`,
      },
      { importance: "notable", rikishiId: rikishi.id }
    );
  }

  builder.updateRikishi(rikishi.id, updates);
  return builder.build();
}

/**
 * Weight Journey System (B3)
 *
 * Rikishi with potential weight significantly above current weight enter a
 * "bulking" phase. Training + adequate nutrition drives weight gain over
 * months. Progress stalls when heya funds are low or rikishi is injured.
 * Breakthrough at targetKg grants +3 power, +2 balance and a milestone event.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { NUTRITION_MULTIPLIERS } from "@/constants/engine/multipliers";
import { DEFAULT_FACILITY_LEVEL } from "@/constants/engine/rikishi";
import { clamp, finiteOr } from "@/engine/utils/math";
import { maturityFactor, ATTRIBUTE_PEAK } from "@/constants/engine/development";
import { reachableFraction } from "@/engine/training/TrainingMath";

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum gap (kg) between current and target weight to enter bulking */
export const WEIGHT_JOURNEY_MIN_GAP = 15;

/** Weekly progress (kg) when nutrition is adequate */
export const WEIGHT_JOURNEY_WEEKLY_GAIN = 0.8;

/** Heya funds below this threshold stalls progress */
export const WEIGHT_JOURNEY_STALL_THRESHOLD = 5000;

/** Max weekly height growth (cm) before developmentSpeed — caps catch-up
 *  growth spurts at ~10cm/yr (Hakuho-class maturation pace). */
export const HEIGHT_WEEKLY_MAX_GAIN = 0.2;

/** Natural adolescent fill-out (kg/wk) before developmentSpeed/nutrition —
 *  ~8kg/yr, separate from the deliberate bulking journey. */
export const NATURAL_WEIGHT_WEEKLY_GAIN = 0.15;

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
    const targetKg = rikishi.potential?.weightKg ?? 0;
    builder.updateRikishi(rikishi.id, {
      weightJourney: {
        targetKg,
        progressKg: 0,
        stalled: false,
        phases: ["bulking"],
        startWeight: rikishi.stats?.weight ?? 0,
      },
    });
    // The first tick applies on the NEXT weekly phase — rikishi.weightJourney
    // here still reads the input entity (the write above lives in the
    // not-yet-applied impact), so falling through is impossible.
    return builder.build();
  }

  const journey = rikishi.weightJourney;
  if (!journey) return builder.build();

  // The breakthrough is one-shot: once complete, progressKg stays above the
  // target forever — without this guard the +power/+balance boost and the
  // milestone event would re-fire on every weekly tick for the rest of the
  // rikishi's career.
  if (journey.phases.includes("complete")) return builder.build();

  const journeyUpdate = { ...journey };
  const updates: Partial<Rikishi> = {
    weightJourney: journeyUpdate,
  };

  // Stall conditions
  const funds = heya?.funds ?? 0;
  const isStalled = rikishi.injured || funds < WEIGHT_JOURNEY_STALL_THRESHOLD;

  if (isStalled) {
    journeyUpdate.stalled = true;
    builder.updateRikishi(rikishi.id, updates);
    return builder.build();
  }

  // Normal progress — scaled by nutrition facility level (chankonabe quality)
  const nutritionFacility = heya?.facilities?.nutrition ?? DEFAULT_FACILITY_LEVEL;
  const nutritionMult =
    NUTRITION_MULTIPLIERS.BASE +
    (clamp(nutritionFacility, 0, 100) / 100) * NUTRITION_MULTIPLIERS.RANGE;

  journeyUpdate.stalled = false;
  // developmentSpeed scales bulking too — a prodigy packs on mass faster
  // (Hakuho trajectory), a journeyman's frame fills slowly.
  const weeklyGain =
    WEIGHT_JOURNEY_WEEKLY_GAIN * nutritionMult * (rikishi.potential?.developmentSpeed ?? 1.0);
  journeyUpdate.progressKg = journey.progressKg + weeklyGain;

  // targetKg is the absolute potential weight — the breakthrough gap is
  // targetKg - startWeight, not progressKg vs targetKg (which demanded a
  // ~160kg "gain"). Legacy journeys lack startWeight; stats.weight was never
  // updated under the bug so it still reads the entry weight.
  const startWeight = journey.startWeight ?? rikishi.stats?.weight ?? 0;
  // Write the bulk into stats.weight every tick — progressKg alone left the
  // rikishi gaining on paper while staying at entry weight forever.
  updates.stats = {
    ...(rikishi.stats || {}),
    weight: Math.min(journey.targetKg, finiteOr(rikishi.stats?.weight, startWeight) + weeklyGain),
  } as Rikishi["stats"];

  // Breakthrough check
  if (journeyUpdate.progressKg >= journey.targetKg - startWeight) {
    journeyUpdate.phases = [...journey.phases, "complete"];
    updates.stats = {
      ...updates.stats,
      power: finiteOr(rikishi.stats?.power, 50) + WEIGHT_JOURNEY_POWER_BOOST,
      balance: finiteOr(rikishi.stats?.balance, 50) + WEIGHT_JOURNEY_BALANCE_BOOST,
    } as Rikishi["stats"];
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

// ── Physical Maturation ─────────────────────────────────────────────────────
//
// Rikishi debut at 15-16 still growing — real-world trajectories (Hakuho
// ~181cm/80kg at 16 → 192cm/155kg; Terunofuji growing into his 20s; Kyokutenho
// filling out late) show height and weight mature on the same profile curves
// as the stat sheet. Generation seeds debut size via the size_* maturity
// curves; this tick keeps applying them afterward so a teen actually grows
// into his potential frame — paced by developmentSpeed and peakAgeOffset.
// Without it stats.height froze at ~88% of potential forever.

/**
 * Weekly physical maturation for a rikishi still inside his growth window.
 *
 * - Height: grows toward potential.heightCm × size_height maturityFactor —
 *   a monotonic age curve (peak ~19 ± peakAgeOffset). Capped weekly gain so
 *   a behind-curve teen catches up gradually, never shrinks, never exceeds
 *   potential.
 * - Weight (natural fill-out): adolescents gain ~8kg/yr toward the
 *   age-indexed natural target independent of any formal bulking journey;
 *   a rikishi already ahead of the curve (early bulker) keeps his mass.
 * - Both scale with developmentSpeed: prodigies mature fast, late bloomers
 *   keep maturing into their early 20s.
 */
export function applyPhysicalMaturationTick(
  rikishi: Rikishi,
  heya: Heya | undefined,
  world: WorldState
): StateImpact {
  const builder = createImpactBuilder("applyPhysicalMaturationTick");
  const potential = rikishi.potential;
  const age = rikishi.birthYear ? world.year - rikishi.birthYear : undefined;
  if (!potential || !age) return builder.build();

  const devSpeed = potential.developmentSpeed ?? 1.0;
  const peakOffset = potential.peakAgeOffset ?? 0;
  const updates: Partial<Rikishi> = {};
  const stats = { ...(rikishi.stats || {}) } as Rikishi["stats"];
  const nutritionFacility = heya?.facilities?.nutrition ?? DEFAULT_FACILITY_LEVEL;
  const nutritionMult =
    NUTRITION_MULTIPLIERS.BASE +
    (clamp(nutritionFacility, 0, 100) / 100) * NUTRITION_MULTIPLIERS.RANGE;

  // Injury stalls adolescent growth — the body is recovering, not building.
  if (rikishi.injured) return builder.build();

  // ── Height ────────────────────────────────────────────────────────────
  // Growth only inside the rise window — the size curves flatline at 1.0
  // past peak (they never decline), so an ungated adult would keep filling
  // toward potential forever. A 22-year-old standard does not grow 15cm.
  const heightPeakAge = ATTRIBUTE_PEAK.size_height.peakAge + peakOffset;
  if (potential.heightCm && stats?.height != null && age <= heightPeakAge) {
    const heightM = maturityFactor({
      age,
      group: "size_height",
      developmentSpeed: devSpeed,
      peakAgeOffset: peakOffset,
    });
    const target = potential.heightCm * heightM;
    const current = stats.height;
    if (target > current) {
      const gain = Math.min(target - current, HEIGHT_WEEKLY_MAX_GAIN * devSpeed);
      stats.height = Math.min(potential.heightCm, current + gain);
      updates.stats = stats;
    }
  }

  // ── Natural weight fill-out ───────────────────────────────────────────
  // The age-indexed target is a floor, not a cap: a rikishi who already
  // bulked past his curve via the formal journey is untouched.
  const weightPeakAge = ATTRIBUTE_PEAK.size_weight.peakAge + peakOffset;
  if (potential.weightKg && stats?.weight != null && age <= weightPeakAge) {
    const weightM = maturityFactor({
      age,
      group: "size_weight",
      developmentSpeed: devSpeed,
      peakAgeOffset: peakOffset,
    });
    // Reachable ceiling truncates the natural target the same way it
    // truncates stats — a busted/derailed body stops responding too.
    const naturalTarget = potential.weightKg * weightM * reachableFraction(potential);
    const current = stats.weight;
    if (naturalTarget > current) {
      const gain = Math.min(
        naturalTarget - current,
        NATURAL_WEIGHT_WEEKLY_GAIN * devSpeed * nutritionMult
      );
      stats.weight = Math.min(naturalTarget, current + gain);
      updates.stats = stats;
    }
  }

  if (updates.stats) builder.updateRikishi(rikishi.id, updates);
  return builder.build();
}

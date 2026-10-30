/**
 * src/engine/welfare/WelfareCalculations.ts
 * =================================================
 * Pure simulation math for Welfare & Compliance.
 *
 * Contains deterministic algorithms for:
 * 1. Injury Pressure & Negligence Detection
 * 2. Weekly Welfare Delta (Impact of Diet, Intensity, Recovery)
 * 3. Facility & Governance Synergies
 *
 * Goal: Decouple business rules from state management.
 */

import { clamp } from "@/engine/utils/math";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { WelfareState } from "@/engine/types/economy";
import { EntityCollection } from "@/engine/core/EntityCollection";
import { getHeyaStaffBonuses } from "@/engine/economy/staff";
import {
  INJURY_PRESSURE_SERIOUS,
  INJURY_PRESSURE_MODERATE,
  INJURY_PRESSURE_MINOR,
  WELFARE_PRESSURE_DIVISOR,
  WELFARE_DELTA_MAX,
  WELFARE_SERIOUS_INJURY_BONUS,
  WELFARE_AUSTERITY_DIET_BONUS,
  WELFARE_PREMIUM_DIET_REDUCTION,
  WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER,
  WELFARE_PUNISHING_INTENSITY_BONUS,
  WELFARE_INTENSIVE_INTENSITY_BONUS,
  WELFARE_LOW_RECOVERY_BONUS,
  WELFARE_HIGH_RECOVERY_REDUCTION,
  FACILITY_RECOVERY_QUALITY_BASE,
  FACILITY_RECOVERY_DIVISOR,
  FACILITY_NUTRITION_QUALITY_BASE,
  FACILITY_NUTRITION_DIVISOR,
  SCANDAL_WELFARE_THRESHOLD,
  WELFARE_SCANDAL_SYNERGY_BONUS,
  WELFARE_HEALTHY_DRIFT_REDUCTION,
} from "@/constants/engine/welfare";

/**
 * Weights injury severity for welfare pressure.
 */
export function getSeverityWeight(sev: string | number | undefined): number {
  if (sev === "serious" || sev === "high" || sev === 3) return INJURY_PRESSURE_SERIOUS;
  if (sev === "moderate" || sev === "medium" || sev === 2) return INJURY_PRESSURE_MODERATE;
  return INJURY_PRESSURE_MINOR;
}

/**
 * Compute the total injury pressure and detect negligence.
 */
export function computeInjuryPressure(
  world: WorldState,
  heya: Heya
): { pressure: number; seriousCount: number; negligenceCount: number } {
  let pressure = 0;
  let seriousCount = 0;
  let negligenceCount = 0;

  const trainingState = world.trainingState?.get(heya.id);
  const intensity = trainingState?.activeProfile.intensity || "balanced";
  const isHarsh = intensity === "punishing" || intensity === "intensive";

  const focusMap = new Map();
  trainingState?.focusSlots.forEach((f) => focusMap.set(f.rikishiId, f));

  const roster = EntityCollection.getHeyaRoster(world, heya.id);

  roster.forEach((rikishi) => {
    const status = rikishi.injuryStatus;
    const isInjured = rikishi.injured || (status && status.isInjured);

    if (isInjured) {
      const sev = status?.severity || undefined;
      const w = getSeverityWeight(sev);
      pressure += w;
      if (sev === "serious") seriousCount++;

      // Negligence Check (§A7)
      const focus = focusMap.get(rikishi.id);
      const isProtected = focus?.focusType === "protect" || focus?.focusType === "rebuild";
      if (isHarsh && !isProtected) negligenceCount++;
    }
  });

  return { pressure, seriousCount, negligenceCount };
}

/**
 * Calculate the numerical shift in welfare risk for the week.
 */
export function calculateWeeklyWelfareDelta(
  world: WorldState,
  heya: Heya,
  state: WelfareState
): { delta: number; reasons: string[] } {
  const reasons: string[] = [];
  const { pressure, seriousCount, negligenceCount } = computeInjuryPressure(world, heya);

  let delta = clamp(Math.round(pressure / WELFARE_PRESSURE_DIVISOR), 0, WELFARE_DELTA_MAX);
  if (seriousCount > 0) {
    delta += WELFARE_SERIOUS_INJURY_BONUS;
    reasons.push("serious_injuries+2");
  }

  // Diet outcomes scale with nutrition-staff quality (getHeyaStaffBonuses.diet);
  // a vacant nutritionist post drags the multiplier below baseline.
  const dietMult = getHeyaStaffBonuses(world, heya.id).diet;
  const heyaDiet = state.activeDiet || "maintenance";
  // P3: per-rikishi diet override — welfare pressure is pro-rated by the
  // share of the active roster actually on each regimen (rikishi.diet
  // falls back to the heya default).
  const roster = EntityCollection.getHeyaRoster(world, heya.id);
  let austerityCount = heyaDiet === "austerity" ? 1 : 0;
  let premiumCount = heyaDiet === "premium" ? 1 : 0;
  let dietCount = 1;
  if (roster.length > 0) {
    austerityCount = 0;
    premiumCount = 0;
    dietCount = 0;
    for (const r of roster) {
      const rd = r.diet ?? heyaDiet;
      dietCount++;
      if (rd === "austerity") austerityCount++;
      else if (rd === "premium") premiumCount++;
    }
  }
  const austerityDelta = Math.round(
    (WELFARE_AUSTERITY_DIET_BONUS / dietMult) * (austerityCount / dietCount)
  );
  const premiumDelta = Math.round(
    WELFARE_PREMIUM_DIET_REDUCTION * dietMult * (premiumCount / dietCount)
  );
  if (austerityDelta > 0) {
    delta += austerityDelta;
    reasons.push(`austerity_diet+${austerityDelta}`);
  }
  if (premiumDelta > 0) {
    delta -= premiumDelta;
    reasons.push(`premium_diet-${premiumDelta}`);
  }

  if (negligenceCount > 0) {
    const penalty = negligenceCount * WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER;
    delta += penalty;
    reasons.push(`negligence+${penalty}`);
  } else if (pressure > 0) {
    reasons.push("misfortune");
  }

  // Training Context
  const trainingState = world.trainingState?.get(heya.id);
  const intensity = trainingState?.activeProfile.intensity || "balanced";
  const recovery = trainingState?.activeProfile.recovery || "normal";

  if (intensity === "punishing") {
    delta += WELFARE_PUNISHING_INTENSITY_BONUS;
    reasons.push("punishing_intensity+3");
  } else if (intensity === "intensive") {
    delta += WELFARE_INTENSIVE_INTENSITY_BONUS;
    reasons.push("intensive_intensity+1");
  }

  if (recovery === "low") {
    delta += WELFARE_LOW_RECOVERY_BONUS;
    reasons.push("low_recovery+2");
  } else if (recovery === "high") {
    delta -= WELFARE_HIGH_RECOVERY_REDUCTION;
    reasons.push("high_recovery-2");
  }

  // Facility Impact
  const recQuality = heya.facilities?.recovery ?? 50;
  const nutQuality = heya.facilities?.nutrition ?? 50;
  const facDelta =
    Math.round((FACILITY_RECOVERY_QUALITY_BASE - recQuality) / FACILITY_RECOVERY_DIVISOR) +
    Math.round((FACILITY_NUTRITION_QUALITY_BASE - nutQuality) / FACILITY_NUTRITION_DIVISOR);
  if (facDelta !== 0) {
    delta += facDelta;
    reasons.push(`facilities${facDelta >= 0 ? "+" : ""}${facDelta}`);
  }

  // Scandal Synergy
  if ((heya.scandalScore ?? 0) >= SCANDAL_WELFARE_THRESHOLD) {
    delta += WELFARE_SCANDAL_SYNERGY_BONUS;
    reasons.push("scandal_synergy+2");
  }

  // Health Drift (Downward)
  const isHealthy =
    pressure === 0 && intensity !== "punishing" && intensity !== "intensive" && recovery !== "low";
  if (isHealthy) {
    delta -= WELFARE_HEALTHY_DRIFT_REDUCTION;
    reasons.push("healthy_drift-2");
  }

  return { delta, reasons };
}

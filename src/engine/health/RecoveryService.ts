/**
 * RecoveryService.ts — Logic for weekly recovery ticks.
 */

import { Rikishi } from "@/engine/types/rikishi";
import {
  RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD,
  DOUBLE_WEEK_REDUCTION,
  SINGLE_WEEK_REDUCTION,
} from "@/constants/engine/condition";

export interface RecoveryTickResult {
  recovered: boolean;
  rikishi: Rikishi;
}

/**
 * Ticks recovery for a single rikishi.
 * Reduces injuryWeeksRemaining and updates injuryStatus.
 *
 * Pure — operates on an internal copy and returns the updated rikishi so
 * callers can't accidentally corrupt the live world object with a missed
 * defensive clone (S7-39).
 */
export function tickRikishiRecovery(rikishi: Rikishi, recoveryMult: number = 1.0): RecoveryTickResult {
  const r: Rikishi = {
    ...rikishi,
    injuryStatus: rikishi.injuryStatus ? { ...rikishi.injuryStatus } : rikishi.injuryStatus,
  };

  if (!r.injured || r.injuryWeeksRemaining <= 0) {
    r.injured = false;
    r.injuryWeeksRemaining = 0;
    r.isKyujo = false;
    r.kyujoReason = undefined;
    return { recovered: false, rikishi: r };
  }

  // base recovery = 1 week per week
  // recoveryMult >= 1.2 yields 2 weeks (from original logic)
  const weeksReduced =
    recoveryMult >= RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD
      ? DOUBLE_WEEK_REDUCTION
      : SINGLE_WEEK_REDUCTION;
  r.injuryWeeksRemaining = Math.max(0, r.injuryWeeksRemaining - weeksReduced);

  if (r.injuryWeeksRemaining <= 0) {
    r.injured = false;
    r.injuryStatus = { type: "none", severity: "none", weeksRemaining: 0 };
    // Clear the legacy alias — a truthy "none" object is read as injured by
    // projections that use `!!r.injury` / `r.injury != null`.
    r.injury = undefined;
    r.isKyujo = false;
    r.kyujoReason = undefined;
    r.recentlyReturnedFromInjury = true;
    return { recovered: true, rikishi: r };
  }

  // Update status object
  if (r.injuryStatus) {
    r.injuryStatus.weeksRemaining = r.injuryWeeksRemaining;
  }

  return { recovered: false, rikishi: r };
}

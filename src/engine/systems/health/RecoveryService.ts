/**
 * RecoveryService.ts — Logic for weekly recovery ticks.
 */

import { Rikishi } from "../../types/rikishi";
import {
  RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD,
  DOUBLE_WEEK_REDUCTION,
  SINGLE_WEEK_REDUCTION,
} from "../../../constants/engine/condition";

/**
 * Ticks recovery for a single rikishi.
 * Reduces injuryWeeksRemaining and updates injuryStatus.
 */
export function tickRikishiRecovery(rikishi: Rikishi, recoveryMult: number = 1.0): boolean {
  if (!rikishi.injured || rikishi.injuryWeeksRemaining <= 0) {
    rikishi.injured = false;
    rikishi.injuryWeeksRemaining = 0;
    return false;
  }

  // base recovery = 1 week per week
  // recoveryMult >= 1.2 yields 2 weeks (from original logic)
  const weeksReduced = recoveryMult >= RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD ? DOUBLE_WEEK_REDUCTION : SINGLE_WEEK_REDUCTION;
  rikishi.injuryWeeksRemaining = Math.max(0, rikishi.injuryWeeksRemaining - weeksReduced);

  if (rikishi.injuryWeeksRemaining <= 0) {
    rikishi.injured = false;
    rikishi.injuryStatus = { type: "none", severity: "none", weeksRemaining: 0 };
    rikishi.injury = rikishi.injuryStatus;
    return true; // Recovered
  }

  // Update status object
  if (rikishi.injuryStatus) {
    rikishi.injuryStatus.weeksRemaining = rikishi.injuryWeeksRemaining;
  }

  return false;
}

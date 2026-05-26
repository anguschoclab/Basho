/**
 * src/engine/tick/conditionTick.ts
 * =================================
 * Pure function for daily condition decay/recovery.
 *
 * - active_basho: condition decays based on current fatigue level
 * - interim / off-season: condition recovers at a fixed rate
 */

import type { Rikishi } from "../types/rikishi";
import {
  DEFAULT_CONDITION,
  MAX_CONDITION,
  MIN_CONDITION,
  FATIGUE_DECAY_RATE,
  FATIGUE_DECAY_DIVISOR,
  RECOVERY_RATE_NORMAL,
  RECOVERY_RATE_SLOW,
} from "../../constants/engine/condition";

type CyclePhase = "active_basho" | "interim" | "pre_basho" | "post_basho" | "banzuke_reveal";

/**
 * Computes the next condition value for a rikishi based on the current cycle phase.
 * Returns a shallow-cloned rikishi with updated condition.
 */
export function tickCondition(r: Rikishi, cyclePhase: CyclePhase): Rikishi {
  const currentCondition = r.condition ?? DEFAULT_CONDITION;
  const fatigue = r.fatigue ?? 0;

  let nextCondition = currentCondition;

  if (cyclePhase === "active_basho") {
    // Decay proportional to fatigue: fatigue=100 → -0.5/day, fatigue=0 → 0/day
    const decayRate = (fatigue / FATIGUE_DECAY_DIVISOR) * FATIGUE_DECAY_RATE;
    nextCondition = Math.max(MIN_CONDITION, currentCondition - decayRate);
  } else if (cyclePhase === "interim" || cyclePhase === "post_basho") {
    // Recovery: 1.0 per day — back to 100 from 70 in ~30 days
    nextCondition = Math.min(MAX_CONDITION, currentCondition + RECOVERY_RATE_NORMAL);
  }
  // pre_basho and banzuke_reveal: slow recovery (0.5/day)
  else if (cyclePhase === "pre_basho" || cyclePhase === "banzuke_reveal") {
    nextCondition = Math.min(MAX_CONDITION, currentCondition + RECOVERY_RATE_SLOW);
  }

  return { ...r, condition: nextCondition };
}

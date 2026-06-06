/**
 * phase02_context.ts
 * ==================
 * Pipeline Phase 2 — Single Source of Truth: Derives ActiveModifiers
 *
 * Reads the post-Phase-1 world to compute all active buffs/debuffs
 * and resets TickDeltas (except revenue/expenses already set by phase01).
 *
 * ActiveModifiers derivation:
 *   trainingMultiplier  = facilityMult * oyakataMult * [morale +0.15] * [penalty *0.5]
 *   recoveryMultiplier  = recoveryFacilityMult * nutritionMult
 *   financialPenalty    = playerHeya.funds < 0
 *   moraleBoost         = a player rikishi won a basho within the last 4 weeks
 *
 * After this phase, world.transientContext.activeModifiers is the authoritative
 * source for all downstream phase calculations.
 */

import type { WorldState, ActiveModifiers } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { emptyDeltas } from "../pipelineRunner";
import { clamp } from "../../utils";
import {
  TRAINING_MULTIPLIERS,
  FACILITY_RECOVERY_MULTIPLIERS,
  NUTRITION_MULTIPLIERS,
  MORALE_BOOST_MULTIPLIER,
  FINANCIAL_PENALTY_MULTIPLIER,
  TRAINING_MULTIPLIER_BOUNDS,
  RECOVERY_MULTIPLIER_BOUNDS,
} from "../../../constants/engine/multipliers";
import {
  MAX_STAT_VALUE,
  MIN_STAT_VALUE,
  DEFAULT_FACILITY_LEVEL,
} from "../../../constants/engine/rikishi";
import { getHeya } from "../../queries";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase02_context(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase02_context");
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? getHeya(world, playerHeyaId) : undefined;

  const financialPenalty = (playerHeya?.funds ?? 0) < 0;
  const facilityMultipliers = calculateFacilityMultipliers(playerHeya);
  const moraleBoost = checkMoraleBoost(world);
  const trainingMultiplier = calculateTrainingMultiplier(
    facilityMultipliers.training,
    moraleBoost,
    financialPenalty
  );
  const recoveryMultiplier = calculateRecoveryMultiplier(
    facilityMultipliers.recovery,
    facilityMultipliers.nutrition
  );

  const activeModifiers: ActiveModifiers = {
    trainingMultiplier,
    recoveryMultiplier,
    financialPenalty,
    moraleBoost,
  };

  const deltas = preserveRevenueExpenses(world);

  // Note: transientContext updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as transientContext is a nested state
  world.transientContext = { activeModifiers, deltas };

  return builder.build();
}

// --- Helper Functions ---

function calculateFacilityMultipliers(playerHeya: any): {
  training: number;
  recovery: number;
  nutrition: number;
} {
  const trainingLevel = clamp(
    playerHeya?.facilities?.training ?? DEFAULT_FACILITY_LEVEL,
    MIN_STAT_VALUE,
    MAX_STAT_VALUE
  );
  const facilityTrainingMult =
    TRAINING_MULTIPLIERS.BASE + (trainingLevel / MAX_STAT_VALUE) * TRAINING_MULTIPLIERS.RANGE;

  const recoveryLevel = clamp(
    playerHeya?.facilities?.recovery ?? DEFAULT_FACILITY_LEVEL,
    MIN_STAT_VALUE,
    MAX_STAT_VALUE
  );
  const facilityRecoveryMult =
    FACILITY_RECOVERY_MULTIPLIERS.BASE + (recoveryLevel / MAX_STAT_VALUE) * FACILITY_RECOVERY_MULTIPLIERS.RANGE;

  const nutritionLevel = clamp(
    playerHeya?.facilities?.nutrition ?? DEFAULT_FACILITY_LEVEL,
    MIN_STAT_VALUE,
    MAX_STAT_VALUE
  );
  const nutritionMult =
    NUTRITION_MULTIPLIERS.BASE + (nutritionLevel / MAX_STAT_VALUE) * NUTRITION_MULTIPLIERS.RANGE;

  return {
    training: facilityTrainingMult,
    recovery: facilityRecoveryMult,
    nutrition: nutritionMult,
  };
}

function calculateTrainingMultiplier(
  facilityTrainingMult: number,
  moraleBoost: boolean,
  financialPenalty: boolean
): number {
  let trainingMultiplier = facilityTrainingMult;
  if (moraleBoost) trainingMultiplier += MORALE_BOOST_MULTIPLIER;
  if (financialPenalty) trainingMultiplier *= FINANCIAL_PENALTY_MULTIPLIER;
  return clamp(trainingMultiplier, TRAINING_MULTIPLIER_BOUNDS.MIN, TRAINING_MULTIPLIER_BOUNDS.MAX);
}

function calculateRecoveryMultiplier(facilityRecoveryMult: number, nutritionMult: number): number {
  return clamp(
    facilityRecoveryMult * nutritionMult,
    RECOVERY_MULTIPLIER_BOUNDS.MIN,
    RECOVERY_MULTIPLIER_BOUNDS.MAX
  );
}

function preserveRevenueExpenses(world: WorldState) {
  const prevDeltas = world.transientContext?.deltas;
  return {
    ...emptyDeltas(),
    revenue: prevDeltas?.revenue ?? 0,
    expenses: prevDeltas?.expenses ?? 0,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function checkMoraleBoost(world: WorldState): boolean {
  if (!world.playerHeyaId || !world.history?.length) return false;

  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return false;

  // Get player rikishi IDs
  const playerHeya = getHeya(world, world.playerHeyaId);
  const playerRikishiIds = new Set(playerHeya?.rikishiIds ?? []);

  return playerRikishiIds.has(lastBasho.yusho ?? "");
}

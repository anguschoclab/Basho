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

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase02_context(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase02_context");
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;

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
  const trainingLevel = clamp(playerHeya?.facilities?.training ?? 50, 0, 100);
  const facilityTrainingMult = 0.85 + (trainingLevel / 100) * 0.35;

  const recoveryLevel = clamp(playerHeya?.facilities?.recovery ?? 50, 0, 100);
  const facilityRecoveryMult = 0.8 + (recoveryLevel / 100) * 0.4;

  const nutritionLevel = clamp(playerHeya?.facilities?.nutrition ?? 50, 0, 100);
  const nutritionMult = 0.92 + (nutritionLevel / 100) * 0.16;

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
  if (moraleBoost) trainingMultiplier += 0.15;
  if (financialPenalty) trainingMultiplier *= 0.5;
  return clamp(trainingMultiplier, 0.1, 2.0);
}

function calculateRecoveryMultiplier(facilityRecoveryMult: number, nutritionMult: number): number {
  return clamp(facilityRecoveryMult * nutritionMult, 0.5, 2.0);
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
  const playerHeya = world.heyas.get(world.playerHeyaId);
  const playerRikishiIds = new Set(playerHeya?.rikishiIds ?? []);

  return playerRikishiIds.has(lastBasho.yusho ?? "");
}

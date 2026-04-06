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
import { emptyDeltas } from "../pipelineRunner";
import { clamp } from "../../utils";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase02_context(world: WorldState): WorldState {
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;

  // ── financialPenalty ──────────────────────────────────────────────────────
  const financialPenalty = (playerHeya?.funds ?? 0) < 0;

  // ── Facility multipliers ──────────────────────────────────────────────────
  // Training facility: 0 = 0.85×, 100 = 1.20×
  const trainingLevel = clamp(playerHeya?.facilities?.training ?? 50, 0, 100);
  const facilityTrainingMult = 0.85 + (trainingLevel / 100) * 0.35;

  // Recovery facility: 0 = 0.80×, 100 = 1.20×
  const recoveryLevel = clamp(playerHeya?.facilities?.recovery ?? 50, 0, 100);
  const facilityRecoveryMult = 0.80 + (recoveryLevel / 100) * 0.40;

  // Nutrition facility: 0 = 0.92×, 100 = 1.08×
  const nutritionLevel = clamp(playerHeya?.facilities?.nutrition ?? 50, 0, 100);
  const nutritionMult = 0.92 + (nutritionLevel / 100) * 0.16;

  // ── moraleBoost ───────────────────────────────────────────────────────────
  // True if any player rikishi won the last basho (history length check)
  const moraleBoost = checkMoraleBoost(world);

  // ── Assemble trainingMultiplier ───────────────────────────────────────────
  let trainingMultiplier = facilityTrainingMult;
  if (moraleBoost) trainingMultiplier += 0.15;
  if (financialPenalty) trainingMultiplier *= 0.5;
  trainingMultiplier = clamp(trainingMultiplier, 0.1, 2.0);

  // ── Assemble recoveryMultiplier ───────────────────────────────────────────
  const recoveryMultiplier = clamp(facilityRecoveryMult * nutritionMult, 0.5, 2.0);

  const activeModifiers: ActiveModifiers = {
    trainingMultiplier,
    recoveryMultiplier,
    financialPenalty,
    moraleBoost,
  };

  // Preserve revenue/expenses written by phase01; reset per-tick change lists
  const prevDeltas = world.transientContext?.deltas;
  const deltas = {
    revenue: prevDeltas?.revenue ?? 0,
    expenses: prevDeltas?.expenses ?? 0,
    ...emptyDeltas(),
    // restore revenue/expenses after emptyDeltas resets them
    revenue: prevDeltas?.revenue ?? 0,
    expenses: prevDeltas?.expenses ?? 0,
  };

  return {
    ...world,
    transientContext: { activeModifiers, deltas },
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

  return playerRikishiIds.has(lastBasho.yushoWinnerId ?? "");
}

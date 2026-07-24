/**
 * phase02_context.ts
 * ==================
 * Pipeline Phase 2 — Single Source of Truth: Derives ActiveModifiers
 *
 * Reads the post-Phase-1 world to compute all active buffs/debuffs
 * and resets TickDeltas (except revenue/expenses already set by phase01).
 *
 * ActiveModifiers derivation (raw components — no bundled trainingMultiplier):
 *   facilityGrowthMult = training facility level → 0.85 + (lvl/100)*0.35
 *   nutritionMult      = nutrition facility level → 0.92 + (lvl/100)*0.16
 *   degeikoMult        = ichimon/faction/rivalry modifiers (from extractTrainingModifiers)
 *   styleDriftMults    = per-stat drift from training philosophy + ichimon stat bonuses
 *   recoveryMultiplier = recoveryFacilityMult * nutritionMult (clamped 0.5–2.0)
 *   financialPenalty   = playerHeya.funds < 0 (applied as 0.5× in calculateGains)
 *   moraleBoost        = a player rikishi won the most recent basho (applied as +0.15 in calculateGains)
 *
 * Morale boost and financial penalty are stored as boolean flags and applied
 * downstream in TrainingMath.calculateGains, not bundled here.
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
  FACILITY_RECOVERY_MULTIPLIERS,
  RECOVERY_MULTIPLIER_BOUNDS,
} from "../../../constants/engine/multipliers";
import {
  MAX_STAT_VALUE,
  MIN_STAT_VALUE,
  DEFAULT_FACILITY_LEVEL,
} from "../../../constants/engine/rikishi";
import { getHeya } from "../../queries";
import { extractTrainingModifiers } from "../../systems/training/TrainingMath";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase02_context(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase02_context");
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? getHeya(world, playerHeyaId) : undefined;

  const financialPenalty = (playerHeya?.funds ?? 0) < 0;
  const moraleBoost = checkMoraleBoost(world);

  // Extract raw training modifier components (facility, nutrition, degeiko, style drift)
  const { facilityGrowthMult, nutritionMult, degeikoMult, styleDriftMults } =
    extractTrainingModifiers(playerHeya, world);

  // Recovery multiplier is derived from recovery facility * nutrition
  const recoveryMultiplier = calculateRecoveryMultiplier(playerHeya, nutritionMult);

  const activeModifiers: ActiveModifiers = {
    facilityGrowthMult,
    nutritionMult,
    degeikoMult,
    styleDriftMults,
    recoveryMultiplier,
    financialPenalty,
    moraleBoost,
  };

  const deltas = preserveRevenueExpenses(world);

  // Preserve existing transientContext fields (e.g. boundaries from phase00_preflight)
  // while updating activeModifiers and deltas.
  builder.updateWorldField("transientContext", {
    ...world.transientContext,
    activeModifiers,
    deltas,
  });

  return builder.build();
}

// --- Helper Functions ---

function calculateRecoveryMultiplier(
  playerHeya: ReturnType<typeof getHeya>,
  nutritionMult: number
): number {
  const recoveryLevel = clamp(
    playerHeya?.facilities?.recovery ?? DEFAULT_FACILITY_LEVEL,
    MIN_STAT_VALUE,
    MAX_STAT_VALUE
  );
  const facilityRecoveryMult =
    FACILITY_RECOVERY_MULTIPLIERS.BASE +
    (recoveryLevel / MAX_STAT_VALUE) * FACILITY_RECOVERY_MULTIPLIERS.RANGE;

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

/**
 * src/engine/systems/training/TrainingService.ts
 * ==============================================
 * Stateful orchestration for the Training System.
 *
 * Responsibilities:
 * 1. State Hydration (ensureHeyaTrainingState)
 * 2. Weekly Evolution Tick (applyWeeklyTraining)
 * 3. Profile Management
 *
 * Goal: Service-oriented architecture with clear dependencies.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { HeyaTrainingState } from "../../types/training";
import type { Rikishi } from "../../types/rikishi";
import { EntityCollection } from "../../core/EntityCollection";
import { EntityService } from "../../core/EntityService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { STAT_GROUP } from "../../../constants/engine/development";
import type { StateImpact } from "../../core/StateImpact";
import {
  calculateFatigueDelta,
  calculateGrowthVector,
  calculateAgeDecay,
  getEffectiveCeiling,
} from "./TrainingMath";
import { getHeyaStaffBonuses } from "../../staff";
import { DRILL_EFFECTS } from "../../../constants/engine/training";
import { InfrastructureService } from "../economy/InfrastructureService";
import { RNGRegistry } from "../../core/RNGRegistry";

// Re-exports for UI consumption
export * from "./TrainingConstants";
export * from "./TrainingNarrative";

/**
 * Factory for default training state.
 * Creates a new HeyaTrainingState with default balanced profile.
 *
 * @param {Id} heyaId - The heya ID to create training state for.
 * @returns {HeyaTrainingState} The default training state.
 *
 * @example
 * ```ts
 * const defaultState = createDefaultTrainingState(heyaId);
 * console.log(defaultState.activeProfile.intensity); // "balanced"
 * ```
 */
export function createDefaultTrainingState(heyaId: Id): HeyaTrainingState {
  return {
    heyaId,
    activeProfile: {
      intensity: "balanced",
      focus: "neutral",
      styleBias: "neutral",
      recovery: "normal",
    },
    focusSlots: [],
  };
}

/**
 * Ensure heya training state exists in world.
 * Hydrates the training state for a heya if it doesn't exist.
 *
 * @param {WorldState} world - The current world state.
 * @param {Id} heyaId - The heya ID to ensure training state for.
 * @returns {HeyaTrainingState} The existing or newly created training state.
 *
 * @example
 * ```ts
 * const trainingState = ensureHeyaTrainingState(world, heyaId);
 * console.log(trainingState.activeProfile);
 * ```
 */
export function ensureHeyaTrainingState(world: WorldState, heyaId: Id): HeyaTrainingState {
  return EntityService.ensureNestedState(world, "trainingState" as const, heyaId, () =>
    createDefaultTrainingState(heyaId)
  );
}

/**
 * Authoritative Weekly Training Tick.
 * Returns StateImpact describing training updates instead of mutating state directly.
 *
 * Algorithm:
 * 1. For each active rikishi, calculate fatigue delta based on training profile
 * 2. Apply burnout check for prodigies on extreme intensity
 * 3. Aggregate weekly drill plan impacts
 * 4. Calculate growth vector with staff bonuses and infrastructure buffs
 * 5. Apply age-based decay to stats
 * 6. Enforce stat ceilings and division floors
 * 7. Log milestone events for threshold crossings
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Impact describing training updates for all rikishi.
 *
 * @example
 * ```ts
 * const impact = applyWeeklyTraining(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function applyWeeklyTraining(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyWeeklyTraining");
  const activeRikishi = EntityCollection.getActiveRikishi(world);

  activeRikishi.forEach((rikishi) => {
    const beyaState = ensureHeyaTrainingState(world, rikishi.heyaId);
    const profile = beyaState.activeProfile;
    const individualFocus = beyaState.focusSlots.find((s) => s.rikishiId === rikishi.id);

    // 1. Fatigue Logic
    const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
    const focusType = individualFocus?.focusType;
    const isOnRecoveryFocus = focusType === "protect" || focusType === "rebuild";

    let newFatigue;
    if (rikishi.injured && isOnRecoveryFocus) {
      // Recovery focus flips the delta: injured wrestlers on protect/rebuild shed fatigue
      newFatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) - Math.abs(fatigueDelta)));
    } else {
      newFatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) + fatigueDelta));
    }

    const updates: Partial<Rikishi> = { fatigue: newFatigue };

    // Phase 5: Emergent Prodigy Burnout Check
    if (rikishi.injuryStatus?.isEmergentProdigy) {
      const { crashed, consecutiveWeeks } = applyBurnoutStep(rikishi, profile.intensity, world);
      if (crashed) {
        builder.logEvent(
          "NARRATIVE_CRISIS_TRIGGERED",
          "narrative",
          {
            rikishiId: rikishi.id,
            heyaId: rikishi.heyaId,
            shikona: rikishi.shikona || rikishi.name,
            eventId: "prodigy_burnout",
            title: "Prodigy Burnout Crash",
            description: `${rikishi.shikona} has collapsed under the weight of extreme training.`,
            incident: `After ${consecutiveWeeks} weeks of extreme intensity, the prodigy has suffered a career-altering failure.`,
          },
          { importance: "headline", rikishiId: rikishi.id }
        );
        // Severe injury & permanent stat penalty
        updates.injured = true;
        const currentStatus = rikishi.injuryStatus;
        updates.injuryStatus = {
          ...currentStatus,
          type: "strain",
          severity: "serious",
          weeksRemaining: 12,
          weeksToHeal: 12,
        };
        updates.power = Math.max(30, (rikishi.power ?? 50) - 15);
        updates.stamina = Math.max(30, (rikishi.stamina ?? 50) - 15);
        // Stats object will be synced in the growth section if not injured,
        // but since we just injured them, we should sync here too.
        updates.stats = {
          ...(rikishi.stats || {}),
          strength: Math.floor(updates.power),
          stamina: Math.floor(updates.stamina),
        };
      }
    }

    // 2. Weekly Drill Plan (P2 Phase O)
    // If a manual schedule is provided, we aggregate the 6-day impact.
    // Otherwise, we default to Asageiko (basic conditioning).
    const weeklyPlan = beyaState.weeklyPlan?.[rikishi.id] || {
      1: "asageiko",
      2: "asageiko",
      3: "asageiko",
      4: "asageiko",
      5: "asageiko",
      6: "asageiko",
    };

    const drillVector = {
      strength: 0,
      speed: 0,
      technique: 0,
      balance: 0,
      stamina: 0,
      weight: 0,
      mental: 0,
      fatigue: 0,
    };

    Object.values(weeklyPlan).forEach((drillType) => {
      const effects = DRILL_EFFECTS[drillType] || DRILL_EFFECTS.none;
      drillVector.strength += effects.strength || 0;
      drillVector.speed += effects.speed || 0;
      drillVector.technique += effects.technique || 0;
      drillVector.balance += effects.balance || 0;
      drillVector.stamina += effects.stamina || 0;
      drillVector.weight += effects.weight || 0;
      drillVector.mental += effects.mental || 0;
      drillVector.fatigue += effects.fatigue;
    });

    // Apply drill fatigue to the running total.
    // Skip for injured rikishi on recovery focus — they rest, not drill.
    if (!(rikishi.injured && isOnRecoveryFocus)) {
      updates.fatigue = Math.max(0, Math.min(100, (updates.fatigue || 0) + drillVector.fatigue));
    }

    // 3. Growth Logic (Skip if injured - either previously or from a fresh burnout)
    if (!rikishi.injured && !updates.injured) {
      const heya = EntityCollection.getHeya(world, rikishi.heyaId);
      const staffBonuses = getHeyaStaffBonuses(world, rikishi.heyaId);
      const infra = InfrastructureService.getHeyaBonuses(heya);
      const growth = calculateGrowthVector(profile, individualFocus, rikishi, heya, world);

      // Apply staff bonuses + Drill Vector + Infrastructure Buffs
      const finalGrowth = {
        strength:
          (growth.strength + drillVector.strength) *
          staffBonuses.conditioning *
          infra.statBuffs.strength,
        speed:
          (growth.speed + drillVector.speed) * staffBonuses.conditioning * infra.statBuffs.speed,
        technique:
          (growth.technique + drillVector.technique) *
          staffBonuses.technique *
          infra.statBuffs.technique,
        balance:
          (growth.balance + drillVector.balance) *
          staffBonuses.conditioning *
          infra.statBuffs.balance,
        stamina:
          (growth.stamina + drillVector.stamina) *
          staffBonuses.conditioning *
          infra.statBuffs.stamina,
        adaptability: growth.adaptability * infra.statBuffs.adaptability,
        mental:
          (growth.mental + drillVector.mental) * staffBonuses.technique * infra.statBuffs.mental,
      };

      // Pre-snapshot for milestone checks
      const prevPower = rikishi.power || 50;

      // Age-based decline (past peak, per attribute group)
      const decay = calculateAgeDecay(rikishi, world.year);

      // Apply Growth (net of age decay)
      // We cap at getEffectiveCeiling to ensure age-based decline is enforceable
      updates.power = Math.min(
        getEffectiveCeiling(rikishi, "strength", world),
        Math.max(10, (rikishi.power || 50) + finalGrowth.strength + decay.strength)
      );
      updates.speed = Math.min(
        getEffectiveCeiling(rikishi, "speed", world),
        Math.max(10, (rikishi.speed || 50) + finalGrowth.speed + decay.speed)
      );
      updates.technique = Math.min(
        getEffectiveCeiling(rikishi, "technique", world),
        Math.max(10, (rikishi.technique || 50) + finalGrowth.technique + decay.technique)
      );
      updates.balance = Math.min(
        getEffectiveCeiling(rikishi, "balance", world),
        Math.max(10, (rikishi.balance || 50) + finalGrowth.balance + decay.balance)
      );
      updates.stamina = Math.min(
        getEffectiveCeiling(rikishi, "stamina", world),
        Math.max(10, (rikishi.stamina || 50) + finalGrowth.stamina + decay.stamina)
      );
      updates.adaptability = Math.min(
        getEffectiveCeiling(rikishi, "adaptability", world),
        Math.max(10, (rikishi.adaptability || 50) + finalGrowth.adaptability + decay.adaptability)
      );
      updates.experience = Math.min(
        getEffectiveCeiling(rikishi, "mental", world),
        Math.max(10, (rikishi.experience || 0) + finalGrowth.mental * 0.5 + decay.mental)
      );

      // Sync flattened UI stats
      updates.stats = {
        ...(rikishi.stats || {}),
        strength: Math.floor(updates.power),
        speed: Math.floor(updates.speed),
        technique: Math.floor(updates.technique),
        balance: Math.floor(updates.balance),
        stamina: Math.floor(updates.stamina),
        adaptability: Math.floor(updates.adaptability),
        mental: Math.floor(updates.experience),
        weight: rikishi.stats?.weight ?? 145,
      };

      // Milestone Events (Threshold crossing)
      const currentPower = Math.floor(updates.power);
      if (Math.floor(currentPower / 10) > Math.floor(prevPower / 10)) {
        builder.logEvent(
          "TRAINING_UPDATE",
          "training",
          {
            rikishiId: rikishi.id,
            heyaId: rikishi.heyaId,
            shikona: rikishi.shikona || rikishi.name,
            status: profile.focus,
            intensity: profile.intensity,
            score: currentPower,
          },
          { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
        );
      }
    }

    // 4. Final Enforcements (Clamping & Stat Floors)
    (Object.keys(STAT_GROUP) as Array<keyof typeof STAT_GROUP>).forEach((key) => {
      const ceiling = getEffectiveCeiling({ ...rikishi, ...updates } as Rikishi, key, world);
      let val = updates[key as keyof Rikishi] as number;

      // Enforce Ceiling
      val = Math.min(ceiling, val);

      // Enforce Elite Division Floors
      // This prevents the "Sumo Graveyard" effect where Makuuchi is filled with decayed jobbers.
      if (rikishi.division === "makuuchi") {
        val = Math.max(45, val);
      } else if (rikishi.division === "juryo") {
        val = Math.max(40, val);
      }

      updates[key as keyof Rikishi] = val;
    });

    builder.updateRikishi(rikishi.id, updates);
  });

  return builder.build();
}

/**
 * Phase 5: Burnout Logic
 * Escalating risk curve for Prodigies at Extreme Intensity.
 * Tracks consecutive weeks of extreme training and rolls for burnout crash.
 *
 * Risk curve:
 * - Week 1: 15% crash probability
 * - Week 2: 35% crash probability
 * - Week 3+: 100% crash probability
 *
 * @param {Rikishi} r - The rikishi to check for burnout.
 * @param {string} intensity - The training intensity level.
 * @param {WorldState} world - The current world state.
 * @returns {{ crashed: boolean; consecutiveWeeks: number }} Burnout result with crash status and consecutive weeks.
 */
function applyBurnoutStep(
  r: Rikishi,
  intensity: string,
  world: WorldState
): { crashed: boolean; consecutiveWeeks: number } {
  if (intensity !== "punishing") {
    r.consecutiveExtremeWeeks = 0;
    return { crashed: false, consecutiveWeeks: 0 };
  }

  const currentWeeks = (r.consecutiveExtremeWeeks || 0) + 1;
  r.consecutiveExtremeWeeks = currentWeeks;

  // Probability roll: 15% (W1) -> 35% (W2) -> 100% (W3+)
  let crashProb = 0.15;
  if (currentWeeks === 2) crashProb = 0.35;
  if (currentWeeks >= 3) crashProb = 1.0;

  // Use system RNG for deterministic burnout rolls
  const burnoutRng = RNGRegistry.getSystemRNG(world, "training", `burnout-${r.id}-${world.week}`);
  const roll = burnoutRng.next();

  if (roll < crashProb) {
    return { crashed: true, consecutiveWeeks: currentWeeks };
  }

  return { crashed: false, consecutiveWeeks: currentWeeks };
}

/**
 * Compatibility object for any legacy callers using TrainingService.*
 * Provides a namespace for all training-related functions and constants.
 */
import * as Constants from "../../../constants/engine/training";
import * as Narrative from "./TrainingNarrative";

/**
 * Training Service namespace.
 * Exports all training-related functions, constants, and narrative helpers.
 *
 * @see SparringService for sparring-specific logic
 * @see MentorshipService for mentorship-specific logic
 */
export const TrainingService = {
  ensureHeyaTrainingState,
  applyWeeklyTraining,
  createDefaultTrainingState,
  ...Constants,
  ...Narrative,
};

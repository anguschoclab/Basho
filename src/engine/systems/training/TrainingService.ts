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
import type { StateImpact } from "../../core/StateImpact";
import { calculateFatigueDelta, calculateGrowthVector } from "./TrainingMath";
import { getHeyaStaffBonuses } from "../../staff";

// Re-exports for UI consumption
export * from "./TrainingConstants";
export * from "./TrainingNarrative";

/**
 * Factory for default state.
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
 */
export function ensureHeyaTrainingState(world: WorldState, heyaId: Id): HeyaTrainingState {
  return EntityService.ensureNestedState(world, "trainingState" as const, heyaId, () =>
    createDefaultTrainingState(heyaId)
  );
}

/**
 * Authoritative Weekly Training Tick.
 * Returns StateImpact describing training updates instead of mutating state directly.
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

    // 2. Growth Logic (Skip if injured)
    if (!rikishi.injured) {
      const heya = EntityCollection.getHeya(world, rikishi.heyaId);
      const staffBonuses = getHeyaStaffBonuses(world, rikishi.heyaId);
      const growth = calculateGrowthVector(profile, individualFocus, rikishi, heya, world);

      // Apply staff bonuses (Stacking multipliers)
      // Technique bonus applies to technique and mental
      // Conditioning bonus applies to strength, speed, balance, stamina
      const finalGrowth = {
        strength: growth.strength * staffBonuses.conditioning,
        speed: growth.speed * staffBonuses.conditioning,
        technique: growth.technique * staffBonuses.technique,
        balance: growth.balance * staffBonuses.conditioning,
        stamina: growth.stamina * staffBonuses.conditioning,
        adaptability: growth.adaptability,
        mental: growth.mental * staffBonuses.technique,
      };

      // Pre-snapshot for milestone checks
      const prevPower = rikishi.power || 50;

      // Apply Growth
      updates.power = Math.min(100, (rikishi.power || 50) + finalGrowth.strength);
      updates.speed = Math.min(100, (rikishi.speed || 50) + finalGrowth.speed);
      updates.technique = Math.min(100, (rikishi.technique || 50) + finalGrowth.technique);
      updates.balance = Math.min(100, (rikishi.balance || 50) + finalGrowth.balance);
      updates.stamina = Math.min(100, (rikishi.stamina || 50) + finalGrowth.stamina);
      updates.adaptability = Math.min(100, (rikishi.adaptability || 50) + finalGrowth.adaptability);
      updates.experience = Math.min(100, (rikishi.experience || 0) + finalGrowth.mental * 0.5);

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

    builder.updateRikishi(rikishi.id, updates);
  });

  return builder.build();
}

/**
 * Compatibility object for any legacy callers using TrainingService.*
 */
import * as Constants from "./TrainingConstants";
import * as Narrative from "./TrainingNarrative";

export const TrainingService = {
  ensureHeyaTrainingState,
  applyWeeklyTraining,
  createDefaultTrainingState,
  ...Constants,
  ...Narrative,
};

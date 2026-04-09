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
import type { BeyaTrainingState } from "../../types/training";
import { EntityCollection } from "../../core/EntityCollection";
import { RNGRegistry } from "../../core/RNGRegistry";
import { EntityService } from "../../core/EntityService";
import { EventBus } from "../../events";
import { 
  calculateFatigueDelta, 
  calculateGrowthVector 
} from "./TrainingMath";
import { getHeyaStaffBonuses } from "../../staff";


/**
 * Factory for default state.
 */
export function createDefaultTrainingState(beyaId: Id): BeyaTrainingState {
  return {
    beyaId,
    activeProfile: {
      intensity: 'balanced',
      focus: 'neutral',
      styleBias: 'neutral',
      recovery: 'normal'
    },
    focusSlots: []
  };
}

/**
 * Ensure heya training state exists in world.
 */
export function ensureHeyaTrainingState(world: WorldState, beyaId: Id): BeyaTrainingState {
  return EntityService.ensureNestedState(
    world, 
    "trainingState" as any, 
    beyaId, 
    () => createDefaultTrainingState(beyaId)
  );
}

/**
 * Authoritative Weekly Training Tick.
 */
export function applyWeeklyTraining(world: WorldState): void {
  const rng = RNGRegistry.getTrainingRNG(world);
  const activeRikishi = EntityCollection.getActiveRikishi(world);

  activeRikishi.forEach(rikishi => {
    const beyaState = ensureHeyaTrainingState(world, rikishi.heyaId);
    const profile = beyaState.activeProfile;
    const individualFocus = beyaState.focusSlots.find(s => s.rikishiId === rikishi.id);

    // 1. Fatigue Logic
    const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
    const focusType = individualFocus?.focusType;
    const isOnRecoveryFocus = focusType === 'protect' || focusType === 'rebuild';

    if (rikishi.injured && isOnRecoveryFocus) {
      // Recovery focus flips the delta: injured wrestlers on protect/rebuild shed fatigue
      rikishi.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) - Math.abs(fatigueDelta)));
    } else {
      rikishi.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) + fatigueDelta));
    }

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
        mental: growth.mental * staffBonuses.technique
      };

      // Pre-snapshot for milestone checks
      const prevPower = rikishi.power || 50;

      // Apply Growth
      rikishi.power = Math.min(100, (rikishi.power || 50) + finalGrowth.strength);
      rikishi.speed = Math.min(100, (rikishi.speed || 50) + finalGrowth.speed);
      rikishi.technique = Math.min(100, (rikishi.technique || 50) + finalGrowth.technique);
      rikishi.balance = Math.min(100, (rikishi.balance || 50) + finalGrowth.balance);
      rikishi.stamina = Math.min(100, (rikishi.stamina || 50) + finalGrowth.stamina);
      rikishi.adaptability = Math.min(100, (rikishi.adaptability || 50) + finalGrowth.adaptability);
      rikishi.experience = Math.min(100, (rikishi.experience || 0) + (finalGrowth.mental * 0.5));


      // Sync flattened UI stats
      if (!rikishi.stats) rikishi.stats = {} as any;
      rikishi.stats.strength = Math.floor(rikishi.power);
      rikishi.stats.speed = Math.floor(rikishi.speed);
      rikishi.stats.technique = Math.floor(rikishi.technique);
      rikishi.stats.balance = Math.floor(rikishi.balance);
      rikishi.stats.stamina = Math.floor(rikishi.stamina);
      rikishi.stats.adaptability = Math.floor(rikishi.adaptability);
      rikishi.stats.mental = Math.floor(rikishi.experience);

      // Milestone Events (Threshold crossing)
      const currentPower = Math.floor(rikishi.power);
      if (Math.floor(currentPower / 10) > Math.floor(prevPower / 10)) {
        EventBus.trainingUpdate(world, { 
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          shikona: rikishi.shikona || rikishi.name,
          status: profile.focus, 
          intensity: profile.intensity,
          score: currentPower
        });
      }
    }
  });
}

/**
 * Compatibility object for any legacy callers using TrainingService.*
 */
export const TrainingService = {
  ensureHeyaTrainingState,
  applyWeeklyTraining,
  createDefaultTrainingState
};

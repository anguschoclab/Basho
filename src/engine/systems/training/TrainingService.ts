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

/**
 * Unified Training Service.
 */
export const TrainingService = {
  /**
   * Ensure heya training state exists in world.
   */
  ensureHeyaTrainingState(world: WorldState, beyaId: Id): BeyaTrainingState {
    return EntityService.ensureNestedState(
      world, 
      "trainingState" as any, 
      beyaId, 
      () => this.createDefaultTrainingState(beyaId)
    );
  },

  /**
   * Authoritative Weekly Training Tick.
   */
  applyWeeklyTraining(world: WorldState): void {
    const rng = RNGRegistry.getTrainingRNG(world);
    const activeRikishi = EntityCollection.getActiveRikishi(world);

    activeRikishi.forEach(rikishi => {
      const beyaState = this.ensureHeyaTrainingState(world, rikishi.heyaId);
      const profile = beyaState.activeProfile;
      const individualFocus = beyaState.focusSlots.find(s => s.rikishiId === rikishi.id);

      // 1. Fatigue Logic
      const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
      rikishi.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) + fatigueDelta));

      // 2. Growth Logic (Skip if injured)
      if (!rikishi.injured) {
        const heya = EntityCollection.getHeya(world, rikishi.heyaId);
        const growth = calculateGrowthVector(profile, individualFocus, rikishi, heya, world);

        // Pre-snapshot for milestone checks
        const prevPower = rikishi.power || 50;

        // Apply Growth
        rikishi.power = Math.min(100, (rikishi.power || 50) + growth.strength);
        rikishi.speed = Math.min(100, (rikishi.speed || 50) + growth.speed);
        rikishi.technique = Math.min(100, (rikishi.technique || 50) + growth.technique);
        rikishi.balance = Math.min(100, (rikishi.balance || 50) + growth.balance);
        rikishi.stamina = Math.min(100, (rikishi.stamina || 50) + growth.stamina);
        rikishi.adaptability = Math.min(100, (rikishi.adaptability || 50) + growth.adaptability);
        rikishi.experience = Math.min(100, (rikishi.experience || 0) + (growth.mental * 0.5));

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
          EventBus.trainingMilestone(
            world, 
            rikishi.id, 
            rikishi.heyaId,
            `${rikishi.shikona || rikishi.name} breakthrough`,
            `Demonstrated significant improvement in fundamental mechanics.`,
            { focus: profile.focus, intensity: profile.intensity }
          );
        }
      }
    });
  },

  /**
   * Factory for default state.
   */
  createDefaultTrainingState(beyaId: Id): BeyaTrainingState {
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
};

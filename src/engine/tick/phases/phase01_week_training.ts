/**
 * phase01_week_training.ts
 * ========================
 * Pipeline Phase: Weekly Training Evolution.
 *
 * Responsibilities:
 * 1. Calculate fatigue delta for all active rikishi.
 * 2. Calculate skill growth (strength, speed, etc.) based on profile.
 * 3. Apply staff bonuses.
 * 4. Record gains in transientContext.deltas for narrative processing.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { EntityCollection } from "../../core/EntityCollection";
import {
  calculateFatigueDelta,
  calculateGrowthVector,
} from "../../systems/training/TrainingMath";
import { getHeyaStaffBonuses } from "../../staff";
import { ensureHeyaTrainingState } from "../../systems/training/TrainingService";
import { EventBus } from "../../events";
import type { Id } from "../../types/common";

export function phase01_week_training(world: WorldState): WorldState {
  const nextRikishi = new Map(world.rikishi);
  const activeRikishi = EntityCollection.getActiveRikishi(world);

  const milestoneEvents: any[] = [];
  const staffBonusCache = new Map<Id, ReturnType<typeof getHeyaStaffBonuses>>();

  activeRikishi.forEach((rikishi) => {
    const r = { ...rikishi };
    if (!r.stats) r.stats = { ...rikishi.stats } as any;

    const beyaState = ensureHeyaTrainingState(world, r.heyaId);
    const profile = beyaState.activeProfile;
    const individualFocus = beyaState.focusSlots.find((s) => s.rikishiId === r.id);

    // Apply fatigue
    applyFatigue(r, profile, individualFocus);

    // Apply growth if not injured
    if (!r.injured) {
      const heya = EntityCollection.getHeya(world, r.heyaId);
      let staffBonuses = staffBonusCache.get(r.heyaId);
      if (!staffBonuses) {
        staffBonuses = getHeyaStaffBonuses(world, r.heyaId);
        staffBonusCache.set(r.heyaId, staffBonuses);
      }

      const prevPower = r.power || 50;
      applyGrowth(r, profile, individualFocus, heya, world, staffBonuses);
      syncStats(r);

      const currentPower = Math.floor(r.power);
      if (Math.floor(currentPower / 10) > Math.floor(prevPower / 10)) {
        milestoneEvents.push({
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona || r.name,
          status: profile.focus,
          intensity: profile.intensity,
          score: currentPower,
        });
      }
    }

    nextRikishi.set(r.id, r);
  });

  let nextWorld = {
    ...world,
    rikishi: nextRikishi,
  };

  for (const event of milestoneEvents) {
    EventBus.trainingUpdate(nextWorld, event);
  }

  return nextWorld;
}

// --- Helper Functions ---

function applyFatigue(
  r: Rikishi,
  profile: any,
  individualFocus: any,
): void {
  const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
  const focusType = individualFocus?.focusType;
  const isOnRecoveryFocus = focusType === "protect" || focusType === "rebuild";

  if (r.injured && isOnRecoveryFocus) {
    r.fatigue = Math.max(0, Math.min(100, (r.fatigue || 0) - Math.abs(fatigueDelta)));
  } else {
    r.fatigue = Math.max(0, Math.min(100, (r.fatigue || 0) + fatigueDelta));
  }
}

function applyGrowth(
  r: Rikishi,
  profile: any,
  individualFocus: any,
  heya: any,
  world: WorldState,
  staffBonuses: any,
): void {
  const growth = calculateGrowthVector(profile, individualFocus, r, heya, world);

  const finalGrowth = {
    strength: growth.strength * staffBonuses.conditioning,
    speed: growth.speed * staffBonuses.conditioning,
    technique: growth.technique * staffBonuses.technique,
    balance: growth.balance * staffBonuses.conditioning,
    stamina: growth.stamina * staffBonuses.conditioning,
    adaptability: growth.adaptability,
    mental: growth.mental * staffBonuses.technique,
  };

  r.power = Math.min(100, (r.power ?? 50) + finalGrowth.strength);
  r.speed = Math.min(100, (r.speed ?? 50) + finalGrowth.speed);
  r.technique = Math.min(100, (r.technique ?? 50) + finalGrowth.technique);
  r.balance = Math.min(100, (r.balance ?? 50) + finalGrowth.balance);
  r.stamina = Math.min(100, (r.stamina ?? 50) + finalGrowth.stamina);
  r.adaptability = Math.min(100, (r.adaptability ?? 50) + finalGrowth.adaptability);
  r.experience = Math.min(100, (r.experience ?? 0) + finalGrowth.mental * 0.5);
}

function syncStats(r: Rikishi): void {
  r.stats.strength = Math.floor(r.power);
  r.stats.speed = Math.floor(r.speed);
  r.stats.technique = Math.floor(r.technique);
  r.stats.balance = Math.floor(r.balance);
  r.stats.stamina = Math.floor(r.stamina);
  r.stats.adaptability = Math.floor(r.adaptability);
  r.stats.mental = Math.floor(r.experience);
}

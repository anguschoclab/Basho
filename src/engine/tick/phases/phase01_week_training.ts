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
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { EntityCollection } from "../../core/EntityCollection";
import { calculateFatigueDelta, calculateGrowthVector } from "../../systems/training/TrainingMath";
import { ensureHeyaTrainingState } from "../../systems/training/TrainingService";
import type { Id } from "../../types/common";
import type { TrainingProfile, IndividualFocus } from "../../types/training";
import type { StaffBonuses } from "../../staff";
import type { Heya } from "../../types/heya";

export function phase01_week_training(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_training");
  const activeRikishi = EntityCollection.getActiveRikishi(world);

  const staffBonusCache = new Map<Id, ReturnType<typeof getHeyaStaffBonuses>>();

  activeRikishi.forEach((rikishi) => {
    const r = { ...rikishi };
    if (!r.stats) r.stats = { ...rikishi.stats } as NonNullable<typeof r.stats>;

    const beyaState = ensureHeyaTrainingState(world, r.heyaId);
    const profile = beyaState.activeProfile;
    const individualFocus = beyaState.focusSlots.find((s) => s.rikishiId === r.id);

    // Apply fatigue
    applyFatigue(r, profile, individualFocus);

    // Phase 5: Emergent Prodigy Burnout Check
    if (r.injuryStatus?.isEmergentProdigy) {
      const { crashed, consecutiveWeeks } = applyBurnoutStep(r, profile.intensity, world);
      if (crashed) {
        builder.logEvent(
          "NARRATIVE_CRISIS_TRIGGERED",
          "narrative",
          {
            rikishiId: r.id,
            heyaId: r.heyaId,
            shikona: r.shikona || r.name,
            eventId: "prodigy_burnout",
            title: "Prodigy Burnout Crash",
            description: `${r.shikona} has collapsed under the weight of extreme training.`,
            incident: `After ${consecutiveWeeks} weeks of extreme intensity, the prodigy has suffered a career-altering failure.`,
          },
          { importance: "headline", rikishiId: r.id }
        );
        // Severe injury & permanent stat penalty
        r.injured = true;
        if (!r.injuryStatus) {
          r.injuryStatus = {
            type: "internal",
            severity: "serious",
            weeksRemaining: 12,
          };
        }
        const status = r.injuryStatus;
        if (status) {
          status.severity = "serious";
          status.weeksToHeal = 12;
        }
        r.power = Math.max(30, (r.power ?? 50) - 15);
        r.stamina = Math.max(30, (r.stamina ?? 50) - 15);
        syncStats(r);
      }
    }

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
        builder.logEvent(
          "TRAINING_UPDATE",
          "training",
          {
            rikishiId: r.id,
            heyaId: r.heyaId,
            shikona: r.shikona || r.name,
            status: profile.focus,
            intensity: profile.intensity,
            score: currentPower,
          },
          { rikishiId: r.id, heyaId: r.heyaId }
        );
      }
    }

    builder.updateRikishi(r.id, r);
  });

  return builder.build();
}

// --- Helper Functions ---

function applyFatigue(
  r: Rikishi,
  profile: TrainingProfile,
  individualFocus?: IndividualFocus
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
  profile: TrainingProfile,
  individualFocus: IndividualFocus | undefined,
  heya: Heya | undefined,
  world: WorldState,
  staffBonuses: StaffBonuses
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
  r.stats.stamina = Math.floor(r.stamina);
  r.stats.adaptability = Math.floor(r.adaptability);
  r.stats.mental = Math.floor(r.experience);
}

/**
 * Phase 5: Burnout Logic
 * Escalating risk curve for Prodigies at Extreme Intensity.
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

  // Use world week/rikishi ID for stable but stochastic seed
  const roll = (Math.abs(Math.sin((world.week || 0) + parseInt(r.id.slice(-4), 16))) * 1000) % 1;

  if (roll < crashProb) {
    return { crashed: true, consecutiveWeeks: currentWeeks };
  }

  return { crashed: false, consecutiveWeeks: currentWeeks };
}

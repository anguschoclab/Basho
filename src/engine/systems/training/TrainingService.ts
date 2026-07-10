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
import type { HeyaTrainingState, IndividualFocus } from "../../types/training";
import type { Rikishi, RikishiStats } from "../../types/rikishi";
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
import {
  DRILL_EFFECTS,
  EXPERIENCE_GROWTH_MULTIPLIER,
  CRASH_PROBABILITY_THRESHOLD_WEEKS,
  MAX_CRASH_PROBABILITY,
} from "../../../constants/engine/training";
import { InfrastructureService } from "../economy/InfrastructureService";
import { RNGRegistry } from "../../core/RNGRegistry";

// Re-exports for UI consumption
export * from "../../../constants/engine/training";
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
  const state = EntityService.ensureNestedState(world, "trainingState" as const, heyaId, () =>
    createDefaultTrainingState(heyaId)
  );
  // Backfill any missing fields. Nested-field updates (e.g. a loop decision writing
  // `activeProfile.intensity`) can persist a PARTIAL trainingState onto a heya that had
  // none, leaving `activeProfile` without `focus`/`styleBias`/`recovery` — which then
  // crashed the training tick at INTENSITY_MULTIPLIERS[profile.intensity]. Merge over
  // defaults so every consumer always sees a complete profile.
  const defaults = createDefaultTrainingState(heyaId);
  state.heyaId = state.heyaId ?? heyaId;
  state.activeProfile = { ...defaults.activeProfile, ...(state.activeProfile ?? {}) };
  state.focusSlots = state.focusSlots ?? [];
  return state;
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

  const focusMapCache = new Map<Id, Map<Id, IndividualFocus>>();

  activeRikishi.forEach((rikishi) => {
    const beyaState = ensureHeyaTrainingState(world, rikishi.heyaId);
    const profile = beyaState.activeProfile;
    let focusMap = focusMapCache.get(rikishi.heyaId);
    if (!focusMap) {
      focusMap = new Map();
      for (const slot of beyaState.focusSlots) {
        if (!focusMap.has(slot.rikishiId)) focusMap.set(slot.rikishiId, slot);
      }
      focusMapCache.set(rikishi.heyaId, focusMap);
    }
    const individualFocus = focusMap.get(rikishi.id);

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
          weeksRemaining: BURNOUT_INJURY_WEEKS,
          weeksToHeal: BURNOUT_INJURY_WEEKS,
        };
        const crashPower = Math.max(
          CRASH_STAT_FLOOR,
          (rikishi.stats.power ?? 50) - CRASH_STAT_PENALTY
        );
        const crashStamina = Math.max(
          CRASH_STAT_FLOOR,
          (rikishi.stats.stamina ?? 50) - CRASH_STAT_PENALTY
        );
        // Stats object will be synced in the growth section if not injured,
        // but since we just injured them, we should sync here too.
        updates.stats = {
          ...(rikishi.stats || {}),
          power: Math.floor(crashPower),
          stamina: Math.floor(crashStamina),
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
      power: 0,
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
      drillVector.power += effects.power || 0;
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
        power:
          (growth.power + drillVector.power) * staffBonuses.conditioning * infra.statBuffs.power,
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
      const prevPower = rikishi.stats.power ?? 50;

      // Age-based decline (past peak, per attribute group)
      const decay = calculateAgeDecay(rikishi, world.year);

      // Apply Growth (net of age decay)
      // We cap at getEffectiveCeiling to ensure age-based decline is enforceable
      const newStats = { ...(rikishi.stats || {}) } as RikishiStats;

      newStats.power = Math.min(
        getEffectiveCeiling(rikishi, "power", world),
        Math.max(STAT_FLOOR, (rikishi.stats.power ?? 50) + finalGrowth.power + decay.power)
      );
      newStats.speed = Math.min(
        getEffectiveCeiling(rikishi, "speed", world),
        Math.max(STAT_FLOOR, (rikishi.stats.speed ?? 50) + finalGrowth.speed + decay.speed)
      );
      newStats.technique = Math.min(
        getEffectiveCeiling(rikishi, "technique", world),
        Math.max(
          STAT_FLOOR,
          (rikishi.stats.technique ?? 50) + finalGrowth.technique + decay.technique
        )
      );
      newStats.balance = Math.min(
        getEffectiveCeiling(rikishi, "balance", world),
        Math.max(STAT_FLOOR, (rikishi.stats.balance ?? 50) + finalGrowth.balance + decay.balance)
      );
      newStats.stamina = Math.min(
        getEffectiveCeiling(rikishi, "stamina", world),
        Math.max(STAT_FLOOR, (rikishi.stats.stamina ?? 50) + finalGrowth.stamina + decay.stamina)
      );
      newStats.adaptability = Math.min(
        getEffectiveCeiling(rikishi, "adaptability", world),
        Math.max(
          STAT_FLOOR,
          (rikishi.stats.adaptability ?? 50) + finalGrowth.adaptability + decay.adaptability
        )
      );
      newStats.mental = Math.min(
        getEffectiveCeiling(rikishi, "mental", world),
        Math.max(
          STAT_FLOOR,
          (rikishi.stats.mental ?? 50) +
            finalGrowth.mental * EXPERIENCE_GROWTH_MULTIPLIER +
            decay.mental
        )
      );

      // 4. Final Enforcements (Clamping & Stat Floors)
      (Object.keys(STAT_GROUP) as Array<keyof typeof STAT_GROUP>).forEach((key) => {
        const statsKey = key;
        const ceiling = getEffectiveCeiling(
          { ...rikishi, stats: newStats } as Rikishi,
          statsKey,
          world
        );
        let val = newStats[statsKey];

        // Enforce Ceiling
        val = Math.min(ceiling, val);

        // Enforce Elite Division Floors
        // This prevents the "Sumo Graveyard" effect where Makuuchi is filled with decayed jobbers.
        if (rikishi.division === "makuuchi") {
          val = Math.max(DIVISION_FLOOR_MAKUUCHI, val);
        } else if (rikishi.division === "juryo") {
          val = Math.max(DIVISION_FLOOR_JURYO, val);
        }

        newStats[statsKey] = val;
      });

      updates.stats = newStats;

      // Per-stat training attribution event
      const statKeys = Object.keys(STAT_GROUP) as Array<keyof typeof STAT_GROUP>;
      const deltas: Record<string, number> = {};
      for (const key of statKeys) {
        const prev = rikishi.stats?.[key] ?? 50;
        const next = newStats[key] ?? prev;
        const delta = Math.round((next - prev) * 100) / 100;
        if (Math.abs(delta) >= 0.05) {
          deltas[key] = delta;
        }
      }
      if (Object.keys(deltas).length > 0) {
        const shikona = rikishi.shikona || rikishi.name || "Unknown";
        const deltaParts = Object.entries(deltas).map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${v}`);
        builder.logEvent(
          "TRAINING_STAT_DELTA",
          "training",
          {
            rikishiId: rikishi.id,
            heyaId: rikishi.heyaId,
            shikona,
            status: profile.focus,
            intensity: profile.intensity,
            title: `${shikona} — Training Gains`,
            summary: deltaParts.join(", "),
            statDeltas: deltas,
          },
          { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "minor" }
        );
      }

      // Milestone Events (Threshold crossing)
      const currentPower = newStats.power;
      if (
        Math.floor(currentPower / TRAINING_MILESTONE_THRESHOLD) >
        Math.floor(prevPower / TRAINING_MILESTONE_THRESHOLD)
      ) {
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
  let crashProb = BURNOUT_PROB_WEEK_1;
  if (currentWeeks === 2) crashProb = BURNOUT_PROB_WEEK_2;
  if (currentWeeks >= CRASH_PROBABILITY_THRESHOLD_WEEKS) crashProb = MAX_CRASH_PROBABILITY;

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
import {
  BURNOUT_INJURY_WEEKS,
  CRASH_STAT_FLOOR,
  CRASH_STAT_PENALTY,
  STAT_FLOOR,
  DIVISION_FLOOR_MAKUUCHI,
  DIVISION_FLOOR_JURYO,
  TRAINING_MILESTONE_THRESHOLD,
  BURNOUT_PROB_WEEK_1,
  BURNOUT_PROB_WEEK_2,
} from "../../../constants/engine/training";
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

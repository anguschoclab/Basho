/**
 * weeklyTraining.ts
 * =================
 * Per-rikishi steps of the authoritative weekly training tick.
 * Extracted from applyWeeklyTraining — each step mutates the shared
 * `updates` bag and logs through the shared impact builder.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { HeyaTrainingState, IndividualFocus } from "../../types/training";
import type { Rikishi, RikishiStats } from "../../types/rikishi";
import type { CombatArchetype } from "../../types/combat";
import type { ImpactBuilder } from "../../core/ImpactBuilder";
import { EntityCollection } from "../../core/EntityCollection";
import { STAT_GROUP } from "../../../constants/engine/development";
import {
  calculateFatigueDelta,
  calculateGains,
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
import { InfrastructureService } from "../economy/InfrastructureService";
import { RNGRegistry } from "../../core/RNGRegistry";
import { ensureHeyaTrainingState } from "./TrainingService";

type RikishiUpdates = Partial<Rikishi>;
type FocusMapCache = Map<Id, Map<Id, IndividualFocus>>;

/**
 * Phase 5: Burnout Logic
 * Escalating risk curve for Prodigies at Extreme Intensity.
 * Tracks consecutive weeks of extreme training and rolls for burnout crash.
 *
 * Risk curve:
 * - Week 1: 15% crash probability
 * - Week 2: 35% crash probability
 * - Week 3+: 100% crash probability
 */
function applyBurnoutStep(
  r: Rikishi,
  intensity: string,
  world: WorldState
): { crashed: boolean; consecutiveWeeks: number } {
  if (intensity !== "punishing") {
    return { crashed: false, consecutiveWeeks: 0 };
  }

  const currentWeeks = (r.consecutiveExtremeWeeks || 0) + 1;

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

/** Resolve the per-heya focus map (cached) and this rikishi's focus slot. */
function resolveIndividualFocus(
  rikishi: Rikishi,
  beyaState: HeyaTrainingState,
  focusMapCache: FocusMapCache
): IndividualFocus | undefined {
  let focusMap = focusMapCache.get(rikishi.heyaId);
  if (!focusMap) {
    focusMap = new Map();
    for (const slot of beyaState.focusSlots) {
      if (!focusMap.has(slot.rikishiId)) focusMap.set(slot.rikishiId, slot);
    }
    focusMapCache.set(rikishi.heyaId, focusMap);
  }
  return focusMap.get(rikishi.id);
}

/** Step 1: fatigue delta from profile + focus, with the injured-recovery flip. */
function applyFatigueStep(
  rikishi: Rikishi,
  profile: HeyaTrainingState["activeProfile"],
  individualFocus: IndividualFocus | undefined,
  updates: RikishiUpdates
): boolean {
  const fatigueDelta = calculateFatigueDelta(profile, individualFocus);
  const focusType = individualFocus?.focusType;
  const isOnRecoveryFocus = focusType === "protect" || focusType === "rebuild";

  if (rikishi.injured && isOnRecoveryFocus) {
    // Recovery focus flips the delta: injured wrestlers on protect/rebuild shed fatigue
    updates.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) - Math.abs(fatigueDelta)));
  } else {
    updates.fatigue = Math.max(0, Math.min(100, (rikishi.fatigue || 0) + fatigueDelta));
  }
  return isOnRecoveryFocus;
}

/** Step 1b: emergent prodigy burnout — crisis event, injury, stat crash. */
function applyProdigyBurnout(
  rikishi: Rikishi,
  profile: HeyaTrainingState["activeProfile"],
  world: WorldState,
  updates: RikishiUpdates,
  builder: ImpactBuilder
) {
  if (!rikishi.injuryStatus?.isEmergentProdigy) return;

  const { crashed, consecutiveWeeks } = applyBurnoutStep(rikishi, profile.intensity, world);
  updates.consecutiveExtremeWeeks = consecutiveWeeks;
  if (!crashed) return;

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
  const crashPower = Math.max(CRASH_STAT_FLOOR, (rikishi.stats.power ?? 50) - CRASH_STAT_PENALTY);
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

type DrillVector = {
  power: number;
  speed: number;
  technique: number;
  balance: number;
  stamina: number;
  weight: number;
  mental: number;
  fatigue: number;
};

/** Step 2: aggregate the 6-day weekly drill plan into a stat vector. */
function aggregateDrillVector(beyaState: HeyaTrainingState, rikishi: Rikishi): DrillVector {
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

  const drillVector: DrillVector = {
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
  return drillVector;
}

/** Growth vector with staff bonuses, drill vector, and infrastructure buffs. */
function computeFinalGrowth(
  rikishi: Rikishi,
  profile: HeyaTrainingState["activeProfile"],
  individualFocus: IndividualFocus | undefined,
  drillVector: DrillVector,
  world: WorldState
) {
  const heya = EntityCollection.getHeya(world, rikishi.heyaId);
  const staffBonuses = getHeyaStaffBonuses(world, rikishi.heyaId);
  const infra = InfrastructureService.getHeyaBonuses(heya);

  // Use calculateGains (pipeline-friendly) for player heya rikishi when
  // activeModifiers are available from phase02_context. Fall back to
  // calculateGrowthVector for NPC heya (extracts modifiers from heya/world).
  const activeModifiers = world.transientContext?.activeModifiers;
  const isPlayerHeya = rikishi.heyaId === world.playerHeyaId;
  const growth =
    isPlayerHeya && activeModifiers
      ? calculateGains(rikishi, activeModifiers, profile, individualFocus, world.year)
      : calculateGrowthVector(profile, individualFocus, rikishi, heya, world);

  // Apply staff bonuses + Drill Vector + Infrastructure Buffs
  return {
    power: (growth.power + drillVector.power) * staffBonuses.conditioning * infra.statBuffs.power,
    speed: (growth.speed + drillVector.speed) * staffBonuses.conditioning * infra.statBuffs.speed,
    technique:
      (growth.technique + drillVector.technique) *
      staffBonuses.technique *
      infra.statBuffs.technique,
    balance:
      (growth.balance + drillVector.balance) * staffBonuses.conditioning * infra.statBuffs.balance,
    stamina:
      (growth.stamina + drillVector.stamina) * staffBonuses.conditioning * infra.statBuffs.stamina,
    adaptability: growth.adaptability * infra.statBuffs.adaptability,
    mental: (growth.mental + drillVector.mental) * staffBonuses.technique * infra.statBuffs.mental,
  };
}

/** Apply growth net of age decay, then clamp ceilings and division floors. */
function applyStatBounds(
  rikishi: Rikishi,
  finalGrowth: ReturnType<typeof computeFinalGrowth>,
  world: WorldState
): RikishiStats {
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
    Math.max(STAT_FLOOR, (rikishi.stats.technique ?? 50) + finalGrowth.technique + decay.technique)
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
    // Recover missing/corrupt values (e.g. aggression is never assigned
    // above; a wiped or partial stats object yields undefined/NaN here).
    if (typeof val !== "number" || !Number.isFinite(val)) val = 50;

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

  return newStats;
}

/** Per-stat attribution event + milestone threshold crossing. */
function emitGrowthEvents(
  rikishi: Rikishi,
  profile: HeyaTrainingState["activeProfile"],
  prevPower: number,
  newStats: RikishiStats,
  builder: ImpactBuilder
) {
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

/** Step 3: growth — skipped for injured rikishi (pre-existing or fresh burnout). */
function applyGrowthStep(
  rikishi: Rikishi,
  profile: HeyaTrainingState["activeProfile"],
  individualFocus: IndividualFocus | undefined,
  drillVector: DrillVector,
  world: WorldState,
  updates: RikishiUpdates,
  builder: ImpactBuilder
) {
  if (rikishi.injured || updates.injured) return;

  const finalGrowth = computeFinalGrowth(rikishi, profile, individualFocus, drillVector, world);

  // Pre-snapshot for milestone checks
  const prevPower = rikishi.stats.power ?? 50;

  const newStats = applyStatBounds(rikishi, finalGrowth, world);
  updates.stats = newStats;

  emitGrowthEvents(rikishi, profile, prevPower, newStats, builder);
}

/** Step 4: career archetype evolution + decline phase (age 30+). */
function applyArchetypeEvolution(
  rikishi: Rikishi,
  world: WorldState,
  updates: RikishiUpdates,
  builder: ImpactBuilder
) {
  const age = rikishi.age ?? world.year - rikishi.birthYear;
  const currentArchetype = rikishi.combatProfile?.archetype;
  const effectiveStats = (updates.stats ?? rikishi.stats) as RikishiStats;
  if (!currentArchetype || age < 30) return;

  const speedRatio = (effectiveStats.speed ?? 50) / Math.max(1, effectiveStats.power ?? 50);
  const techRatio = (effectiveStats.technique ?? 50) / Math.max(1, effectiveStats.power ?? 50);

  let newArchetype: CombatArchetype | null = null;
  // Speedsters that lose speed become defensive or hybrid
  if (currentArchetype === "speedster" && speedRatio < 0.75) {
    newArchetype = techRatio > 1.15 ? "defensive" : "hybrid";
  }
  // Oshi pushers that gain technique become hybrid
  else if (currentArchetype === "oshi" && techRatio > 1.25 && age >= 33) {
    newArchetype = "hybrid";
  }
  // Giants that lose power become defensive
  else if (currentArchetype === "giant" && (effectiveStats.power ?? 50) < 45 && age >= 34) {
    newArchetype = "defensive";
  }

  if (newArchetype && newArchetype !== currentArchetype) {
    const history = rikishi.archetypeHistory ?? [];
    const lastChange = history[history.length - 1];
    // Only evolve once per year
    if (!lastChange || lastChange.year !== world.year) {
      const newProfile = { ...rikishi.combatProfile, archetype: newArchetype };
      updates.combatProfile = newProfile;
      updates.archetypeHistory = [...history, { archetype: newArchetype, year: world.year }];
      builder.logEvent(
        "TRAINING_UPDATE",
        "training",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          shikona: rikishi.shikona || rikishi.name,
          status: "archetype_evolution",
          title: `${rikishi.shikona} — Style Evolution`,
          summary: `Evolved from ${currentArchetype} to ${newArchetype}`,
          oldArchetype: currentArchetype,
          newArchetype,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "notable" }
      );
    }
  }

  // Update decline phase (6.4)
  let declinePhase: "pre-peak" | "peak" | "early-decline" | "late-decline" | "twilight";
  if (age < 24) declinePhase = "pre-peak";
  else if (age < 28) declinePhase = "peak";
  else if (age < 32) declinePhase = "early-decline";
  else if (age < 36) declinePhase = "late-decline";
  else declinePhase = "twilight";
  if (rikishi.declinePhase !== declinePhase) {
    updates.declinePhase = declinePhase;
  }
}

/**
 * Run the full weekly pipeline for a single rikishi: focus resolution,
 * fatigue, prodigy burnout, drill aggregation, growth, archetype evolution.
 */
export function processRikishiWeekly(
  rikishi: Rikishi,
  world: WorldState,
  focusMapCache: FocusMapCache,
  builder: ImpactBuilder
) {
  const beyaState = ensureHeyaTrainingState(world, rikishi.heyaId);
  const profile = beyaState.activeProfile;
  const individualFocus = resolveIndividualFocus(rikishi, beyaState, focusMapCache);

  const updates: RikishiUpdates = {};

  const isOnRecoveryFocus = applyFatigueStep(rikishi, profile, individualFocus, updates);

  // Phase 5: Emergent Prodigy Burnout Check
  applyProdigyBurnout(rikishi, profile, world, updates, builder);

  // 2. Weekly Drill Plan (P2 Phase O)
  const drillVector = aggregateDrillVector(beyaState, rikishi);

  // Apply drill fatigue to the running total.
  // Skip for injured rikishi on recovery focus — they rest, not drill.
  if (!(rikishi.injured && isOnRecoveryFocus)) {
    updates.fatigue = Math.max(0, Math.min(100, (updates.fatigue || 0) + drillVector.fatigue));
  }

  // 3. Growth Logic (Skip if injured - either previously or from a fresh burnout)
  applyGrowthStep(rikishi, profile, individualFocus, drillVector, world, updates, builder);

  // Archetype evolution over career (2.3): detect significant stat shifts
  // and evolve the combat profile archetype accordingly
  applyArchetypeEvolution(rikishi, world, updates, builder);

  builder.updateRikishi(rikishi.id, updates);
}

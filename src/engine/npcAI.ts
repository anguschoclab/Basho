// npcAI.ts
// =======================================================
// NPC Manager AI Orchestrator (Canon A7/A8/A11)
// - Coordinates weekly, monthly, and yearly decision loops
// - Delegates persona and strategy logic to specialized services
// =======================================================

import { getOyakataStyleProfile } from "./oyakataStylePreferences";
import * as talentpool from "./systems/generation/TalentPoolService";
import type { WorldState } from "./types/world";
import type { OyakataArchetype, OyakataMood } from "./types/oyakata";
import type { Id } from "./types/common";
import { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "./types/training";
import { TrainingService } from "./systems/training/TrainingService";
import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "./overflow";
import { getOyakataForHeya, getRikishi, getHeya } from "./queries";
import { getAvailableStables } from "./selectors";
import { stableSort } from "./utils/sort";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

// Strategies & Personas
import { getFinanceStrategy } from "./npcFinanceStrategy";
import { getRecruitmentStrategy } from "./npcRecruitmentStrategy";
import { getRetirementStrategy } from "./npcRetirementStrategy";
import { getSponsorStrategy } from "./npcSponsorStrategy";
import { getGovernanceStrategy } from "./npcGovernanceStrategy";
import { getManagerPersona } from "./systems/NPCPersonaService";
export { getManagerPersona };

import {
  spawnTrainingWorker,
  spawnScoutingWorker,
  spawnPersonnelWorker,
  rpPerception,
  type TrainingWorkerContext,
  type ScoutingWorkerContext,
  type PersonnelWorkerContext,
} from "./npcAIWorkers";

/** Decision output for a single NPC heya per week */
export interface NPCWeeklyDecision {
  heyaId: Id;
  archetype: OyakataArchetype | "unknown";
  trainingIntensity: TrainingIntensity;
  trainingFocus: TrainingFocus;
  recovery: RecoveryEmphasis;
  scoutingPriority: "none" | "passive" | "active" | "aggressive";
  individualProtects: Id[];
  individualDevelops: Id[];
  individualPushes: Id[];
  reasoning: string[];
  mood?: OyakataMood;
  impact?: StateImpact;
}

/**
 * Core decision function for a single NPC-managed heya.
 * All inputs are banded (PerceptionSnapshot) — AI does not cheat (A7.1).
 */
export function makeNPCWeeklyDecision(world: WorldState, heyaId: Id): NPCWeeklyDecision {
  const persona = getManagerPersona(world, heyaId);
  const perception = persona.perception;
  const reasoning: string[] = [];

  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  const styleProfile = oyakata ? getOyakataStyleProfile(world, oyakata) : undefined;
  const philosophy = styleProfile?.philosophy;

  const complianceCap = heya?.welfareState?.sanctions?.trainingIntensityCap as
    | TrainingIntensity
    | undefined;

  // --- Phase 2: Hierarchical Delegation (Worker Agents) ---

  // 1. Training Worker (Isolated Context)
  const trainingCtx: TrainingWorkerContext = {
    perception: rpPerception(perception), // Isolated rikishi perception
    riskAppetite: persona.riskAppetite,
    welfareDiscipline: persona.welfareDiscipline,
    mood: persona.mood,
    complianceCap,
    philosophy,
    styleBias: persona.styleBias,
    tradition: persona.traits.tradition,
  };
  const trainingProposal = spawnTrainingWorker(trainingCtx);
  reasoning.push(...trainingProposal.reasoning);

  // 2. Scouting Worker (Isolated Context)
  const scoutingCtx: ScoutingWorkerContext = {
    runwayBand: perception.runwayBand,
    rosterSize: perception.rosterSize,
    rosterStrengthBand: perception.rosterStrengthBand,
    ambition: persona.traits.ambition,
    hasSleeperScout: persona.quirks.includes("Sleeper Scout"),
  };
  const scoutingProposal = spawnScoutingWorker(scoutingCtx);
  reasoning.push(scoutingProposal.reason);

  // 3. Personnel Worker (Isolated Context)
  const personnelCtx: PersonnelWorkerContext = {
    rikishiPerceptions: perception.rikishiPerceptions,
    welfareDiscipline: persona.welfareDiscipline,
    styleProfile,
    world, // Needed for getRikishi (limited read)
  };
  const personnelProposal = spawnPersonnelWorker(personnelCtx);
  reasoning.push(...personnelProposal.reasoning);

  // --- Phase 3: Lead Review (Alignment Check) ---
  // The Oyakata (Lead Agent) reviews worker proposals against memory/mood.
  if (persona.mood === "furious" && trainingProposal.trainingIntensity !== "punishing") {
    trainingProposal.trainingIntensity = "punishing";
    reasoning.push(
      "[Lead Review] Oyakata overrides: Ignoring worker caution, imposing punishing intensity due to fury."
    );
  }

  const builder = createImpactBuilder("makeNPCWeeklyDecision");

  // Apply withdrawal decisions
  for (const withdrawalId of personnelProposal.withdrawalIds) {
    const rikishi = getRikishi(world, withdrawalId);
    if (rikishi && rikishi.injured) {
      builder.updateRikishi(withdrawalId, {
        isKyujo: true,
        kyujoReason: "injury",
        medicalCertificate: {
          injury: rikishi.injuryStatus?.type || "unknown",
          severity: rikishi.injuryStatus?.severity || "moderate",
          treatmentWeeks: rikishi.injuryWeeksRemaining,
          submittedDate: world.calendar.currentWeek,
        },
      });
    }
  }

  return {
    heyaId,
    archetype: persona.archetype,
    trainingIntensity: trainingProposal.trainingIntensity,
    trainingFocus: trainingProposal.trainingFocus,
    recovery: trainingProposal.recovery,
    scoutingPriority: scoutingProposal.priority,
    individualProtects: personnelProposal.individualProtects,
    individualDevelops: personnelProposal.individualDevelops,
    individualPushes: personnelProposal.individualPushes,
    reasoning,
    mood: persona.mood,
    impact: builder.build(),
  };
}

/**
 * Phase 1: Background Consolidation
 * Implements Directives: "Skeptical Memory" & "Background Consolidation"
 * Merges current perception with Oyakata's internal memory buffer.
 * Returns StateImpact describing memory consolidation instead of mutating directly.
 */
export function consolidateOyakataMemory(
  world: WorldState,
  heyaId: Id,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Perception object with dynamic properties
  perception: any
): StateImpact {
  const builder = createImpactBuilder("consolidateOyakataMemory");
  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  if (!oyakata) return builder.build();

  const existingMemory = oyakata.memory || {
    observations: [],
    coreDirectives: [
      `Maintain the excellence of ${heya?.name}`,
      `Prioritize ${oyakata.archetype} values`,
    ],
    lastConsolidationTick: world.week,
  };

  const memory = { ...existingMemory };
  const tick = world.week;

  // Skeptical Check: Does current perception conflict with previous mood/state?
  if (
    perception.moraleBand === "mutinous" &&
    oyakata.mood !== "furious" &&
    oyakata.mood !== "anxious"
  ) {
    memory.observations = [
      ...memory.observations,
      {
        tick,
        type: "alignment",
        summary: `Unexpected morale collapse detected. Current banding (${perception.moraleBand}) conflicts with established mood (${oyakata.mood}).`,
        importance: 8,
      },
    ];
  }

  // Record key perception snapshots
  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    memory.observations = [
      ...memory.observations,
      {
        tick,
        type: "perception",
        summary: `Financial runway is ${perception.runwayBand}. Consolidation required to prevent insolvency.`,
        importance: 10,
      },
    ];
  }

  // Prune noise (Limit to 10 observations per Canon Directive)
  if (memory.observations.length > 10) {
    memory.observations.sort((a, b) => b.importance - a.importance);
    memory.observations = memory.observations.slice(0, 10);
  }

  memory.lastConsolidationTick = tick;

  // Note: oyakata updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as oyakata is a Map, not a standard entity
  // This will be migrated in a future update when ImpactBuilder is extended
  oyakata.memory = memory;

  return builder.build();
}

/**
 * Writes a decision into the world state (training profile + individual focus slots).
 * Returns StateImpact describing decision application instead of mutating directly.
 */
export function applyNPCDecision(world: WorldState, decision: NPCWeeklyDecision): StateImpact {
  const builder = createImpactBuilder("applyNPCDecision");
  const state = TrainingService.ensureHeyaTrainingState(world, decision.heyaId);

  const newActiveProfile = {
    ...state.activeProfile,
    intensity: decision.trainingIntensity,
    focus: decision.trainingFocus,
    recovery: decision.recovery,
  };

  const allManagedIds = new Set([
    ...decision.individualProtects,
    ...decision.individualPushes,
    ...decision.individualDevelops,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Focus slot object with dynamic properties
  const existingFocus = state.focusSlots.filter((f: any) => !allManagedIds.has(f.rikishiId));

  const protectSlots = decision.individualProtects.map((id) => ({
    rikishiId: id,
    focusType: "protect" as const,
  }));
  const pushSlots = decision.individualPushes.map((id) => ({
    rikishiId: id,
    focusType: "push" as const,
  }));
  const developSlots = decision.individualDevelops.map((id) => ({
    rikishiId: id,
    focusType: "develop" as const,
  }));

  const newFocusSlots = [...existingFocus, ...protectSlots, ...pushSlots, ...developSlots];

  // Note: trainingState updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as trainingState is a nested state
  // This will be migrated in a future update when ImpactBuilder is extended
  state.activeProfile = newActiveProfile;
  state.focusSlots = newFocusSlots;

  return builder.build();
}

/**
 * NPC Manager AI weekly decision loop
 * Returns StateImpact describing weekly NPC decisions instead of mutating directly.
 */
export function tickWeekNPC(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekNPC");

  const playerHeyaId = world.playerHeyaId;

  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    // Phase 1: Hierarchical Delegation (Decision Logic)
    const decision = makeNPCWeeklyDecision(world, heya.id);

    applyNPCDecision(world, decision);

    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
    const oldMood = oyakata?.mood ?? "content";
    const newMood = decision.mood;

    if (oyakata && newMood && newMood !== oldMood) {
      // Note: oyakata updates are not directly supported by ImpactBuilder yet
      // For now, we'll update them directly as oyakata is a Map, not a standard entity
      oyakata.mood = newMood;

      builder.logEvent(
        "OYAKATA_MOOD_SHIFT",
        "narrative",
        { oldMood, newMood },
        { heyaId: heya.id }
      );
    }

    scoutingMap[heya.id] = decision.scoutingPriority;

    builder.logEvent(
      "NPC_MANAGER_DECISION",
      "narrative",
      {
        archetype: decision.archetype,
        intensity: decision.trainingIntensity,
        focus: decision.trainingFocus,
        recovery: decision.recovery,
        scouting: decision.scoutingPriority,
        protectedCount: decision.individualProtects.length,
        reasoningLog: decision.reasoning.join(" | "),
      },
      {
        heyaId: heya.id,
        importance:
          decision.trainingIntensity === "punishing" ||
          decision.trainingIntensity === "conservative"
            ? "notable"
            : "minor",
      }
    );

    if (decision.trainingIntensity === "punishing") {
      builder.logEvent(
        "NARRATIVE_STRATEGY_SHIFT",
        "narrative",
        { intensity: "punishing", reasoning: decision.reasoning[0] },
        { heyaId: heya.id }
      );
    }
  }

  // Note: npcScoutingPriorities is not a supported world field in ImpactBuilder, so we update it directly
  world.npcScoutingPriorities = scoutingMap;
  enforceHardCapRosterOverflow(world);

  return builder.build();
}

/**
 * NPC Manager AI monthly decision loop
 * Returns StateImpact describing monthly NPC decisions instead of mutating directly.
 */
export function tickMonthlyNPC(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMonthlyNPC");

  if (world.myosekiMarket) {
    const candidateHeyas = getAvailableStables(world).filter(
      (h) => h.id !== world.playerHeyaId && world.oyakata.has(h.oyakataId)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stable sort callback with dynamic object types
    for (const heya of stableSort(candidateHeyas, (x: any) => (x as any).id || String(x))) {
      const oyakata = world.oyakata.get(heya.oyakataId);
      if (!oyakata) continue;
      const financeStrat = getFinanceStrategy(oyakata.archetype);
      financeStrat.evaluateFinances(world, heya as import("./types/heya").Heya, oyakata);

      const sponsorStrat = getSponsorStrategy(oyakata.archetype);
      sponsorStrat.evaluateSponsorRecruitment(world, heya as import("./types/heya").Heya, oyakata);
    }
  }

  const vacanciesByHeyaId: Record<Id, number> = {};
  let hasVacancies = false;

  const candidateHeyas2 = getAvailableStables(world).filter(
    (h) => h.id !== world.playerHeyaId && world.oyakata.has(h.oyakataId)
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stable sort callback with dynamic object types
  for (const heya of stableSort(candidateHeyas2, (x: any) => (x as any).id || String(x))) {
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (!oyakata) continue;

    const retirementStrat = getRetirementStrategy(oyakata.archetype);
    retirementStrat.evaluateRetirements(world, heya as import("./types/heya").Heya, oyakata);

    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    const vacancies = recruitmentStrat.evaluateVacancies(
      world,
      heya as import("./types/heya").Heya,
      oyakata
    );

    const governanceStrat = getGovernanceStrategy(oyakata.archetype);
    governanceStrat.evaluateGovernanceDecisions(
      world,
      heya as import("./types/heya").Heya,
      oyakata
    );

    if (vacancies > 0) {
      vacanciesByHeyaId[heya.id] = vacancies;
      hasVacancies = true;
    }
  }

  if (hasVacancies) {
    const globalCap =
      world.heyas.size * (typeof HARD_CAP_ROSTER_SIZE === "number" ? HARD_CAP_ROSTER_SIZE : 30);
    if (world.rikishi.size < globalCap) {
      // Use competitive bidding system for NPC recruitment
      talentpool.fillVacanciesForNPCWithBidding(world, vacanciesByHeyaId);
    }
  }

  return builder.build();
}

/**
 * NPC Manager AI yearly decision loop
 * Returns StateImpact describing yearly NPC decisions instead of mutating directly.
 */
export function tickYear(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickYear");

  for (const heya of getAvailableStables(world)) {
    if (heya.id === world.playerHeyaId) continue;
    const persona = getManagerPersona(world, heya.id);

    if (persona.traits.ambition > 70 && persona.perception.rosterStrengthBand === "weak") {
      builder.logEvent(
        "NPC_MANAGER_DECISION",
        "narrative",
        {
          year: world.calendar.year,
          strategy: "rebuild",
          ambition: persona.traits.ambition,
        },
        { heyaId: heya.id, importance: "minor" }
      );
    }
  }

  return builder.build();
}

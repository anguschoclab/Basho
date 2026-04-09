// npcAI.ts
// =======================================================
// NPC Manager AI Orchestrator (Canon A7/A8/A11)
// - Coordinates weekly, monthly, and yearly decision loops
// - Delegates persona and strategy logic to specialized services
// =======================================================

import { rngForWorld } from "./rng";
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
import { EventBus } from "./events";

// Strategies & Personas
import { getFinanceStrategy } from "./npcFinanceStrategy";
import { getRecruitmentStrategy } from "./npcRecruitmentStrategy";
import { getRetirementStrategy } from "./npcRetirementStrategy";
import { getManagerPersona } from "./systems/NPCPersonaService";
export { getManagerPersona };

import { 
  decideTrainingIntensity, 
  decideTrainingFocus, 
  decideRecovery, 
  decideScoutingPriority, 
  identifyProtects 
} from "./strategy/NPCStrategyService";

import { buildPerceptionSnapshot } from "./perception";

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

  const complianceCap = heya?.welfareState?.sanctions?.trainingIntensityCap as TrainingIntensity | undefined;

  // --- Phase 2: Hierarchical Delegation (Worker Agents) ---
  
  // 1. Training Worker (Isolated Context)
  const trainingProposal = spawnTrainingWorker({
    perception: rpPerception(perception), // Isolated rikishi perception
    riskAppetite: persona.riskAppetite,
    welfareDiscipline: persona.welfareDiscipline,
    mood: persona.mood,
    complianceCap,
    philosophy,
    styleBias: persona.styleBias,
    tradition: persona.traits.tradition
  });
  reasoning.push(...trainingProposal.reasoning);

  // 2. Scouting Worker (Isolated Context)
  const scoutingProposal = spawnScoutingWorker({
    runwayBand: perception.runwayBand,
    rosterSize: perception.rosterSize,
    rosterStrengthBand: perception.rosterStrengthBand,
    ambition: persona.traits.ambition,
    hasSleeperScout: persona.quirks.includes("Sleeper Scout")
  });
  reasoning.push(scoutingProposal.reason);

  // 3. Personnel Worker (Isolated Context)
  const personnelProposal = spawnPersonnelWorker({
    rikishiPerceptions: perception.rikishiPerceptions,
    welfareDiscipline: persona.welfareDiscipline,
    styleProfile,
    world // Needed for getRikishi (limited read)
  });
  reasoning.push(...personnelProposal.reasoning);

  // --- Phase 3: Lead Review (Alignment Check) ---
  // The Oyakata (Lead Agent) reviews worker proposals against memory/mood.
  if (persona.mood === 'furious' && trainingProposal.trainingIntensity !== 'punishing') {
    trainingProposal.trainingIntensity = 'punishing';
    reasoning.push("[Lead Review] Oyakata overrides: Ignoring worker caution, imposing punishing intensity due to fury.");
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
    mood: persona.mood
  };
}

/** Worker: Training Sub-Agent */
function spawnTrainingWorker(ctx: any) {
  const intensity = decideTrainingIntensity(
    ctx.perception, ctx.riskAppetite, ctx.welfareDiscipline, ctx.mood, ctx.complianceCap, ctx.philosophy
  );
  const focus = decideTrainingFocus(
    ctx.perception, ctx.styleBias, ctx.tradition, ctx.philosophy
  );
  const recovery = decideRecovery(ctx.perception, ctx.welfareDiscipline);
  
  return {
    trainingIntensity: intensity.intensity,
    trainingFocus: focus.focus,
    recovery: recovery.recovery,
    reasoning: [`[Training Worker] ${intensity.reason}`, `[Focus Worker] ${focus.reason}`, `[Recovery Worker] ${recovery.reason}`]
  };
}

/** Worker: Scouting Sub-Agent */
function spawnScoutingWorker(ctx: any) {
  const decision = decideScoutingPriority(
    { runwayBand: ctx.runwayBand, rosterSize: ctx.rosterSize, rosterStrengthBand: ctx.rosterStrengthBand } as any,
    ctx.ambition, 
    ctx.hasSleeperScout
  );
  return {
    priority: decision.priority,
    reason: `[Scouting Worker] ${decision.reason}`
  };
}

/** Worker: Personnel Sub-Agent */
function spawnPersonnelWorker(ctx: any) {
  const reasoning: string[] = [];
  const protectDecision = identifyProtects(ctx as any, ctx.welfareDiscipline);
  if (protectDecision.protectIds.length > 0) {
    reasoning.push(`[Personnel Worker] ${protectDecision.reason}`);
  }

  const individualDevelops: Id[] = [];
  const individualPushes: Id[] = [];
  const protectedSet = new Set(protectDecision.protectIds);

  if (ctx.styleProfile && ctx.rikishiPerceptions.length > 0) {
    for (const rp of ctx.rikishiPerceptions) {
      if (protectedSet.has(rp.rikishiId)) continue;
      const rikishi = getRikishi(ctx.world, rp.rikishiId);
      if (!rikishi) continue;

      const matchesStyle = ctx.styleProfile.preferredStyle === "any" || rikishi.style === ctx.styleProfile.preferredStyle;
      const matchesArchetype = (ctx.styleProfile.preferredArchetypes as string[]).includes(rikishi.archetype);

      if (matchesArchetype && matchesStyle) {
        if ((rp.healthBand === "peak" || rp.healthBand === "good") && (ctx.styleProfile.philosophy === "style_purist" || ctx.styleProfile.philosophy === "size_matters")) {
          individualPushes.push(rp.rikishiId);
        } else if (rp.healthBand === "peak" || rp.healthBand === "good") {
          individualDevelops.push(rp.rikishiId);
        }
      } else if (matchesArchetype || matchesStyle) {
        individualDevelops.push(rp.rikishiId);
      }
    }
    individualPushes.splice(3);
    individualDevelops.splice(5);

    if (individualPushes.length > 0) {
      reasoning.push(`[Personnel Worker] Philosophy push: ${individualPushes.length} wrestlers`);
    }
  }

  return {
    protectIds: protectDecision.protectIds,
    individualProtects: protectDecision.protectIds,
    individualDevelops,
    individualPushes,
    reasoning
  };
}

/** Helper: Isolated perception view */
function rpPerception(p: any) {
  return {
    rikishiPerceptions: p.rikishiPerceptions,
    welfareRiskBand: p.welfareRiskBand,
    rosterSize: p.rosterSize,
    moraleBand: p.moraleBand,
    rosterStrengthBand: p.rosterStrengthBand
  };
}

/**
 * Phase 1: Background Consolidation
 * Implements Directives: "Skeptical Memory" & "Background Consolidation"
 * Merges current perception with Oyakata's internal memory buffer.
 */
export function consolidateOyakataMemory(world: WorldState, heyaId: Id, perception: any): void {
  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  if (!oyakata) return;

  if (!oyakata.memory) {
    oyakata.memory = {
      observations: [],
      coreDirectives: [`Maintain the excellence of ${heya?.name}`, `Prioritize ${oyakata.archetype} values`],
      lastConsolidationTick: world.week
    };
  }

  const memory = oyakata.memory;
  const tick = world.week;

  // Skeptical Check: Does current perception conflict with previous mood/state?
  if (perception.moraleBand === 'mutinous' && oyakata.mood !== 'furious' && oyakata.mood !== 'anxious') {
    memory.observations.push({
      tick,
      type: 'alignment',
      summary: `Unexpected morale collapse detected. Current banding (${perception.moraleBand}) conflicts with established mood (${oyakata.mood}).`,
      importance: 8
    });
  }

  // Record key perception snapshots
  if (perception.runwayBand === 'desperate' || perception.runwayBand === 'critical') {
    memory.observations.push({
      tick,
      type: 'perception',
      summary: `Financial runway is ${perception.runwayBand}. Consolidation required to prevent insolvency.`,
      importance: 10
    });
  }

  // Prune noise (Limit to 10 observations per Canon Directive)
  if (memory.observations.length > 10) {
    memory.observations.sort((a, b) => b.importance - a.importance);
    memory.observations = memory.observations.slice(0, 10);
  }

  memory.lastConsolidationTick = tick;
}

/**
 * Writes a decision into the world state (training profile + individual focus slots).
 */
export function applyNPCDecision(world: WorldState, decision: NPCWeeklyDecision): void {
  const state = TrainingService.ensureHeyaTrainingState(world, decision.heyaId);

  state.activeProfile = {
    ...state.activeProfile,
    intensity: decision.trainingIntensity,
    focus: decision.trainingFocus,
    recovery: decision.recovery
  };

  const allManagedIds = new Set([
    ...decision.individualProtects,
    ...decision.individualPushes,
    ...decision.individualDevelops,
  ]);

  const existingFocus = state.focusSlots.filter((f: any) => !allManagedIds.has(f.rikishiId));

  const protectSlots = decision.individualProtects.map(id => ({
    rikishiId: id, focusType: "protect" as const
  }));
  const pushSlots = decision.individualPushes.map(id => ({
    rikishiId: id, focusType: "push" as const
  }));
  const developSlots = decision.individualDevelops.map(id => ({
    rikishiId: id, focusType: "develop" as const
  }));

  state.focusSlots = [...existingFocus, ...protectSlots, ...pushSlots, ...developSlots];
}

/**
 * NPC Manager AI weekly decision loop
 */
export function tickWeekNPC(world: WorldState): number {

  const playerHeyaId = world.playerHeyaId;
  let decisionsApplied = 0;

  if (!world.npcScoutingPriorities) world.npcScoutingPriorities = {};
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    // Phase 1: Context & Perception
    const perception = buildPerceptionSnapshot(world, heya.id);
    
    // Phase 2: Background Consolidation (Skeptical Memory)
    consolidateOyakataMemory(world, heya.id, perception);

    // Phase 3: Hierarchical Delegation (Decision Logic)
    const decision = makeNPCWeeklyDecision(world, heya.id);

    applyNPCDecision(world, decision);
    decisionsApplied++;

    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
    const oldMood = oyakata?.mood ?? "content";
    const newMood = decision.mood;

    if (oyakata && newMood) {
      oyakata.mood = newMood;
    }

    if (oldMood !== newMood) {
      EventBus.oyakataMoodShift(world, heya.id, { oldMood, newMood });
    }

    scoutingMap[heya.id] = decision.scoutingPriority;

    EventBus.managementDecision(world, heya.id, {
      archetype: decision.archetype,
      intensity: decision.trainingIntensity,
      focus: decision.trainingFocus,
      recovery: decision.recovery,
      scouting: decision.scoutingPriority,
      protectedCount: decision.individualProtects.length,
      reasoningLog: decision.reasoning.join(" | ")
    }, decision.trainingIntensity === "punishing" || decision.trainingIntensity === "conservative" ? "notable" : "minor");

    if (decision.trainingIntensity === "punishing") {
       EventBus.strategyShift(world, heya.id, { intensity: "punishing", reasoning: decision.reasoning[0] });
    }
  }

  world.npcScoutingPriorities = scoutingMap;
  enforceHardCapRosterOverflow(world);

  return decisionsApplied;
}

/**
 * NPC Manager AI monthly decision loop
 */
export function tickMonthlyNPC(world: WorldState): void {

  if (world.myosekiMarket) {
    const candidateHeyas = getAvailableStables(world).filter(h => h.id !== world.playerHeyaId && world.oyakata.has(h.oyakataId));
    for (const heya of stableSort(candidateHeyas, (x: any) => (x as any).id || String(x))) {
      const oyakata = world.oyakata.get(heya.oyakataId)!;
      const financeStrat = getFinanceStrategy(oyakata.archetype);
      financeStrat.evaluateFinances(world, heya as import("./types/heya").Heya, oyakata);
    }
  }

  const vacanciesByHeyaId: Record<Id, number> = {};
  let hasVacancies = false;

  const candidateHeyas2 = getAvailableStables(world).filter(h => h.id !== world.playerHeyaId && world.oyakata.has(h.oyakataId));
  for (const heya of stableSort(candidateHeyas2, (x: any) => (x as any).id || String(x))) {
    const oyakata = world.oyakata.get(heya.oyakataId)!;

    const retirementStrat = getRetirementStrategy(oyakata.archetype);
    retirementStrat.evaluateRetirements(world, heya as import("./types/heya").Heya, oyakata);

    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    const vacancies = recruitmentStrat.evaluateVacancies(world, heya as import("./types/heya").Heya, oyakata);
    
    if (vacancies > 0) {
      vacanciesByHeyaId[heya.id] = vacancies;
      hasVacancies = true;
    }
  }

  if (hasVacancies) {
    const globalCap = world.heyas.size * (typeof HARD_CAP_ROSTER_SIZE === 'number' ? HARD_CAP_ROSTER_SIZE : 30);
    if (world.rikishi.size < globalCap) {
      talentpool.fillVacanciesForNPC(world, vacanciesByHeyaId);
    }
  }
}

/**
 * NPC Manager AI yearly decision loop
 */
export function tickYear(world: WorldState): void {
  for (const heya of getAvailableStables(world)) {
    if (heya.id === world.playerHeyaId) continue;
    const persona = getManagerPersona(world, heya.id);
    
    if (persona.traits.ambition > 70 && persona.perception.rosterStrengthBand === "weak") {
       EventBus.managementDecision(world, heya.id, { 
          year: world.calendar.year, 
          strategy: "rebuild", 
          ambition: persona.traits.ambition 
       }, "minor");
    }
  }
}

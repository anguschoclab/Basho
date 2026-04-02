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
import { ensureHeyaTrainingState } from "./training";
import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "./overflow";
import { getOyakataForHeya, getRikishi, getHeya } from "./queries";
import { getAvailableStables } from "./selectors";
import { stableSort } from "./utils/sort";
import { logEngineEvent } from "./events";

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

  const intensityDecision = decideTrainingIntensity(
    perception, persona.riskAppetite, persona.welfareDiscipline, persona.mood, complianceCap, philosophy
  );
  reasoning.push(`[Training] ${intensityDecision.reason}`);

  const focusDecision = decideTrainingFocus(
    perception, persona.styleBias, persona.traits.tradition, philosophy
  );
  reasoning.push(`[Focus] ${focusDecision.reason}`);

  const recoveryDecision = decideRecovery(perception, persona.welfareDiscipline);
  reasoning.push(`[Recovery] ${recoveryDecision.reason}`);

  const hasSleeperScout = persona.quirks.includes("Sleeper Scout");
  const scoutingDecision = decideScoutingPriority(
    perception, persona.traits.ambition, hasSleeperScout
  );
  reasoning.push(`[Scouting] ${scoutingDecision.reason}`);

  const protectDecision = identifyProtects(perception, persona.welfareDiscipline);
  if (protectDecision.protectIds.length > 0) {
    reasoning.push(`[Protect] ${protectDecision.reason}`);
  }

  const individualDevelops: Id[] = [];
  const individualPushes: Id[] = [];
  const protectedSet = new Set(protectDecision.protectIds);

  if (styleProfile && perception.rikishiPerceptions.length > 0) {
    for (const rp of perception.rikishiPerceptions) {
      if (protectedSet.has(rp.rikishiId)) continue;
      const rikishi = getRikishi(world, rp.rikishiId);
      if (!rikishi) continue;

      const matchesStyle = styleProfile.preferredStyle === "any" || rikishi.style === styleProfile.preferredStyle;
      const matchesArchetype = (styleProfile.preferredArchetypes as string[]).includes(rikishi.archetype);


      if (matchesArchetype && matchesStyle) {
        if ((rp.healthBand === "peak" || rp.healthBand === "good") && (philosophy === "style_purist" || philosophy === "size_matters")) {
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
      reasoning.push(`[Philosophy] Pushing ${individualPushes.length} wrestler(s) matching ${styleProfile.description.split(".")[0]}`);
    }
    if (individualDevelops.length > 0) {
      reasoning.push(`[Philosophy] Developing ${individualDevelops.length} wrestler(s) aligned with philosophy`);
    }
  }

  return {
    heyaId,
    archetype: persona.archetype,
    trainingIntensity: intensityDecision.intensity,
    trainingFocus: focusDecision.focus,
    recovery: recoveryDecision.recovery,
    scoutingPriority: scoutingDecision.priority,
    individualProtects: protectDecision.protectIds,
    individualDevelops,
    individualPushes,
    reasoning,
    mood: persona.mood
  };
}

/**
 * Writes a decision into the world state (training profile + individual focus slots).
 */
export function applyNPCDecision(world: WorldState, decision: NPCWeeklyDecision): void {
  const state = ensureHeyaTrainingState(world, decision.heyaId);

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

  const existingFocus = state.focusSlots.filter(f => !allManagedIds.has(f.rikishiId));

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

    const decision = makeNPCWeeklyDecision(world, heya.id);

    applyNPCDecision(world, decision);
    decisionsApplied++;

    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
    const oldMood = oyakata?.mood ?? "neutral";
    const newMood = decision.mood;

    if (oyakata && newMood) {
      oyakata.mood = newMood;
    }

    if (oldMood !== newMood) {
      logEngineEvent(world, {
        type: "OYAKATA_MOOD_SHIFT",
        category: "narrative",
        importance: "major",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} Oyakata is ${newMood}`,
        summary: `The master of ${heya.name} is now feeling ${newMood}.`,
        data: { oldMood, newMood }
      });
    }

    scoutingMap[heya.id] = decision.scoutingPriority;

    logEngineEvent(world, {
      type: "NPC_MANAGER_DECISION",
      category: "training",
      importance: decision.trainingIntensity === "punishing" || decision.trainingIntensity === "conservative" ? "notable" : "minor",
      scope: "heya",
      heyaId: heya.id,
      title: `${heya.name} Internal Strategy`,
      summary: decision.reasoning[0] || "Weekly training plan updated",
      data: {
        archetype: decision.archetype,
        intensity: decision.trainingIntensity,
        focus: decision.trainingFocus,
        recovery: decision.recovery,
        scouting: decision.scoutingPriority,
        protectedCount: decision.individualProtects.length,
        reasoningLog: decision.reasoning.join(" | ")
      }
    });

    if (decision.trainingIntensity === "punishing") {
       logEngineEvent(world, {
          type: "NARRATIVE_STRATEGY_SHIFT",
          category: "narrative",
          importance: "major",
          scope: "world",
          heyaId: heya.id,
          title: `Drastic measures at ${heya.name}`,
          summary: `Reports suggest ${heya.name} has moved to an extremely punishing training cycle, seeking a breakthrough.`,
          data: { intensity: "punishing", reasoning: decision.reasoning[0] }
       });
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
    for (const heya of stableSort(candidateHeyas, x => (x as any).id || String(x))) {
      const oyakata = world.oyakata.get(heya.oyakataId)!;
      const financeStrat = getFinanceStrategy(oyakata.archetype);
      financeStrat.evaluateFinances(world, heya as import("./types/heya").Heya, oyakata);
    }
  }

  const vacanciesByHeyaId: Record<Id, number> = {};
  let hasVacancies = false;

  const candidateHeyas2 = getAvailableStables(world).filter(h => h.id !== world.playerHeyaId && world.oyakata.has(h.oyakataId));
  for (const heya of stableSort(candidateHeyas2, x => (x as any).id || String(x))) {
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
       logEngineEvent(world, {
           type: "NPC_YEARLY_STRATEGY",
           category: "narrative",
           importance: "minor",
           scope: "heya",
           heyaId: heya.id,
           title: `${heya.name || heya.id} declares rebuilding year`,
           summary: `The ambitious master of ${heya.name || heya.id} is dissatisfied with the roster's strength and has mandated a strict rebuilding phase for ${world.calendar.year}.`,
           data: { year: world.calendar.year, strategy: "rebuild" }
       });
    }
  }
}

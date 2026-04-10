/**
 * phase01_week_npc_ai.ts
 * =======================
 * Pipeline Phase: NPC Management AI.
 * 
 * Responsibilities:
 * 1. Build perception snapshots for all NPC stables.
 * 2. Consolidate oyakata memory.
 * 3. Run decision workers (Training, Scouting, Personnel).
 * 4. Apply management decisions purely to the world state.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { 
  getAvailableStables, 
} from "../../selectors";
import { 
  buildPerceptionSnapshot 
} from "../../perception";
import {
  makeNPCWeeklyDecision,
} from "../../npcAI";
import { TrainingService } from "../../systems/training/TrainingService";
import { EventBus } from "../../events";
import { enforceHardCapRosterOverflow } from "../../overflow";

export function phase01_week_npc_ai(world: WorldState): WorldState {
  // Authorization: trainingState is now a Map per RC stabilization plan.
  const nextTrainingStates = new Map(world.trainingState || []);
  const nextOyakata = new Map(world.oyakata);
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};
  const playerHeyaId = world.playerHeyaId;

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    // 1. Context & Perception
    const perception = buildPerceptionSnapshot(world, heya.id);
    
    // 2. Memory Consolidation (Purely updating oyakata memory)
    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
    if (oyakata) {
      const nextOya = { ...oyakata };
      consolidateOyakataMemoryPure(world, nextOya, perception);
      
      // 3. Decision Logic
      const decision = makeNPCWeeklyDecision(world, heya.id);

      // 4. Apply Decisions Purely
      applyNPCDecisionPure(world, nextTrainingStates, decision);

      const oldMood = nextOya.mood ?? "content";
      const newMood = decision.mood;
      if (newMood) nextOya.mood = newMood;

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

      nextOyakata.set(nextOya.id, nextOya);
    }
  }

  let nextWorld: WorldState = {
    ...world,
    trainingState: nextTrainingStates as any,
    oyakata: nextOyakata,
    npcScoutingPriorities: scoutingMap
  };

  // 5. Finalize Roster Integrity
  // Note: hard cap overflow might mutate, but we'll assume it handles maps correctly or we'll wrap it
  nextWorld = enforceHardCapRosterOverflow(nextWorld);

  return nextWorld;
}

function consolidateOyakataMemoryPure(world: WorldState, oyakata: any, perception: any): void {
  if (!oyakata.memory) {
    oyakata.memory = {
      observations: [],
      coreDirectives: [`Maintain the excellence of stable`, `Prioritize ${oyakata.archetype} values`],
      lastConsolidationTick: world.week
    };
  }

  const memory = { ...oyakata.memory };
  memory.observations = [...memory.observations];
  const tick = world.week;

  if (perception.moraleBand === 'mutinous' && oyakata.mood !== 'furious' && oyakata.mood !== 'anxious') {
    memory.observations.push({
      tick,
      type: 'alignment',
      summary: `Unexpected morale collapse detected.`,
      importance: 8
    });
  }

  if (perception.runwayBand === 'desperate' || perception.runwayBand === 'critical') {
    memory.observations.push({
      tick,
      type: 'perception',
      summary: `Financial runway is ${perception.runwayBand}.`,
      importance: 10
    });
  }

  if (memory.observations.length > 10) {
    memory.observations.sort((a, b) => b.importance - a.importance);
    memory.observations = memory.observations.slice(0, 10);
  }

  memory.lastConsolidationTick = tick;
  oyakata.memory = memory;
}

function applyNPCDecisionPure(world: WorldState, nextTrainingStates: Map<Id, any>, decision: any): void {
  const state = TrainingService.ensureHeyaTrainingState(world, decision.heyaId);
  const nextState = { ...state };

  nextState.activeProfile = {
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

  const protectSlots = decision.individualProtects.map((id: string) => ({
    rikishiId: id, focusType: "protect" as const
  }));
  const pushSlots = decision.individualPushes.map((id: string) => ({
    rikishiId: id, focusType: "push" as const
  }));
  const developSlots = decision.individualDevelops.map((id: string) => ({
    rikishiId: id, focusType: "develop" as const
  }));

  nextState.focusSlots = [...existingFocus, ...protectSlots, ...pushSlots, ...developSlots];
  nextTrainingStates.set(decision.heyaId, nextState);
}

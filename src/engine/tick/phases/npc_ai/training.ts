/**
 * training.ts
 * ===========
 * NPC AI training state application.
 * Extracted from phase01_week_npc_ai.ts for modularity.
 */

import type { WorldState } from "../../../types/world";
import type { Id } from "../../../types/common";
import type { NPCWeeklyDecision } from "../../../npcAI";
import { TrainingService } from "../../../training";
import type { HeyaTrainingState } from "../../../types/training";

export function applyNPCDecisionPure(
  world: WorldState,
  nextTrainingStates: Map<Id, HeyaTrainingState>,
  decision: NPCWeeklyDecision
): void {
  const state = TrainingService.ensureHeyaTrainingState(world, decision.heyaId);
  const nextState = { ...state };

  nextState.activeProfile = {
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

  const existingFocus = state.focusSlots.filter((f) => !allManagedIds.has(f.rikishiId));

  const protectSlots = decision.individualProtects.map((id: string) => ({
    rikishiId: id,
    focusType: "protect" as const,
  }));
  const pushSlots = decision.individualPushes.map((id: string) => ({
    rikishiId: id,
    focusType: "push" as const,
  }));
  const developSlots = decision.individualDevelops.map((id: string) => ({
    rikishiId: id,
    focusType: "develop" as const,
  }));

  nextState.focusSlots = [...existingFocus, ...protectSlots, ...pushSlots, ...developSlots];
  nextTrainingStates.set(decision.heyaId, nextState);
}

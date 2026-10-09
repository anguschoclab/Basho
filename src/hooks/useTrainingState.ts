/**
 * useTrainingState.ts
 *
 * TrainingPage state — heya training state plus the set of committed
 * mutations (intensity/focus/recovery, individual focus slots, weekly plan
 * updates). Each mutation applies locally then posts SET_TRAINING_STATE.
 */

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { createDefaultTrainingState } from "@/presenters/uiDigest";
import type {
  IndividualFocusType,
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  HeyaTrainingState,
  DrillType,
  DaySchedule,
} from "@/engine/types/training";
import type { WorldState } from "@/presenters/uiDigest";

export function useTrainingState(
  world: WorldState | null,
  playerHeyaId: string | null | undefined
) {
  const sendCommand = useGameStore((s) => s.sendCommand);

  const [trainingState, setTrainingState] = useState<HeyaTrainingState>(() => {
    if (!world || !playerHeyaId) return createDefaultTrainingState(playerHeyaId || "");
    return (
      world.trainingState?.get(playerHeyaId) ?? createDefaultTrainingState(playerHeyaId || "")
    );
  });

  // Apply a mutation locally, then persist via the worker command.
  const commit = (mutate: (prev: HeyaTrainingState) => HeyaTrainingState) => {
    if (!playerHeyaId) return;
    const heyaId = playerHeyaId;
    setTrainingState((prev) => {
      const next = mutate(prev);
      sendCommand({ type: "SET_TRAINING_STATE", heyaId, trainingState: next });
      return next;
    });
  };

  const handleIntensityChange = (intensity: TrainingIntensity) =>
    commit((prev) => ({ ...prev, activeProfile: { ...prev.activeProfile, intensity } }));

  const handleFocusChange = (focus: TrainingFocus) =>
    commit((prev) => ({ ...prev, activeProfile: { ...prev.activeProfile, focus } }));

  const handleRecoveryChange = (recovery: RecoveryEmphasis) =>
    commit((prev) => ({ ...prev, activeProfile: { ...prev.activeProfile, recovery } }));

  const handleIndividualFocusChange = (
    rikishiId: string,
    focusType: IndividualFocusType | null
  ) =>
    commit((prev) => {
      const slots = (prev.focusSlots || []).filter((s) => s.rikishiId !== rikishiId);
      if (focusType) slots.push({ rikishiId, focusType });
      return { ...prev, focusSlots: slots };
    });

  const handlePlanUpdate = (rikishiId: string, day: number, drillType: DrillType) =>
    commit((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      const schedule = { ...(plan[rikishiId] || {}) };
      schedule[day] = drillType;
      plan[rikishiId] = schedule as DaySchedule;
      return { ...prev, weeklyPlan: plan };
    });

  const handleBulkUpdate = (rikishiId: string, daySchedule: DaySchedule) =>
    commit((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      plan[rikishiId] = daySchedule;
      return { ...prev, weeklyPlan: plan };
    });

  const handleMultiBulkUpdate = (rikishiIds: string[], daySchedule: DaySchedule) =>
    commit((prev) => {
      const plan = { ...(prev.weeklyPlan || {}) };
      rikishiIds.forEach((id) => {
        plan[id] = daySchedule;
      });
      return { ...prev, weeklyPlan: plan };
    });

  return {
    trainingState,
    handleIntensityChange,
    handleFocusChange,
    handleRecoveryChange,
    handleIndividualFocusChange,
    handlePlanUpdate,
    handleBulkUpdate,
    handleMultiBulkUpdate,
  };
}

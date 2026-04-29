import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { TrainingService } from "../../systems/training/TrainingService";

export function phase01_week_training(world: WorldState): StateImpact {
  return TrainingService.applyWeeklyTraining(world);
}

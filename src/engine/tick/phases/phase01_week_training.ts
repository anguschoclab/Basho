/**
 * src/engine/tick/phases/phase01_week_training.ts
 * =================================================
 * Weekly training tick phase.
 *
 * Responsibilities:
 * - Apply standard weekly training bonuses (TrainingService)
 * - Apply heritage bonuses from bloodline traits (BloodlineService)
 * - Apply mentorship technique bleed and adaptability penalties (MentorshipService)
 * - Apply sparring stat bonuses and rivalry seeding (SparringService)
 *
 * Impact merging order:
 * 1. Training bonuses are applied first (base gains)
 * 2. Heritage bonuses are applied (heritage stat floors)
 * 3. Mentorship bonuses are applied (technique bleed, adaptability penalty)
 * 4. Sparring bonuses are applied (stat bleed from stronger to weaker)
 *
 * @see TrainingService for standard training logic
 * @see BloodlineService for heritage-based bonuses
 * @see MentorshipService for mentor-apprentice bonuses
 * @see SparringService for sparring partnership bonuses
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { mergeImpacts } from "../../core/ImpactResolver";
import { TrainingService } from "../../systems/training/TrainingService";
import { BloodlineService } from "../../systems/legacy/BloodlineService";
import { applyMentorshipBonuses } from "../../systems/training/MentorshipService";
import { applyWeeklySparring } from "../../systems/training/SparringService";

/**
 * Weekly training tick phase.
 *
 * Applies standard training, heritage bonuses, mentorship technique bleed, and sparring bonuses.
 * All impacts are merged into a single StateImpact for atomic application.
 *
 * Algorithm:
 * 1. Apply standard weekly training (TrainingService.applyWeeklyTraining)
 * 2. Apply heritage bonuses (BloodlineService.applyHeritageBonus)
 * 3. Apply mentorship bonuses (applyMentorshipBonuses)
 * 4. Apply sparring bonuses and rivalry seeding (applyWeeklySparring)
 * 5. Merge all rikishi updates, world fields, and events
 * 6. Return combined StateImpact
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Combined impact describing all training-related changes.
 *
 * @example
 * ```ts
 * const world = makeMockWorld({ rikishi: rikishiMap, bloodlineRegistry: registry });
 * const impact = phase01_week_training(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function phase01_week_training(world: WorldState): StateImpact {
  const trainingImpact = TrainingService.applyWeeklyTraining(world);
  const heritageImpact = BloodlineService.applyHeritageBonus(world);
  const mentorshipImpact = applyMentorshipBonuses(world);
  const sparringImpact = applyWeeklySparring(world);

  return mergeImpacts([trainingImpact, heritageImpact, mentorshipImpact, sparringImpact]);
}

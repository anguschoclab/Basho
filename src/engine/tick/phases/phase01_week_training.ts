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
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { TrainingService } from "../../systems/training/TrainingService";
import { BloodlineService } from "../../systems/legacy/BloodlineService";
import { applyMentorshipBonuses } from "../../systems/training/MentorshipService";
import { applyWeeklySparring } from "../../systems/training/SparringService";
import {
  assignTsukebito,
  applyWeeklyTsukebitoBenefits,
  applyWeeklyOtotodeshiEffects,
  isEligibleForTsukebito,
} from "../../systems/training/TsukebitoService";
import { applyWeightJourneyTick } from "../../training/WeightJourney";
import { EntityCollection } from "../../core/EntityCollection";
import { getRikishi } from "../../queries";

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

  // Tsukebito / ototodeshi system
  const tsukebitoImpacts: StateImpact[] = [];
  const activeRikishi = EntityCollection.getActiveRikishi(world);
  const rikishiByHeya = new Map<string, typeof activeRikishi>();
  for (const r of activeRikishi) {
    const list = rikishiByHeya.get(r.heyaId) ?? [];
    list.push(r);
    rikishiByHeya.set(r.heyaId, list);
  }
  for (const r of activeRikishi) {
    if (!isEligibleForTsukebito(r)) continue;
    // Skip if already has tsukebito assigned
    if (r.tsukebitoIds && r.tsukebitoIds.length > 0) {
      const tsukebitoRikishi = [];
      for (const id of r.tsukebitoIds) {
        const rikishi = getRikishi(world, id);
        if (rikishi) tsukebitoRikishi.push(rikishi);
      }
      if (tsukebitoRikishi.length > 0) {
        tsukebitoImpacts.push(
          applyWeeklyTsukebitoBenefits(
            world,
            { seniorId: r.id, tsukebitoIds: r.tsukebitoIds },
            r,
            tsukebitoRikishi
          )
        );
        continue;
      }
    }
    const heyaMates = rikishiByHeya.get(r.heyaId) ?? [];
    const assignment = assignTsukebito(world, r, heyaMates);
    if (assignment.tsukebitoIds.length === 0) continue;
    // Persist the assignment on the senior rikishi
    tsukebitoImpacts.push(
      createImpactBuilder("phase01_week_training")
        .updateRikishi(r.id, {
          tsukebitoIds: assignment.tsukebitoIds,
        })
        .build()
    );
    const tsukebitoRikishi = [];
    for (const id of assignment.tsukebitoIds) {
      const rikishi = getRikishi(world, id);
      if (rikishi) tsukebitoRikishi.push(rikishi);
    }
    tsukebitoImpacts.push(applyWeeklyTsukebitoBenefits(world, assignment, r, tsukebitoRikishi));
  }
  for (const [heyaId, heyaRikishi] of rikishiByHeya) {
    tsukebitoImpacts.push(applyWeeklyOtotodeshiEffects(world, heyaId, heyaRikishi));
  }

  // Weight journey tick — process all active rikishi
  const weightJourneyImpacts: StateImpact[] = [];
  for (const rikishi of activeRikishi) {
    const heya = EntityCollection.getHeya(world, rikishi.heyaId);
    weightJourneyImpacts.push(applyWeightJourneyTick(rikishi, heya, world));
  }

  return mergeImpacts([
    trainingImpact,
    heritageImpact,
    mentorshipImpact,
    sparringImpact,
    ...tsukebitoImpacts,
    ...weightJourneyImpacts,
  ]);
}

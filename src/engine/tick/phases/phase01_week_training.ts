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
import { mergeImpacts, resolveImpacts, sequenceImpacts } from "../../core/ImpactResolver";
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
  // Sequence subsystem computations against a progressively-resolved world:
  // each writes complete `stats`/`fatigue` snapshots derived from its input,
  // so a flat merge would let the last writer's stale values discard earlier
  // gains (e.g. a mentored rikishi losing the whole week's training stats).
  const { impacts: groupImpacts, world: w0 } = sequenceImpacts(world, [
    (w) => TrainingService.applyWeeklyTraining(w),
    (w) => BloodlineService.applyHeritageBonus(w),
    (w) => applyMentorshipBonuses(w),
    (w) => applyWeeklySparring(w),
  ]);

  // Tsukebito / ototodeshi system (computed on the post-sparring world)
  const tsukebitoImpacts: StateImpact[] = [];
  const activeRikishi = EntityCollection.getActiveRikishi(w0);
  const rikishiByHeya = new Map<string, typeof activeRikishi>();
  for (const r of activeRikishi) {
    const list = rikishiByHeya.get(r.heyaId) ?? [];
    list.push(r);
    rikishiByHeya.set(r.heyaId, list);
  }
  for (const r of activeRikishi) {
    if (!isEligibleForTsukebito(r)) continue;
    // Skip auto-assignment if the player has manually set tsukebito for this senior
    if (r.tsukebitoPlayerSet) {
      // Still apply weekly benefits for any existing player-set assignments
      if (r.tsukebitoIds && r.tsukebitoIds.length > 0) {
        const tsukebitoRikishi = [];
        for (const id of r.tsukebitoIds) {
          const rikishi = getRikishi(w0, id);
          if (rikishi) tsukebitoRikishi.push(rikishi);
        }
        if (tsukebitoRikishi.length > 0) {
          tsukebitoImpacts.push(
            applyWeeklyTsukebitoBenefits(
              w0,
              { seniorId: r.id, tsukebitoIds: r.tsukebitoIds },
              r,
              tsukebitoRikishi
            )
          );
        }
      }
      continue;
    }
    // Skip if already has tsukebito assigned (auto-assigned from a previous tick)
    if (r.tsukebitoIds && r.tsukebitoIds.length > 0) {
      const tsukebitoRikishi = [];
      for (const id of r.tsukebitoIds) {
        const rikishi = getRikishi(w0, id);
        if (rikishi) tsukebitoRikishi.push(rikishi);
      }
      if (tsukebitoRikishi.length > 0) {
        tsukebitoImpacts.push(
          applyWeeklyTsukebitoBenefits(
            w0,
            { seniorId: r.id, tsukebitoIds: r.tsukebitoIds },
            r,
            tsukebitoRikishi
          )
        );
        continue;
      }
    }
    const heyaMates = rikishiByHeya.get(r.heyaId) ?? [];
    const assignment = assignTsukebito(w0, r, heyaMates);
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
      const rikishi = getRikishi(w0, id);
      if (rikishi) tsukebitoRikishi.push(rikishi);
    }
    tsukebitoImpacts.push(applyWeeklyTsukebitoBenefits(w0, assignment, r, tsukebitoRikishi));
  }
  for (const [heyaId, heyaRikishi] of rikishiByHeya) {
    tsukebitoImpacts.push(applyWeeklyOtotodeshiEffects(w0, heyaId, heyaRikishi));
  }

  // Weight journey tick — process all active rikishi on the world after
  // tsukebito effects so its stats snapshot composes with theirs.
  const wAfterTsukebito = tsukebitoImpacts.length ? resolveImpacts(w0, tsukebitoImpacts) : w0;
  const weightJourneyImpacts: StateImpact[] = [];
  for (const rikishi of EntityCollection.getActiveRikishi(wAfterTsukebito)) {
    const heya = EntityCollection.getHeya(wAfterTsukebito, rikishi.heyaId);
    weightJourneyImpacts.push(applyWeightJourneyTick(rikishi, heya, wAfterTsukebito));
  }

  return mergeImpacts([...groupImpacts, ...tsukebitoImpacts, ...weightJourneyImpacts]);
}

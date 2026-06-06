/**
 * BloodlineService.ts
 * ===================
 * Manages bloodline trait effects and dynasty narrative.
 * (Phase 5: The Legacy Engine)
 *
 * Responsibilities:
 * - Apply weekly heritage bonuses to rikishi with bloodline traits
 * - Check for dynasty narrative triggers (surname lineage with legends)
 *
 * @see MentorshipService for mentor-based stat bonuses
 * @see SparringService for sparring-based stat bonuses
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { EntityCollection } from "../../core/EntityCollection";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { clampInt } from "../../utils/math";

/**
 * Weekly heritage bonus points per stat floor key.
 * Rikishi with bloodline traits gain this many points per week
 * toward their heritage stat floor (if below the floor).
 */
const WEEKLY_HERITAGE_BONUS = 1;

/**
 * Bloodline service providing heritage-based stat bonuses and dynasty narrative detection.
 *
 * @example
 * ```ts
 * const impact = BloodlineService.applyHeritageBonus(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 *
 * const ancestor = BloodlineService.checkDynastyNarrative(rikishi, world);
 * if (ancestor) {
 *   console.log(`${rikishi.shikona} is heir to ${ancestor}`);
 * }
 * ```
 */
export const BloodlineService = {
  /**
   * Applies weekly heritage bonuses to rikishi with bloodline traits.
   *
   * Called weekly in the training phase. Rikishi carrying a bloodline trait
   * gain a small weekly stat nudge toward their heritage stat floor,
   * but only if they are currently below the floor.
   *
   * Algorithm:
   * 1. Get all active rikishi from world state
   * 2. For each rikishi with a bloodline trait:
   *    a. Retrieve trait from bloodline registry
   *    b. For each stat floor in trait.statFloorBonus:
   *       - If rikishi stat < floor, add WEEKLY_HERITAGE_BONUS
   *       - Clamp result to [0, 99]
   * 3. Return StateImpact with all queued updates
   *
   * @param {WorldState} world - The current world state.
   * @returns {StateImpact} Impact describing heritage stat bonuses.
   *
   * @example
   * ```ts
   * const rikishi = mockRikishi("r1", { power: 40, speed: 35 });
   * rikishi.lineage = { bloodlineTraitId: "strong" };
   * const world = makeMockWorld({
   *   rikishi: new Map([[rikishi.id, rikishi]]),
   *   bloodlineRegistry: { traits: { strong: { statFloorBonus: { power: 80 } } } },
   * });
   *
   * const impact = BloodlineService.applyHeritageBonus(world);
   * const update = impact.entities?.rikishiUpdates?.get(rikishi.id);
   * expect(update?.power).toBeGreaterThan(40);
   * ```
   */
  applyHeritageBonus(world: WorldState): StateImpact {
    const builder = createImpactBuilder("applyHeritageBonus");
    const registry = world.bloodlineRegistry;
    if (!registry) return builder.build();

    const activeRikishi = EntityCollection.getActiveRikishi(world);
    for (const rikishi of activeRikishi) {
      const traitId = rikishi.lineage?.bloodlineTraitId;
      if (!traitId) continue;
      const trait = registry.traits[traitId];
      if (!trait) continue;

      const nextStats = { ...rikishi.stats };
      let changed = false;

      for (const [stat, floor] of Object.entries(trait.statFloorBonus)) {
        if (floor === undefined) continue;
        const current = (nextStats as any)[stat] ?? 0;
        if (current < floor) {
          (nextStats as any)[stat] = clampInt(current + WEEKLY_HERITAGE_BONUS, 0, 99);
          changed = true;
        }
      }

      if (changed) {
        builder.updateRikishi(rikishi.id, { stats: nextStats });
      }
    }

    return builder.build();
  },

  /**
   * Checks for dynasty narrative trigger based on surname lineage.
   *
   * Returns the ancestor's shikona if the rikishi's shikona shares the same
   * surname fragment as their bloodline's ancestorShikona. This is used to
   * trigger narrative events for rikishi who are heirs to legendary wrestlers.
   *
   * Japanese name handling: checks the last segment when split by space.
   *
   * Algorithm:
   * 1. Check if rikishi has a bloodline trait
   * 2. Retrieve trait from bloodline registry
   * 3. Extract surname from ancestor shikona (last space-separated segment)
   * 4. Extract surname from rikishi shikona (last space-separated segment)
   * 5. If ancestor surname >= 3 chars and matches rikishi surname, return ancestor shikona
   * 6. Otherwise return null
   *
   * @param {Rikishi} rikishi - The rikishi to check for dynasty lineage.
   * @param {WorldState} world - The current world state.
   * @returns {string | null} Ancestor shikona if dynasty match, null otherwise.
   *
   * @example
   * ```ts
   * const rikishi = mockRikishi("r1", { shikona: "Futabayama III" });
   * rikishi.lineage = { bloodlineTraitId: "futabayama" };
   * const world = makeMockWorld({
   *   rikishi: new Map([[rikishi.id, rikishi]]),
   *   bloodlineRegistry: { traits: { futabayama: { ancestorShikona: "Futabayama Sadaji" } } },
   * });
   *
   * const ancestor = BloodlineService.checkDynastyNarrative(rikishi, world);
   * expect(ancestor).toBe("Futabayama Sadaji");
   * ```
   */
  checkDynastyNarrative(rikishi: Rikishi, world: WorldState): string | null {
    const traitId = rikishi.lineage?.bloodlineTraitId;
    if (!traitId) return null;
    const trait = world.bloodlineRegistry?.traits[traitId];
    if (!trait?.ancestorShikona) return null;

    const ancestorSurname = trait.ancestorShikona.split(" ").at(-1) ?? "";
    const rikishiSurname = rikishi.shikona.split(" ").at(-1) ?? "";

    if (ancestorSurname.length >= 3 && rikishiSurname === ancestorSurname) {
      return trait.ancestorShikona;
    }
    return null;
  },
};

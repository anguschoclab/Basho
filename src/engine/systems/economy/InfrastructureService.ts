/**
 * src/engine/systems/economy/InfrastructureService.ts
 * =====================================================
 * Infrastructure Service
 *
 * Responsibilities:
 * - Manage construction and activation of stable buildings
 * - Process construction queue at basho boundaries
 * - Aggregate infrastructure bonuses for stables
 * - Validate construction requirements (regional presence, funds)
 *
 * @see FACILITY_REGISTRY for facility definitions
 */

// @ts-nocheck
import { WorldState } from "../../types/world";
import { Heya } from "../../types/heya";
import { Id } from "../../types/common";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { FACILITY_REGISTRY, FacilityId } from "../../types/infrastructure";
import {
  CONSTRUCTION_COST_LEVEL_MULTIPLIER,
  CONSTRUCTION_BUILD_TIME_THRESHOLD,
} from "../../../constants/engine/economyExtended";

/**
 * Infrastructure Service namespace.
 * Provides construction management and bonus aggregation for stable infrastructure.
 *
 * @example
 * ```ts
 * const impact = InfrastructureService.startConstruction(world, heyaId, "training_doj");
 * const bonuses = InfrastructureService.getHeyaBonuses(heya);
 * ```
 */
export const InfrastructureService = {
  /**
   * Initiates a construction project for a stable.
   * Validates requirements, deducts cost, and adds to construction queue.
   *
   * Algorithm:
   * 1. Validate heya and facility exist
   * 2. Check if already under construction
   * 3. Calculate cost (scales with level)
   * 4. Validate funds
   * 5. Check regional presence requirements
   * 6. Calculate completion date
   * 7. Add to construction queue and deduct funds
   *
   * @param {WorldState} world - The current world state.
   * @param {Id} heyaId - The heya ID to build for.
   * @param {FacilityId} facilityId - The facility ID to build.
   * @returns {StateImpact} Impact describing construction start (or empty if failed).
   *
   * @example
   * ```ts
   * const impact = InfrastructureService.startConstruction(world, heyaId, "training_doj");
   * const updatedWorld = resolveImpacts(world, [impact]);
   * ```
   */
  startConstruction(world: WorldState, heyaId: Id, facilityId: FacilityId): StateImpact {
    const builder = createImpactBuilder("startConstruction");
    const heya = world.heyas.get(heyaId);
    if (!heya) return builder.build();

    const def = FACILITY_REGISTRY[facilityId];
    if (!def) return builder.build();

    // Check if under construction already
    const existing = heya.infrastructure?.[facilityId];
    if (existing && existing.status === "under_construction") return builder.build();

    const currentLevel = existing?.level || 0;
    const nextLevel = currentLevel + 1;

    // Calculate cost (scales with level)
    const cost = def.baseCost * (1 + (nextLevel - 1) * CONSTRUCTION_COST_LEVEL_MULTIPLIER);
    if (heya.funds < cost) return builder.build();

    // Phase 5 Depth: Regional Presence check
    if (def.requirements?.regionalPresence) {
      const presence = heya.regionalPresence || {};
      for (const [region, minPresence] of Object.entries(def.requirements.regionalPresence)) {
        if ((presence[region] || 0) < (minPresence as number)) {
          builder.logEvent(
            "CONSTRUCTION_STARTED",
            "facility",
            {
              facilityId,
              status: "failed_requirements",
              reason: `Insufficient presence in ${region}. Need ${minPresence}, have ${presence[region] || 0}.`,
            },
            { heyaId }
          );
          return builder.build();
        }
      }
    }

    // Determine completion date (relative to current world state)
    // We'll use a simple "next basho" or "N basho from now" logic
    // For now, let's assume world.currentBashoName exists
    const completionYear = world.year + (def.buildTimeBasho > CONSTRUCTION_BUILD_TIME_THRESHOLD ? 1 : 0);

    const queueEntry = {
      facilityId,
      level: nextLevel,
      completionYear: completionYear,
      completionBasho: "TBD", // Will be resolved by the tick logic
    };

    builder.updateHeya(heyaId, {
      funds: heya.funds - cost,
      constructionQueue: [...(heya.constructionQueue || []), queueEntry],
    });

    builder.logEvent(
      "CONSTRUCTION_STARTED",
      "facility",
      {
        facilityId,
        level: nextLevel,
        cost,
        eta: `${def.buildTimeBasho} Basho`,
      },
      { heyaId }
    );

    return builder.build();
  },

  /**
   * Processes the construction queue at a Basho boundary.
   * Completes projects whose completion date has been reached.
   *
   * Algorithm:
   * 1. Iterate through all heya
   * 2. For each heya with construction queue, check each project
   * 3. If completion year has been reached, activate facility
   * 4. Remove completed projects from queue
   * 5. Log completion events
   *
   * @param {WorldState} world - The current world state.
   * @returns {StateImpact} Impact describing completed constructions.
   *
   * @example
   * ```ts
   * const impact = InfrastructureService.processCompletionTick(world);
   * const updatedWorld = resolveImpacts(world, [impact]);
   * ```
   */
  processCompletionTick(world: WorldState): StateImpact {
    const builder = createImpactBuilder("processCompletionTick");

    for (const heya of world.heyas.values()) {
      if (!heya.constructionQueue || heya.constructionQueue.length === 0) continue;

      const remainingQueue: NonNullable<Heya["constructionQueue"]> = [];
      const updatedInfra = { ...(heya.infrastructure || {}) };

      for (const project of heya.constructionQueue) {
        // Simple logic: Project completes after N basho.
        // For Phase P, we just check if the year matches (simpler logic for initial build)
        // Ideally we track 'daysRemaining' or 'bashoRemaining'

        // Let's assume projects finish at the start of the next year for now
        // to simplify the boundary check
        if (world.year >= project.completionYear) {
          updatedInfra[project.facilityId] = {
            level: project.level,
            status: "active",
          };

          builder.logEvent(
            "CONSTRUCTION_COMPLETED",
            "facility",
            {
              facilityId: project.facilityId,
              level: project.level,
              status: "completed",
            },
            { heyaId: heya.id }
          );
        } else {
          remainingQueue.push(project);
        }
      }

      builder.updateHeya(heya.id, {
        infrastructure: updatedInfra,
        constructionQueue: remainingQueue,
      });
    }

    return builder.build();
  },

  /**
   * Aggregates all active infrastructure bonuses for a stable.
   * Combines stat buffs, injury healing mods, media mods, and fatigue floors from all active facilities.
   *
   * @param {Heya | undefined} heya - The heya to aggregate bonuses for.
   * @returns {{ statBuffs: Record<string, number>; injuryHealMod: number; mediaMod: number; fatigueFloor: number }} The aggregated bonuses.
   *
   * @example
   * ```ts
   * const bonuses = InfrastructureService.getHeyaBonuses(heya);
   * console.log(bonuses.statBuffs.strength); // Multiplier (e.g., 1.15)
   * console.log(bonuses.injuryHealMod); // Healing modifier
   * ```
   */
  getHeyaBonuses(heya: Heya | undefined) {
    const totalBonuses = {
      statBuffs: {
        strength: 1,
        speed: 1,
        technique: 1,
        balance: 1,
        stamina: 1,
        mental: 1,
        weight: 1,
        adaptability: 1,
      },
      injuryHealMod: 0,
      mediaMod: 1,
      fatigueFloor: 0,
    };

    if (!heya || !heya.infrastructure) return totalBonuses;

    for (const [id, state] of Object.entries(heya.infrastructure)) {
      if (state.status !== "active") continue;

      const def = FACILITY_REGISTRY[id as FacilityId];
      if (!def) continue;

      // Apply bonuses scaled by level
      const lv = state.level;

      if (def.bonuses.statBuffs) {
        for (const [stat, mult] of Object.entries(def.bonuses.statBuffs)) {
          (totalBonuses.statBuffs as Record<string, number>)[stat] *= 1 + (mult - 1) * lv;
        }
      }

      if (def.bonuses.injuryHealMod) {
        totalBonuses.injuryHealMod += def.bonuses.injuryHealMod * lv;
      }

      if (def.bonuses.mediaMod) {
        totalBonuses.mediaMod *= 1 + (def.bonuses.mediaMod - 1) * lv;
      }

      if (def.bonuses.fatigueFloor) {
        totalBonuses.fatigueFloor += def.bonuses.fatigueFloor * lv;
      }
    }

    return totalBonuses;
  },
};

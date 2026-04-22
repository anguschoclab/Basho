// @ts-nocheck
import type { Id } from "./types/common";
import { getStableRikishi } from "./queries";
import type { WorldState, ClosedHeyaRecord } from "./types/world";
import { EventBus } from "./events";
import { generateGovernanceHeadline } from "./systems/media/MediaService";
import { updateFacilitiesBand } from "./facilities";
import { rngForWorld } from "./rng";
import { stableTieBreak } from "./utils/sort";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

/**
 * Execute a stable merger.
 * The source stable is merged into the target stable.
 * - Rikishi are transferred.
 * - Facilities and funds are partially absorbed.
 * - Source stable is removed from the world.
 * Returns StateImpact describing merger changes instead of mutating state.
 */
export function executeMerger(world: WorldState, sourceHeyaId: Id, targetHeyaId: Id, reason: string): StateImpact {
  const builder = createImpactBuilder('merger');
  const source = world.heyas.get(sourceHeyaId);
  const target = world.heyas.get(targetHeyaId);

  if (!source || !target) {
    return builder.build();
  }

  // 1. Transfer rikishi
  const transferredRikishiIds: Id[] = [];
  for (const rId of getStableRikishi(world, source.id).map(r => r.id)) {
    const rikishi = world.rikishi.get(rId);
    if (rikishi) {
      builder.updateRikishi(rId, { heyaId: target.id });
      transferredRikishiIds.push(rId);

      builder.logEvent(
        'LIFECYCLE_EVENT',
        'career',
        {
          rikishiId: rId,
          heyaId: target.id,
          shikona: rikishi.shikona || rikishi.name,
          status: "transferred",
          reason: target.name
        },
        { rikishiId: rId, heyaId: target.id, importance: 'notable' }
      );
    }
  }

  // 2. Combine funds (partially, penalties apply for scandal)
  // If source had debt, it might not transfer fully, but positive funds transfer partially
  let newTargetFunds = target.funds;
  if (source.funds > 0) {
    const transferRatio = source.scandalScore > 50 ? 0.2 : 0.5; // Scandal reduces favorable outcomes
    newTargetFunds += Math.floor(source.funds * transferRatio);
  }

  // 3. Combine facilities (diminishing returns)
  const newTraining = Math.min(100, target.facilities.training + Math.floor(source.facilities.training * 0.2));
  const newRecovery = Math.min(100, target.facilities.recovery + Math.floor(source.facilities.recovery * 0.2));
  const newNutrition = Math.min(100, target.facilities.nutrition + Math.floor(source.facilities.nutrition * 0.2));

  // Update facilities band on a copy to get the new band
  const targetCopy = { ...target, facilities: { ...target.facilities, training: newTraining, recovery: newRecovery, nutrition: newNutrition } };
  updateFacilitiesBand(targetCopy);

  builder.updateHeya(target.id, {
    funds: newTargetFunds,
    facilities: {
      training: newTraining,
      recovery: newRecovery,
      nutrition: newNutrition
    },
    facilitiesBand: targetCopy.facilitiesBand
  });

  // 4. Log the merger
  builder.logEvent(
    'GOVERNANCE_RULING',
    'narrative',
    {
      incident: "stable_merger",
      heyaname: source.name,
      heya: target.name,
      reason
    },
    { heyaId: target.id, importance: 'headline' }
  );

  // generateGovernanceHeadline still called directly - will migrate in Phase 5
  generateGovernanceHeadline({
    world,
    heyaId: target.id,
    type: "merger",
    severity: "critical",
    description: `The Sumo Association has approved the absorption of ${source.name} into ${target.name}.`
  });

  // 5. Remove source stable
  builder.deleteHeya(source.id);

  // Clean up references in world history/almanac if necessary
  const closedHeyas = world.closedHeyas || new Map<Id, ClosedHeyaRecord>();
  const record: ClosedHeyaRecord = {
      ...source,
      closedAtYear: world.year,
      closedAtBasho: world.currentBashoName,
      mergedInto: target.id,
      rikishiIds: transferredRikishiIds
  };
  closedHeyas.set(source.id, record);

  builder.updateWorldField('closedHeyas', closedHeyas);

  return builder.build();
}

/**
 * Identify a suitable target stable for a merger.
 * Deterministic selection based on prestige, roster size, and random seed.
 */
export function findMergerTarget(world: WorldState, sourceHeyaId: Id): Id | null {
  const source = world.heyas.get(sourceHeyaId);
  if (!source) return null;

  const rng = rngForWorld(world, "merger", `merger_${sourceHeyaId}_${world.year}_${world.week}`);

  // Candidates: not the source, not player (unless forced, but usually NPC targets NPC),
  // has room in roster (< 25 rikishi), and prestige >= modest.
  const candidates: import("./types/heya").Heya[] = [];
  for (const h of world.heyas.values()) {
    if (h.id !== sourceHeyaId && getStableRikishi(world, h.id).length < 25 &&
      (h.prestigeBand === "elite" || h.prestigeBand === "respected" || h.prestigeBand === "modest")) {
      candidates.push(h);
    }
  }

  if (candidates.length === 0) {
    // Fallback: any stable with room
    const fallback: import("./types/heya").Heya[] = [];
    for (const h of world.heyas.values()) {
      if (h.id !== sourceHeyaId && getStableRikishi(world, h.id).length < 30) fallback.push(h);
    }
    if (fallback.length === 0) return null;
    return fallback[rng.int(0, fallback.length - 1)].id;
  }

  // Weight by prestige and funds
  candidates.sort((a, b) => b.funds - a.funds || stableTieBreak(a.id, b.id));
  return candidates[rng.int(0, Math.min(candidates.length - 1, 3))].id;
}
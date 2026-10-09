import type { Id } from "./types/common";
import { getHeyaRoster, getHeya, getRikishi } from "./queries";
import type { WorldState, ClosedHeyaRecord } from "./types/world";
import { generateGovernanceHeadline } from "./systems/media/MediaService";
import { updateFacilitiesBand } from "./facilities";
import { rngForWorld } from "./rng";
import { stableTieBreak } from "./utils/sort";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { bumpTenure } from "./systems/legacy/tenure";
import {
  TRANSFER_RATIO_STANDARD,
  TRANSFER_RATIO_SCANDAL,
  ROSTER_CAPACITY_STANDARD,
  ROSTER_CAPACITY_MERGER,
  FACILITY_MERGER_RATIO,
} from "../constants/engine/roster";
import { countsAsForeign } from "./utils/citizenshipUtils";

/**
 * Execute a stable merger.
 * The source stable is merged into the target stable.
 * - Rikishi are transferred.
 * - Facilities and funds are partially absorbed.
 * - Source stable is removed from the world.
 * Returns StateImpact describing merger changes instead of mutating state.
 */
export function executeMerger(
  world: WorldState,
  sourceHeyaId: Id,
  targetHeyaId: Id,
  reason: string
): StateImpact {
  const builder = createImpactBuilder("merger");
  const source = getHeya(world, sourceHeyaId);
  const target = getHeya(world, targetHeyaId);

  if (!source || !target) {
    return builder.build();
  }

  // WS5 — the absorbed heya's oyakata records a forced merger on their tenure.
  bumpTenure(world, builder, sourceHeyaId, { forcedMergers: 1 });

  // 1. Transfer rikishi (foreign-slot-aware — §5.1 holds "at any time").
  const transferredRikishiIds = transferRosterAcrossMerger(world, source, target, builder);

  // 2. Combine funds (partially, penalties apply for scandal)
  // If source had debt, it might not transfer fully, but positive funds transfer partially
  let newTargetFunds = target.funds;
  if (source.funds > 0) {
    const transferRatio =
      source.scandalScore > 50 ? TRANSFER_RATIO_SCANDAL : TRANSFER_RATIO_STANDARD; // Scandal reduces favorable outcomes
    newTargetFunds += Math.floor(source.funds * transferRatio);
  }

  // 3. Combine facilities (diminishing returns)
  const newTraining = Math.min(
    100,
    target.facilities.training + Math.floor(source.facilities.training * FACILITY_MERGER_RATIO)
  );
  const newRecovery = Math.min(
    100,
    target.facilities.recovery + Math.floor(source.facilities.recovery * FACILITY_MERGER_RATIO)
  );
  const newNutrition = Math.min(
    100,
    target.facilities.nutrition + Math.floor(source.facilities.nutrition * FACILITY_MERGER_RATIO)
  );

  // Update facilities band on a copy to get the new band
  const targetCopy = {
    ...target,
    facilities: {
      ...target.facilities,
      training: newTraining,
      recovery: newRecovery,
      nutrition: newNutrition,
    },
  };
  updateFacilitiesBand(targetCopy);

  builder.updateHeya(target.id, {
    funds: newTargetFunds,
    facilities: {
      training: newTraining,
      recovery: newRecovery,
      nutrition: newNutrition,
    },
    facilitiesBand: targetCopy.facilitiesBand,
  });

  // 4. Log the merger
  builder.logEvent(
    "GOVERNANCE_RULING",
    "narrative",
    {
      incident: "stable_merger",
      heyaname: source.name,
      heya: target.name,
      reason,
    },
    { heyaId: target.id, importance: "headline" }
  );

  builder.merge(
    generateGovernanceHeadline({
      world,
      heyaId: target.id,
      templatePath: "institutional.merger.approved",
      severity: "main_event",
    })
  );

  // 5. Remove source stable
  builder.deleteHeya(source.id);

  // Clean up references in world history/almanac if necessary
  // Clone before .set — reusing the live map would mutate the input world.
  const closedHeyas = new Map<Id, ClosedHeyaRecord>(world.closedHeyas ?? []);
  const record: ClosedHeyaRecord = {
    ...source,
    closedAtYear: world.year,
    closedAtBasho: world.currentBashoName,
    mergedInto: target.id,
    rikishiIds: transferredRikishiIds,
  };
  closedHeyas.set(source.id, record);

  builder.updateWorldField("closedHeyas", closedHeyas);

  return builder.build();
}

/**
 * Transfer the source roster into the merger target. A slot-consuming foreign
 * rikishi cannot stack onto a target whose slot is occupied; excess foreigners
 * disperse to a stable with a free slot (deterministic pick: prestige then id),
 * or retire when no beya can roster them.
 */
function transferRosterAcrossMerger(
  world: WorldState,
  source: NonNullable<ReturnType<typeof getHeya>>,
  target: NonNullable<ReturnType<typeof getHeya>>,
  builder: ReturnType<typeof createImpactBuilder>
): Id[] {
  const foreignOccupied = new Set<Id>();
  for (const r of world.rikishi.values()) {
    if (!r.isRetired && r.heyaId && r.heyaId !== source.id && countsAsForeign(r, world.year)) {
      foreignOccupied.add(r.heyaId);
    }
  }
  const dispersalCandidates = [...world.heyas.values()]
    .filter(
      // The player's stable never silently absorbs a dispersed foreigner.
      (h) => h.id !== source.id && h.id !== target.id && h.id !== world.playerHeyaId
    )
    .sort((a, b) => (b.prestige ?? 0) - (a.prestige ?? 0) || stableTieBreak(a.id, b.id));

  // updateRikishi(heyaId) does not resync heya.rikishiIds — accumulate
  // incoming ids per destination and write them back explicitly, or roster
  // reads (getHeyaRoster) would miss the transferred rikishi forever.
  const destRosterAdds = new Map<Id, Id[]>();
  const transferredRikishiIds: Id[] = [];
  for (const rId of getHeyaRoster(world, source.id).map((r) => r.id)) {
    const rikishi = getRikishi(world, rId);
    if (!rikishi) continue;

    const consumesSlot = countsAsForeign(rikishi, world.year);
    let destId: Id | undefined = target.id;
    if (consumesSlot && foreignOccupied.has(target.id)) {
      destId = dispersalCandidates.find(
        (h) =>
          !foreignOccupied.has(h.id) &&
          getHeyaRoster(world, h.id).length < ROSTER_CAPACITY_MERGER
      )?.id;
    }

    if (!destId) {
      // No beya can roster them — forced retirement after the closure.
      builder.updateRikishi(rId, { isRetired: true, isKyujo: false });
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "career",
        {
          rikishiId: rId,
          shikona: rikishi.shikona || rikishi.name,
          status: "retired",
          reason: `${rikishi.shikona} retires: ${source.name} folded and no stable had a free foreign slot.`,
        },
        { rikishiId: rId, importance: "notable" }
      );
      continue;
    }

    if (consumesSlot) foreignOccupied.add(destId);
    const destHeya = destId === target.id ? target : getHeya(world, destId);
    builder.updateRikishi(rId, { heyaId: destId });
    const bucket = destRosterAdds.get(destId) ?? [];
    bucket.push(rId);
    destRosterAdds.set(destId, bucket);
    transferredRikishiIds.push(rId);

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: rId,
        heyaId: destId,
        shikona: rikishi.shikona || rikishi.name,
        status: "transferred",
        reason: destHeya?.name ?? target.name,
      },
      { rikishiId: rId, heyaId: destId, importance: "notable" }
    );
  }

  for (const [destId, addedIds] of destRosterAdds) {
    const dest = destId === target.id ? target : getHeya(world, destId);
    if (!dest) continue;
    builder.updateHeya(destId, {
      rikishiIds: [...new Set([...(dest.rikishiIds ?? []), ...addedIds])],
    });
  }
  return transferredRikishiIds;
}

/**
 * Identify a suitable target stable for a merger.
 * Deterministic selection based on prestige, roster size, and random seed.
 */
export function findMergerTarget(world: WorldState, sourceHeyaId: Id): Id | null {
  const source = getHeya(world, sourceHeyaId);
  if (!source) return null;

  const rng = rngForWorld(world, "merger", `merger_${sourceHeyaId}_${world.year}_${world.week}`);

  // Candidates: not the source, not player (unless forced, but usually NPC targets NPC),
  // has room in roster (< 25 rikishi), and prestige >= modest.
  const candidates: import("./types/heya").Heya[] = [];
  for (const h of world.heyas.values()) {
    if (
      h.id !== sourceHeyaId &&
      getHeyaRoster(world, h.id).length < ROSTER_CAPACITY_STANDARD &&
      (h.prestigeBand === "elite" || h.prestigeBand === "respected" || h.prestigeBand === "modest")
    ) {
      candidates.push(h);
    }
  }

  if (candidates.length === 0) {
    // Fallback: any stable with room
    const fallback: import("./types/heya").Heya[] = [];
    for (const h of world.heyas.values()) {
      if (h.id !== sourceHeyaId && getHeyaRoster(world, h.id).length < ROSTER_CAPACITY_MERGER)
        fallback.push(h);
    }
    if (fallback.length === 0) return null;
    return fallback[rng.int(0, fallback.length - 1)].id;
  }

  // Weight by prestige and funds
  candidates.sort((a, b) => b.funds - a.funds || stableTieBreak(a.id, b.id));
  return candidates[rng.int(0, Math.min(candidates.length - 1, 3))].id;
}

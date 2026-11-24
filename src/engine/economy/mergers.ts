import type { Id } from "@/engine/types/common";
import { getHeyaRoster, getHeya, getRikishi } from "@/engine/core/queries";
import type { WorldState, ClosedHeyaRecord } from "@/engine/types/world";
import { generateGovernanceHeadline } from "@/engine/media/MediaService";
import { updateFacilitiesBand } from "@/engine/economy/facilities";
import { rngForWorld } from "@/engine/core/rng";
import { stableTieBreak } from "@/engine/utils/sort";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { pushUniqueId } from "@/engine/core/idIntegrity";
import type { StateImpact } from "@/engine/core/StateImpact";
import { bumpTenure } from "@/engine/legacy/tenure";
import { releaseElderStockToPool } from "@/engine/governance/myosekiMarket";
import {
  TRANSFER_RATIO_STANDARD,
  TRANSFER_RATIO_SCANDAL,
  FACILITY_MERGER_RATIO,
} from "@/constants/engine/roster";
import {
  MERGER_TRANSFER_RETIRE_AGE,
  MERGER_RETIRE_DIVISIONS,
} from "@/constants/engine/recruitment";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "@/constants/engine/recruitment";
import { getHeyaRosterTarget } from "@/engine/generation/RecruitmentController";

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

  // The absorbed stable's master exits headship with the stable. Associate
  // elders are not modeled (headship is 1:1 with the heya), so a stableless
  // oyakata is dead state — it would age forever, surface in UI lists, and
  // lock its elder stock permanently. Remove the entity and return stock
  // to the JSA pool. Resolution applies entity updates before deletions,
  // so the tenure bump above is a harmless dead write.
  const departingOyakata = source.oyakataId ? world.oyakata?.get(source.oyakataId) : undefined;
  if (departingOyakata) {
    builder.removeOyakata(departingOyakata.id);
    builder.merge(releaseElderStockToPool(world, departingOyakata.id));
  }

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
    closureReason: reason,
    rikishiIds: transferredRikishiIds,
  };
  closedHeyas.set(source.id, record);

  builder.updateWorldField("closedHeyas", closedHeyas);

  return builder.build();
}

/**
 * Transfer the source roster into the merger target — the real JSA merger
 * rule: when a heya closes, its wrestlers are absorbed by the receiving
 * stable. There is no roster cap, and the foreign quota is waived for the
 * transfer itself (a receiving heya may legally hold 2+ slot-bound
 * foreigners; its foreign recruitment then stays frozen until they retire
 * — enforced by the canonical foreign-count reads). The one exception:
 * aging lower-division veterans near retirement typically choose intai
 * over relocation and never move (see MERGER_TRANSFER_RETIRE_AGE).
 */
function transferRosterAcrossMerger(
  world: WorldState,
  source: NonNullable<ReturnType<typeof getHeya>>,
  target: NonNullable<ReturnType<typeof getHeya>>,
  builder: ReturnType<typeof createImpactBuilder>
): Id[] {
  // updateRikishi(heyaId) does not resync heya.rikishiIds — accumulate
  // incoming ids and write them back explicitly, or roster reads
  // (getHeyaRoster) would miss the transferred rikishi forever.
  const addedIds: Id[] = [];
  let transferredRikishiIds: Id[] = [];
  let incomingForeign = 0;
  for (const rId of getHeyaRoster(world, source.id).map((r) => r.id)) {
    const rikishi = getRikishi(world, rId);
    if (!rikishi) continue;

    // Merger attrition — a lower-division veteran near the end of his
    // shelf life often chooses intai over relocation (real JSA pattern:
    // absorbed rosters shed their oldest unsalaried members).
    const age = world.year - rikishi.birthYear;
    if (age >= MERGER_TRANSFER_RETIRE_AGE && MERGER_RETIRE_DIVISIONS.has(rikishi.division)) {
      builder.retireRikishi(rId, world.year, "Merger Relocation Retirement");
      continue;
    }

    builder.updateRikishi(rId, { heyaId: target.id });
    addedIds.push(rId);
    transferredRikishiIds = pushUniqueId(transferredRikishiIds, rId);
    if (countsAsForeign(rikishi, world.year)) incomingForeign++;

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: rId,
        heyaId: target.id,
        shikona: rikishi.shikona || rikishi.name,
        status: "transferred",
        reason: target.name,
      },
      { rikishiId: rId, heyaId: target.id, importance: "notable" }
    );
  }

  // Any absorption may stack foreign-slot rikishi past the cap — the quota
  // binds future recruitment, not existing roster, so receivers legally
  // hold the excess. Stamp it so the exception is tracked (and decays on
  // retirement/transfer) instead of silently persisting.
  const update: Record<string, unknown> = {
    rikishiIds: [...new Set([...(target.rikishiIds ?? []), ...addedIds])],
  };
  // Capacity follows the men (Isegahama precedent: 13 + 24 absorbed →
  // roster 37). The population floor is Σ per-heya rosterTarget — a
  // closure deletes the dying stable's whole target, so the transferred
  // men's implied slots must move with them or every merger shrinks
  // league capacity permanently. Men who retired instead of relocating
  // take their slots with them (they'd have exited regardless).
  update.rosterTarget = getHeyaRosterTarget(target) + transferredRikishiIds.length;
  if (incomingForeign > 0) {
    const targetForeign = getHeyaRoster(world, target.id).filter((r) =>
      countsAsForeign(r, world.year)
    ).length;
    const excess = targetForeign + incomingForeign - FOREIGN_RIKISHI_LIMIT_PER_HEYA;
    if (excess > 0) {
      update.grandfatheredForeignCount = (target.grandfatheredForeignCount ?? 0) + excess;
    }
  }
  builder.updateHeya(target.id, update as never);
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

  // Candidates: not the source, not the player, and prestige >= modest.
  // Real JSA has no roster cap, so headroom no longer gates a target.
  const candidates: import("@/engine/types/heya").Heya[] = [];
  for (const h of world.heyas.values()) {
    if (
      h.id !== sourceHeyaId &&
      h.id !== world.playerHeyaId &&
      (h.prestigeBand === "elite" || h.prestigeBand === "respected" || h.prestigeBand === "modest")
    ) {
      candidates.push(h);
    }
  }

  if (candidates.length === 0) {
    // Fallback: any stable — still never the player's heya
    const fallback: import("@/engine/types/heya").Heya[] = [];
    for (const h of world.heyas.values()) {
      if (h.id !== sourceHeyaId && h.id !== world.playerHeyaId) fallback.push(h);
    }
    if (fallback.length === 0) return null;
    return fallback[rng.int(0, fallback.length - 1)].id;
  }

  // Ichimon coordination comes first (real JSA practice): a closing
  // stable's roster is placed within the clan when a viable same-ichimon
  // heya exists; prestige/funds only break ties inside the clan.
  const inClan = source.ichimon
    ? candidates.filter((h) => h.ichimon === source.ichimon)
    : [];
  const pool = inClan.length > 0 ? inClan : candidates;

  // Weight by prestige and funds
  pool.sort((a, b) => b.funds - a.funds || stableTieBreak(a.id, b.id));
  return pool[rng.int(0, Math.min(pool.length - 1, 3))].id;
}

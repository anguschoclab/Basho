import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import { toRankPosition } from "../types/index";
import type { BanzukeEntry } from "../banzuke";
import type { MovementEvent } from "../types/banzuke";
import { updateBanzuke } from "../banzuke";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { getRikishi } from "../queries";
import { warn } from "../utils/Logger";
import { buildPerformanceList } from "./publish/performance";
import { applyMovementEvents } from "./publish/movements";
import { recordPromotionHistory, updatePromotionTracking } from "./publish/records";
import { applyNewRanks } from "./publish/newRanks";
import { persistBanzukeSnapshot } from "./publish/snapshot";

/**
 * Helper to retrieve the current basho state from the world.
 *
 * @param world - The current world state
 * @returns The current BashoState or undefined if no basho is active
 */
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

/**
 * Publishes the final results of a basho and updates the banzuke for the next one.
 * Handles promotions (including Yokozuna criteria), career history updates,
 * and council warnings for underperforming Yokozuna.
 *
 * Pipeline: guard + standings → currentBanzukeList → per-rikishi
 * performance loop → updateBanzuke → movement narratives/ceremonies →
 * promotion history + tracking → new-rank application → snapshot + interim.
 *
 * @param world - The current world state
 * @returns A StateImpact object containing all world and rikishi updates
 */
export function publishBanzukeUpdate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("publishBanzukeUpdate");

  if (world.cyclePhase !== "post_basho") return builder.build();

  const lastBasho = getCurrentBasho(world);
  if (!lastBasho) return builder.build();

  // Standings can be Map or Object depending on the simulation path; normalize here
  const standings = lastBasho.standings;
  if (!standings) {
    warn("No standings found in lastBasho", "BanzukePublisher");
    return builder.build();
  }

  const standingEntries = Array.from(standings.entries());

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    if (!r) continue;
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({ rank: r.rank, rankNumber: r.rankNumber, side: r.side }),
    });
  }

  const performanceList = buildPerformanceList(world, lastBasho, standingEntries, builder);

  const perfMap = new Map<string, (typeof performanceList)[number]>();
  for (const p of performanceList) perfMap.set(p.rikishiId, p);
  const result = updateBanzuke(
    currentBanzukeList,
    perfMap,
    world,
    world.ozekiKadoban ?? {},
    world.heyas
  );

  const newBanzukeByRikishiId = new Map<string, (typeof result.newBanzuke)[number]>();
  for (const e of result.newBanzuke) newBanzukeByRikishiId.set(e.rikishiId, e);
  const eventsByRikishiId = new Map<string, MovementEvent>();
  for (const e of result.events) {
    if (!eventsByRikishiId.has(e.rikishiId)) eventsByRikishiId.set(e.rikishiId, e);
  }

  applyMovementEvents(
    world,
    lastBasho,
    result,
    perfMap,
    newBanzukeByRikishiId,
    eventsByRikishiId,
    builder
  );

  recordPromotionHistory(world, lastBasho, result, builder);
  updatePromotionTracking(world, result, perfMap, builder);
  applyNewRanks(world, lastBasho, result, eventsByRikishiId, builder);
  persistBanzukeSnapshot(world, lastBasho, result, currentBanzukeList, builder);

  return builder.build();
}

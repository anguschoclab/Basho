import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import { toRankPosition } from "@/engine/types/index";
import type { BanzukeEntry } from "@/engine/types/banzuke";
import type { MovementEvent } from "@/engine/types/banzuke";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getRikishi } from "@/engine/core/queries";
import { warn } from "@/engine/utils/Logger";
import { buildPerformanceList } from "@/engine/banzuke/publish/performance";
import { applyMovementEvents } from "@/engine/banzuke/publish/movements";
import { recordPromotionHistory, updatePromotionTracking } from "@/engine/banzuke/publish/records";
import { applyNewRanks } from "@/engine/banzuke/publish/newRanks";
import { persistBanzukeSnapshot } from "@/engine/banzuke/publish/snapshot";
import { graduateMaezumoRikishi } from "@/engine/basho/maezumoPrelims";

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

  // Canonical type is StandingsTableRuntime (Map); SerializationService
  // rehydrates via objectToMap. Normalize anyway — a malformed legacy/foreign
  // save delivering a plain object would otherwise throw on .entries() and
  // strand the world at post_basho forever. An EMPTY Map is still valid:
  // absence accounting synthesizes records from the banzuke snapshot.
  const rawStandings = lastBasho.standings;
  if (!rawStandings) {
    warn("No standings found in lastBasho", "BanzukePublisher");
    return builder.build();
  }
  const standings =
    rawStandings instanceof Map ? rawStandings : new Map(Object.entries(rawStandings));

  const standingEntries = Array.from(standings.entries());

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    // Unranked maezumo entrants (shin-deshi + odd-card fillers) and off-banzuke
    // (banzuke-gai) rikishi are not on the printed banzuke; shin-deshi and
    // returning banzuke-gai rikishi graduate onto it below.
    if (!r || r.isMaezumo || r.isEphemeralMaezumo || r.isBanzukeGai) continue;
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({ rank: r.rank, rankNumber: r.rankNumber, side: r.side }),
    });
  }

  const performanceList = buildPerformanceList(world, lastBasho, standingEntries, builder);

  const perfMap = new Map<string, (typeof performanceList)[number]>();
  for (const p of performanceList) perfMap.set(p.rikishiId, p);
  const ranked = updateBanzuke(
    currentBanzukeList,
    perfMap,
    world,
    world.ozekiKadoban ?? {},
    world.heyas
  );
  // §3 maezumo — this basho's shin-deshi debut at the foot of jonokuchi.
  const graduates = graduateMaezumoRikishi(world, lastBasho, ranked.newBanzuke, builder);
  const result =
    graduates.length > 0 ? { ...ranked, newBanzuke: [...ranked.newBanzuke, ...graduates] } : ranked;

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

  // WS-13 — early announcements: the JSA announces Ōzeki/Yokozuna and
  // Makushita→Jūryō promotions ahead of the banzuke reveal; Jūryō→Makuuchi
  // stays embargoed (its first public confirmation IS the printed banzuke).
  for (const a of result.earlyAnnouncements) {
    const r = getRikishi(world, a.rikishiId);
    builder.logEvent(
      "BASHO_STATUS",
      "basho",
      {
        status: "early_promotion_announcement",
        rikishiId: a.rikishiId,
        shikona: r?.shikona,
        kind: a.kind,
        title: a.kind === "sanyaku_promotion" ? "Promotion announced early" : "Jūryō promotion",
        summary:
          a.kind === "sanyaku_promotion"
            ? `The JSA announces ${r?.shikona ?? a.rikishiId}'s promotion ahead of the banzuke reveal.`
            : `${r?.shikona ?? a.rikishiId}'s Jūryō promotion is confirmed ahead of the banzuke.`,
      },
      { rikishiId: a.rikishiId, heyaId: r?.heyaId, importance: "notable" }
    );
  }

  recordPromotionHistory(world, lastBasho, result, builder);
  updatePromotionTracking(world, result, perfMap, builder);
  applyNewRanks(world, lastBasho, result, eventsByRikishiId, builder);
  persistBanzukeSnapshot(world, lastBasho, result, currentBanzukeList, builder);

  return builder.build();
}

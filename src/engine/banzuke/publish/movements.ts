import type { WorldState } from "../../types/world";
import type { BashoState } from "../../types/basho";
import type { BashoPerformance, BanzukeEntry } from "../../banzuke";
import type { MovementEvent } from "../../types/banzuke";
import { updateBanzuke, generateKeshoForPromotions } from "../../banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getRikishi } from "../../queries";
import { generateBanzukeMovementNarrative } from "../banzukeMovementNarrative";
import { assignDohyoIriStyle } from "../../governance/dohyoIri";
import { assignYokozunaAttendants } from "../../governance/yokozunaAttendants";

type Builder = ReturnType<typeof createImpactBuilder>;
type BanzukeResult = ReturnType<typeof updateBanzuke>;
type PerfMap = Map<string, BashoPerformance>;

/**
 * Post-updateBanzuke narrative + ceremony stage: kesho-mawashi impacts,
 * ozeki promotion narratives, yokozuna dohyo-iri style + attendant
 * assignment, and banzuke movement narrative events.
 */
export function applyMovementEvents(
  world: WorldState,
  lastBasho: BashoState,
  result: BanzukeResult,
  perfMap: PerfMap,
  newBanzukeByRikishiId: Map<string, BanzukeEntry>,
  eventsByRikishiId: Map<string, MovementEvent>,
  builder: Builder
): void {
  // Generate kesho-mawashi for promoted rikishi and apply impacts
  const keshoImpacts = generateKeshoForPromotions(world, result.events);
  builder.merge(keshoImpacts);

  // Ozeki promotion narrative (4.2): log narrative events for new ozeki promotions
  for (const evt of result.events) {
    if (evt.kind !== "promotion") continue;
    const newEntry = newBanzukeByRikishiId.get(evt.rikishiId);
    if (!newEntry || newEntry.position.rank !== "ozeki") continue;
    const promotedRikishi = getRikishi(world, evt.rikishiId);
    if (!promotedRikishi) continue;
    const perf = perfMap.get(evt.rikishiId);
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "ozeki_promotion",
        description: `${promotedRikishi.shikona} has been promoted to Ozeki — a new pillar of the sumo world.`,
        rikishiId: evt.rikishiId,
        wins: perf?.wins ?? 0,
        losses: perf?.losses ?? 0,
        yusho: perf?.yusho ?? false,
        from: evt.from,
      },
      { rikishiId: evt.rikishiId, heyaId: promotedRikishi.heyaId, importance: "headline" }
    );
  }

  // Yokozuna promotion: assign dohyo-iri ceremony style (Gap 5)
  for (const evt of result.events) {
    if (evt.kind !== "promotion") continue;
    const newEntry = newBanzukeByRikishiId.get(evt.rikishiId);
    if (!newEntry || newEntry.position.rank !== "yokozuna") continue;
    const promotedRikishi = getRikishi(world, evt.rikishiId);
    if (!promotedRikishi) continue;
    const styleUpdate = assignDohyoIriStyle(promotedRikishi, "yokozuna", world.seed ?? "default");
    if (styleUpdate.dohyoIriStyle) {
      builder.updateRikishi(evt.rikishiId, styleUpdate);
      builder.logEvent(
        "BASHO_STATUS",
        "promotion",
        {
          status: "dohyo_iri_assignment",
          description: `${promotedRikishi.shikona} has been assigned the ${styleUpdate.dohyoIriStyle} dohyo-iri style.`,
          rikishiId: evt.rikishiId,
          dohyoIriStyle: styleUpdate.dohyoIriStyle,
        },
        { rikishiId: evt.rikishiId, heyaId: promotedRikishi.heyaId, importance: "headline" }
      );

      // Assign tachimochi and tsuyuharai attendants for the new yokozuna
      const attendantImpact = assignYokozunaAttendants(
        { ...promotedRikishi, dohyoIriStyle: styleUpdate.dohyoIriStyle },
        world
      );
      builder.merge(attendantImpact);
    }
  }

  // Banzuke movement narrative (4.1): generate narrative lines for notable promotions/demotions
  const movementNarratives = generateBanzukeMovementNarrative(
    result.events,
    world,
    `${world.seed}-${lastBasho.bashoName}-banzuke`
  );
  for (const narrative of movementNarratives) {
    const narrativeRikishi = getRikishi(world, narrative.rikishiId);
    // Phase 6: Enrich BASHO_STATUS event data with MovementEvent fields
    const movementEvt = eventsByRikishiId.get(narrative.rikishiId);
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "banzuke_movement",
        description: narrative.text,
        rikishiId: narrative.rikishiId,
        from: movementEvt?.from,
        to: movementEvt?.to,
        kind: movementEvt?.kind,
        isJumpPromotion: movementEvt?.isJumpPromotion,
        isSanyakuPromotion: movementEvt?.isSanyakuPromotion,
        isSekitoriPromotion: movementEvt?.isSekitoriPromotion,
      },
      { rikishiId: narrative.rikishiId, heyaId: narrativeRikishi?.heyaId, importance: "notable" }
    );
  }
}
